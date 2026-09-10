import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  ArrowLeftRight,
} from "lucide-react";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import {
  registrarMovimiento,
  getTiposMovimiento,
} from "../../../api/ajustesApi";
import { getCategorias } from "../../../api/maestrosApi";
import { canGestionarAjustesInventario } from "../../../auth/inventoryAccess";
import { stockEntero } from "./ajuste-inventario/utils";
import AjusteStock from "./ajuste-inventario/AjusteStock";
import ListasConteo from "./ajuste-inventario/ListasConteo";
import { updateProducto } from "../../../api/productosApi";

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
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [sesiones, setSesiones] = useState(cargarSesiones);
  const [aplicandoId, setAplicandoId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesiones));
    } catch {
      /* sin persistencia local */
    }
  }, [sesiones]);

  const tipoPorNombre = useMemo(() => {
    return Object.fromEntries(tiposMovimiento.map((t) => [t.nombre, t.id]));
  }, [tiposMovimiento]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const [prodRes, cats, tipos] = await Promise.all([
          getProductos({ pageSize: 500 }),
          getCategorias(),
          getTiposMovimiento(),
        ]);
        if (!cancelled) {
          setProductos(prodRes.content || []);
          setCategorias(cats || []);
          setTiposMovimiento(tipos || []);
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

  function generarSesion({ productos: seleccion, descripcion, motivo }) {
    const id =
      sesiones.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) + 1;
    const sesion = {
      id,
      fechaHora: new Date().toISOString(),
      descripcion,
      motivo: (motivo || "").trim(),
      estado: "EN_PROCESO",
      items: seleccion.map((p) => ({
        idProducto: p.id,
        nombre: p.nombre || `Producto #${p.id}`,
        unidadMedida: p.unidadMedida || "",
        stockSistema: stockEntero(p),
        stockFisico: "",
      })),
    };
    setSesiones((prev) => [sesion, ...prev]);
    setError(null);
    setAviso("Lista Generada");
  }

  function cambiarFisico(idSesion, idProducto, valor) {
    setSesiones((prev) =>
      prev.map((s) =>
        s.id !== idSesion
          ? s
          : {
              ...s,
              items: s.items.map((it) =>
                it.idProducto === idProducto ? { ...it, stockFisico: valor } : it
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
      return { item: it, raw, fisico: raw === "" ? NaN : Number(raw) };
    });
    const vacio = pendientes.find((p) => p.raw === "");
    if (vacio) {
      setError(`Cargá el conteo físico de "${vacio.item.nombre}".`);
      return;
    }
    const invalido = pendientes.find(
      (p) => !Number.isFinite(p.fisico) || p.fisico < 0 || !Number.isInteger(p.fisico)
    );
    if (invalido) {
      setError(
        `Indicá un conteo físico válido (entero ≥ 0) para "${invalido.item.nombre}".`
      );
      return;
    }

    setAplicandoId(id);
    const warnings = [];
    let hayFallo = false;

    for (const p of pendientes) {
      const sistema = Number(p.item.stockSistema ?? 0);
      const diff = p.fisico - sistema;
      if (diff === 0) continue;
      const prod = productos.find((x) => x.id === p.item.idProducto);
      try {
        if (!prod) throw new Error("Producto no encontrado");
        await updateProducto(prod.id, prod, p.fisico);
        setProductos((prev) =>
          prev.map((x) =>
            x.id === prod.id ? { ...x, stockActual: p.fisico } : x
          )
        );
        const tipoId = tipoPorNombre.AJUSTE;
        if (tipoId != null) {
          try {
            await registrarMovimiento({
              producto_id: p.item.idProducto,
              tipo_movimiento_id: tipoId,
              cantidad: Math.abs(diff),
              clasificacion: "DIFERENCIA_CONTEO",
              referencia: `Conteo N° ${sesion.id}: ${sistema} → ${p.fisico}${sesion.motivo ? ` — ${sesion.motivo}` : ""}`,
              requiere_auditoria: false,
            });
          } catch {
            warnings.push(
              `"${p.item.nombre}": stock aplicado, pero el movimiento no se pudo registrar en el backend.`
            );
          }
        } else {
          warnings.push(
            `"${p.item.nombre}": stock aplicado, pero el tipo AJUSTE no está cargado en el backend.`
          );
        }
      } catch {
        hayFallo = true;
        warnings.push(`"${p.item.nombre}": no se pudo actualizar el stock.`);
      }
    }

    if (hayFallo) {
      setAplicandoId(null);
      setError(warnings.join(" "));
      return;
    }

    setSesiones((prev) =>
      prev.map((s) => (s.id === id ? { ...s, estado: "APLICADO" } : s))
    );
    setAplicandoId(null);
    if (warnings.length) setAviso(warnings.join(" "));
    else
      setAviso(
        `Lista N° ${sesion.id} aplicada. El stock se sobreescribió con el conteo físico.`
      );
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
        <header className="px-5 sm:px-6 pt-5 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f3] tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#22c55e]" />
              Ajuste de Stock
            </h1>
          </div>
        </header>

        <div className="px-5 sm:px-6 pb-5 space-y-5">
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

          <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] p-5 space-y-5">
            {loading ? (
              <p className="text-sm text-[#5a5a6e]">Cargando productos…</p>
            ) : (
              <AjusteStock
                productos={productos}
                categorias={categorias}
                disabled={loading}
                onGenerar={generarSesion}
              />
            )}
          </div>

          <ListasConteo
            sesiones={sesiones}
            aplicandoId={aplicandoId}
            onChangeFisico={cambiarFisico}
            onAplicar={aplicarSesion}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}