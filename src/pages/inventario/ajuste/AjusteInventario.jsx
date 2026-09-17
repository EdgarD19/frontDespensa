import { useState, useEffect } from "react";
import {
  ClipboardList,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import {
  crearAjuste,
  completarAjuste,
  desactivarAjuste,
} from "../../../api/ajustesApi";
import { getCategorias } from "../../../api/maestrosApi";
import { canGestionarAjustesInventario } from "../../../auth/inventoryAccess";
import { stockEntero, unidadAdmiteDecimales, sanitizarConteo, parseConteo } from "./ajuste-inventario/utils";
import ListasConteo from "./ajuste-inventario/ListasConteo";
import NuevaListaModal from "./ajuste-inventario/NuevaListaModal";

const STORAGE_KEY = "ajuste.listas.conteo.v1";

function cargarSesiones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function AjusteInventario() {
  const puedeRegistrar = canGestionarAjustesInventario();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [sesiones, setSesiones] = useState(cargarSesiones);
  const [aplicandoId, setAplicandoId] = useState(null);
  const [desactivandoId, setDesactivandoId] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");

  const sesionesVisibles = sesiones.filter((s) => {
    if (filtroEstado === "PENDIENTE" && s.estado !== "EN_PROCESO") return false;
    if (filtroEstado === "APLICADO" && s.estado !== "APLICADO") return false;
    if (filtroEstado === "DESACTIVADO" && s.estado !== "DESACTIVADO") return false;
    if (filtroMotivo && (s.motivo || "") !== filtroMotivo) return false;
    const fecha = new Date(s.fechaHora);
    if (fechaDesde) {
      const ini = new Date(`${fechaDesde}T00:00:00`);
      if (fecha < ini) return false;
    }
    if (fechaHasta) {
      const fin = new Date(`${fechaHasta}T23:59:59`);
      if (fecha > fin) return false;
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesiones));
    } catch {
      /* sin persistencia local */
    }
  }, [sesiones]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const [prodRes, cats] = await Promise.all([
          getProductos({ pageSize: 500 }),
          getCategorias(),
        ]);
        if (!cancelled) {
          setProductos(prodRes.content || []);
          setCategorias(cats || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err) || "Error al cargar productos");
          setProductos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function generarSesion({ productos: seleccion, descripcion, motivo }) {
    setError(null);
    setAviso(null);
    setGenerando(true);
    try {
      const ajuste = await crearAjuste({
        idProductos: seleccion.map((p) => p.id),
        observaciones: descripcion,
      });
      const idAjuste = ajuste?.idAjuste;
      if (idAjuste == null) {
        throw new Error("El backend no devolvió un idAjuste.");
      }
      const id =
        sesiones.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) + 1;
      const sesion = {
        id,
        idAjuste,
        numeroInforme: ajuste?.numeroInforme || "",
        fechaHora: new Date().toISOString(),
        descripcion,
        motivo: (motivo || "").trim(),
        estado: "EN_PROCESO",
        items: seleccion.map((p) => ({
          idProducto: p.id,
          nombre: p.nombre || `Producto #${p.id}`,
          codigo: p.codigoBarras || p.codigoBarra || "",
          unidadMedida: p.unidadMedida || "",
          stockSistema: stockEntero(p),
          stockFisico: "",
        })),
      };
      setSesiones((prev) => [sesion, ...prev]);
      setAviso(`Lista #${id} generada.`);
      return true;
    } catch (err) {
      setError(
        apiErrorMessage(err) ||
          "No se pudo generar la lista. Verificá la conexión con el backend e intentá de nuevo."
      );
      return false;
    } finally {
      setGenerando(false);
    }
  }

  function cambiarFisico(idSesion, idProducto, valor) {
    setSesiones((prev) =>
      prev.map((s) =>
        s.id !== idSesion
          ? s
          : {
              ...s,
              items: s.items.map((it) =>
                it.idProducto === idProducto
                  ? { ...it, stockFisico: sanitizarConteo(it.unidadMedida, valor) }
                  : it
              ),
            }
      )
    );
  }

  async function aplicarSesion(id) {
    setError(null);
    setAviso(null);
    const sesion = sesiones.find((s) => s.id === id);
    if (!sesion || sesion.estado !== "EN_PROCESO") return;

    const pendientes = sesion.items.map((it) => {
      const raw = String(it.stockFisico ?? "").trim();
      return { item: it, raw, fisico: parseConteo(raw) };
    });
    const vacio = pendientes.find((p) => p.raw === "");
    if (vacio) {
      setError(`Cargá el conteo físico de "${vacio.item.nombre}".`);
      return;
    }
    const invalido = pendientes.find((p) => {
      if (!Number.isFinite(p.fisico) || p.fisico < 0) return true;
      return !unidadAdmiteDecimales(p.item.unidadMedida) && !Number.isInteger(p.fisico);
    });
    if (invalido) {
      setError(
        `Indicá un conteo físico válido (${
          unidadAdmiteDecimales(invalido.item.unidadMedida)
            ? "decimal ≥ 0"
            : "entero ≥ 0"
        }) para "${invalido.item.nombre}".`
      );
      return;
    }

    setAplicandoId(id);

    try {
      let idAjuste = sesion.idAjuste ?? null;
      if (idAjuste == null) {
        const ajuste = await crearAjuste({
          idProductos: sesion.items.map((it) => it.idProducto),
          observaciones: sesion.descripcion,
        });
        idAjuste = ajuste?.idAjuste;
        if (idAjuste == null) {
          throw new Error("El backend no devolvió un idAjuste.");
        }
      }

      const resultado = await completarAjuste(idAjuste, {
        motivo: sesion.motivo,
        observaciones: sesion.descripcion,
        detalles: sesion.items.map((it) => ({
          idProducto: it.idProducto,
          stockFisico: parseConteo(it.stockFisico),
        })),
      });

      setSesiones((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                estado: "APLICADO",
                idAjuste,
                numeroInforme: resultado?.numeroInforme || "",
              }
            : s
        )
      );

      const re = await getProductos({ pageSize: 500 });
      if (re?.content) setProductos(re.content);

      setAplicandoId(null);
      setAviso(
        `Lista #${sesion.id} aplicada. El stock se actualizó al conteo físico.`
      );
    } catch (err) {
      setAplicandoId(null);
      setError(
        apiErrorMessage(err) ||
          "No se pudo aplicar el ajuste. Verificá la conexión con el backend y reintentá."
      );
    }
  }

  async function desactivarSesion(id) {
    setError(null);
    setAviso(null);
    const sesion = sesiones.find((s) => s.id === id);
    if (!sesion || sesion.estado !== "EN_PROCESO") return;

    setDesactivandoId(id);
    try {
      if (sesion.idAjuste != null) {
        await desactivarAjuste(sesion.idAjuste);
      }
      setSesiones((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, estado: "DESACTIVADO" } : s
        )
      );
      setDesactivandoId(null);
      setAviso(`Lista #${sesion.id} desactivada.`);
    } catch (err) {
      setDesactivandoId(null);
      setError(
        apiErrorMessage(err) ||
          "No se pudo desactivar la lista. Verificá la conexión con el backend e intentá de nuevo."
      );
    }
  }

  if (!puedeRegistrar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-3">
        <ClipboardList className="w-10 h-10 text-[#5a5a6e] mx-auto" aria-hidden />
        <h1 className="text-lg font-semibold text-[#e1e1eb]">
          Ajuste de Stock
        </h1>
        <p className="text-sm text-[#7a7a8c]">
          No tenés permisos para acceder a los movimientos de stock. Solo
          usuarios con rol{" "}
          <span className="text-[#9a9aac]">ADMIN</span> o{" "}
          <span className="text-[#9a9aac]">ENCARGADO_INVENTARIO</span> pueden
          utilizar este módulo.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="rounded-2xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
        <header className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f3] tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#22c55e]" />
              Ajuste de Stock
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] hover:bg-[#1aad4e] text-[#0d0d0f] text-sm font-semibold px-4 py-2.5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nueva lista
          </button>
        </header>

        <div className="px-5 sm:px-6 pb-5 space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          ) : null}

          {aviso ? (
            <div
              role="status"
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              {aviso}
            </div>
          ) : null}

          <ListasConteo
            sesiones={sesionesVisibles}
            total={sesiones.length}
            aplicandoId={aplicandoId}
            desactivandoId={desactivandoId}
            filtroEstado={filtroEstado}
            onFiltroEstadoChange={setFiltroEstado}
            fechaDesde={fechaDesde}
            onFechaDesdeChange={setFechaDesde}
            fechaHasta={fechaHasta}
            onFechaHastaChange={setFechaHasta}
            filtroMotivo={filtroMotivo}
            onFiltroMotivoChange={setFiltroMotivo}
            onChangeFisico={cambiarFisico}
            onAplicar={aplicarSesion}
            onDesactivar={desactivarSesion}
            error={error}
          />
        </div>
      </div>

      <NuevaListaModal
        abierto={modalAbierto}
        productos={productos}
        categorias={categorias}
        disabled={loading || generando}
        onGenerar={async (datos) => {
          const ok = await generarSesion(datos);
          if (ok) setModalAbierto(false);
        }}
        onCerrar={() => setModalAbierto(false)}
      />
    </div>
  );
}