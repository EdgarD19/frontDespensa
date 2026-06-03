import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, LayoutDashboard } from "lucide-react";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import {
  getHistorialAjustes,
  crearAjuste,
  autorizarAjuste,
} from "../../../api/ajustesApi";
import {
  canGestionarAjustesInventario,
  canAutorizarAjustesInventario,
} from "../../../auth/inventoryAccess";
import SeleccionProductos from "./ajuste-inventario/SeleccionProductos";
import AjusteStockPanel from "./ajuste-inventario/AjusteStockPanel";
import HistorialAjustes from "./ajuste-inventario/HistorialAjustes";
import { stockEntero } from "./ajuste-inventario/utils";

/** Futuro: true = mostrar botón "Autorizar" en historial y flujo en dos pasos (POST pendiente + PATCH). */
const FLUJO_AUTORIZACION_PENDIENTE = false;

/*
 * Futuro — modal de confirmación cuando el ajuste queda solo como solicitud pendiente:
 * import ConfirmarSolicitudModal from "./ajuste-inventario/ConfirmarSolicitudModal";
 * Tras validar, setConfirmOpen(true); en onConfirm llamar a crearAjuste.
 */

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function AjusteInventario() {
  const puedeRegistrar = canGestionarAjustesInventario();
  const puedeAutorizar = canAutorizarAjustesInventario();

  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    tipoAjuste: "",
    fechaAjuste: todayISO(),
    cantidad: "",
    justificacion: "",
    detalleOtro: "",
    autorizadoPor: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [autorizandoId, setAutorizandoId] = useState(null);

  const cantidad = formData.cantidad === "" ? null : Number(formData.cantidad);
  const nuevoStockCalc =
    productoSeleccionado != null && cantidad != null && Number.isFinite(cantidad)
      ? stockEntero(productoSeleccionado) + cantidad
      : null;
  const diferencia = cantidad ?? 0;

  const loadHistorial = useCallback(async () => {
    const res = await getHistorialAjustes({ pageSize: 50 });
    setHistorial(res.content || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getProductos({ pageSize: 500 });
        if (!cancelled) setProductos(res.content || []);
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

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        (p.codigoBarras && String(p.codigoBarras).includes(search.trim()))
    );
  }, [productos, search]);

  const handleSelectProducto = (producto) => {
    setProductoSeleccionado(producto);
    setFormData((prev) => ({
      ...prev,
      cantidad: "0",
    }));
    setError(null);
  };

  const handleClear = () => {
    setFormData({
      tipoAjuste: "",
      fechaAjuste: todayISO(),
      cantidad: "",
      justificacion: "",
      detalleOtro: "",
      autorizadoPor: "",
    });
    setProductoSeleccionado(null);
    setError(null);
  };

  function validarFormulario() {
    if (!puedeRegistrar) {
      setError("No tenés permisos para solicitar ajustes de inventario.");
      return false;
    }
    if (!productoSeleccionado) {
      setError("Seleccioná un producto.");
      return false;
    }
    if (!formData.tipoAjuste) {
      setError("Seleccioná un tipo de ajuste.");
      return false;
    }
    if (!formData.fechaAjuste) {
      setError("Indicá la fecha de ajuste.");
      return false;
    }
    if (formData.tipoAjuste === "OTRO" && !formData.detalleOtro.trim()) {
      setError('Completá el detalle para el tipo "Otro".');
      return false;
    }
    const c = Number(formData.cantidad);
    if (formData.cantidad === "" || !Number.isInteger(c)) {
      setError("La cantidad debe ser un número entero.");
      return false;
    }
    const stockBase = stockEntero(productoSeleccionado);
    if (stockBase + c < 0) {
      setError("El resultado no puede ser negativo. Verificá la cantidad.");
      return false;
    }
    if (!formData.justificacion.trim()) {
      setError("La justificación es obligatoria.");
      return false;
    }
    if (!formData.autorizadoPor.trim()) {
      setError('Completá el campo "Autorizado por".');
      return false;
    }
    return true;
  }

  const procesarAjuste = async () => {
    if (!productoSeleccionado) return;
    setError(null);
    if (!validarFormulario()) return;

    try {
      setSubmitting(true);
      setError(null);
      const stockAnt = stockEntero(productoSeleccionado);
      const c = Number(formData.cantidad);
      const n = stockAnt + c;

      const payload = {
        idProducto: productoSeleccionado.id,
        nombreProducto: productoSeleccionado.nombre,
        tipoAjuste: formData.tipoAjuste,
        fechaAjuste: formData.fechaAjuste,
        stockAnterior: stockAnt,
        nuevoStock: n,
        justificacion: formData.justificacion.trim(),
        detalleOtro:
          formData.tipoAjuste === "OTRO" ? formData.detalleOtro.trim() : undefined,
        autorizadoPor: formData.autorizadoPor.trim(),
      };

      await crearAjuste(payload);

      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoSeleccionado.id ? { ...p, stockActual: n } : p
        )
      );

      await loadHistorial();
      handleClear();
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar el ajuste");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutorizar = async (row) => {
    if (!FLUJO_AUTORIZACION_PENDIENTE || !puedeAutorizar || row?.id == null) return;
    const ok = window.confirm(
      "Al autorizar, el stock del producto se actualizará de inmediato. ¿Confirmar autorización?"
    );
    if (!ok) return;
    try {
      setAutorizandoId(row.id);
      setError(null);
      const actualizado = await autorizarAjuste(row.id);
      const nuevo = actualizado?.nuevoStock ?? row.nuevoStock;
      const idProd = actualizado?.idProducto ?? row.idProducto;

      if (idProd != null && nuevo != null) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === idProd ? { ...p, stockActual: Number(nuevo) } : p
          )
        );
      }

      await loadHistorial();
    } catch (err) {
      setError(
        apiErrorMessage(err) ||
          "No se pudo autorizar. Verificá que el endpoint PATCH /api/inventario/ajustes/{id}/autorizar exista en el backend."
      );
    } finally {
      setAutorizandoId(null);
    }
  };

  if (!puedeRegistrar && !puedeAutorizar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-3">
        <ClipboardList className="w-10 h-10 text-[#5a5a6e] mx-auto" aria-hidden />
        <h1 className="text-lg font-semibold text-[#e1e1eb]">Ajuste de inventario</h1>
        <p className="text-sm text-[#7a7a8c]">
          No tenés permisos para acceder a los ajustes de inventario. Solo usuarios con rol{" "}
          <span className="text-[#9a9aac]">ADMIN</span> o{" "}
          <span className="text-[#9a9aac]">ENCARGADO_INVENTARIO</span> pueden utilizar este módulo
          (configurá <code className="text-xs text-amber-400/90">VITE_USER_ROLES</code> cuando
          exista autenticación).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="rounded-2xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
        <header className="bg-[#0d0d0f] border-b border-[#1e1e24] px-4 sm:px-6 py-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20"
            aria-hidden
          >
            <LayoutDashboard className="w-5 h-5 text-[#22c55e]" />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#f1f1f3] tracking-tight truncate min-w-0">
            Ajuste de Inventario
          </h1>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SeleccionProductos
              loading={loading}
              search={search}
              onSearchChange={setSearch}
              productosFiltrados={productosFiltrados}
              productoSeleccionado={productoSeleccionado}
              onSelectProducto={handleSelectProducto}
            />

            <AjusteStockPanel
              puedeRegistrar={puedeRegistrar}
              productoSeleccionado={productoSeleccionado}
              formData={formData}
              setFormData={setFormData}
              diferencia={diferencia}
              loading={loading}
              submitting={submitting}
              onSolicitar={procesarAjuste}
              onLimpiar={handleClear}
            />
          </div>

          <HistorialAjustes
            items={historial}
            autorizandoId={autorizandoId}
            onAutorizar={handleAutorizar}
            canAutorizar={puedeAutorizar && FLUJO_AUTORIZACION_PENDIENTE}
          />
        </div>
      </div>
    </div>
  );
}
