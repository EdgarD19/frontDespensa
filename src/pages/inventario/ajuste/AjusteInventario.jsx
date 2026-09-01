import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ClipboardList,
  ArrowLeftRight,
  Search,
  X,
} from "lucide-react";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import {
  getMovimientosStock,
  registrarMovimiento,
  getTiposMovimiento,
} from "../../../api/ajustesApi";
import { canGestionarAjustesInventario } from "../../../auth/inventoryAccess";
import AjusteStock from "./ajuste-inventario/AjusteStock";
import HistorialAjustes from "./ajuste-inventario/HistorialAjustes";
import { stockEntero } from "./ajuste-inventario/utils";

export default function AjusteInventario() {
  const puedeRegistrar = canGestionarAjustesInventario();

  const [productos, setProductos] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    tipoMovimiento: "",
    clasificacion: "",
    cantidad: "",
    referencia: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const tipoPorNombre = useMemo(() => {
    return Object.fromEntries(tiposMovimiento.map((t) => [t.nombre, t.id]));
  }, [tiposMovimiento]);

  const loadMovimientos = useCallback(async () => {
    const res = await getMovimientosStock({ pageSize: 50 });
    setHistorial(res.content || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const [prodRes, tipos] = await Promise.all([
          getProductos({ pageSize: 500 }),
          getTiposMovimiento(),
        ]);
        if (!cancelled) {
          setProductos(prodRes.content || []);
          setTiposMovimiento(tipos);
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

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return productos
      .filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          (p.codigoBarras && String(p.codigoBarras).includes(search.trim()))
      )
      .slice(0, 20);
  }, [productos, search]);

  const handleSelectProducto = (producto) => {
    setProductoSeleccionado(producto);
    setSearch("");
    setShowDropdown(false);
    setFormData({ tipoMovimiento: "", clasificacion: "", cantidad: "", referencia: "" });
    setError(null);
  };

  const handleClear = () => {
    setFormData({ tipoMovimiento: "", clasificacion: "", cantidad: "", referencia: "" });
    setProductoSeleccionado(null);
    setSearch("");
    setError(null);
  };

  const cantidadNum =
    formData.cantidad === "" || Number.isNaN(Number(formData.cantidad))
      ? null
      : Number(formData.cantidad);

  const stockResultante =
    productoSeleccionado != null && cantidadNum != null
      ? stockEntero(productoSeleccionado) + cantidadNum
      : null;

  function validarFormulario() {
    if (!puedeRegistrar) {
      setError("No tenés permisos para registrar movimientos de stock.");
      return false;
    }
    if (!productoSeleccionado) {
      setError("Seleccioná un producto.");
      return false;
    }
    if (!formData.tipoMovimiento) {
      setError("Seleccioná el tipo de movimiento (Entrada, Salida o Ajuste).");
      return false;
    }
    if (!formData.clasificacion) {
      setError("Seleccioná la clasificación del movimiento.");
      return false;
    }
    if (cantidadNum == null || Number.isNaN(cantidadNum)) {
      setError("Indicá una cantidad válida.");
      return false;
    }
    if (cantidadNum === 0) {
      setError("La cantidad del movimiento debe ser distinta de 0.");
      return false;
    }
    if (formData.tipoMovimiento !== "AJUSTE" && cantidadNum < 0) {
      setError("La cantidad debe ser mayor a 0 para entradas y salidas.");
      return false;
    }
    return true;
  }

  const procesarMovimiento = async () => {
    if (!productoSeleccionado) return;
    setError(null);
    if (!validarFormulario()) return;

    const tipoId = tipoPorNombre[formData.tipoMovimiento];
    if (tipoId == null) {
      setError(
        "No se pudo determinar el tipo de movimiento. Verificá que el backend tenga cargados los tipos."
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        producto_id: productoSeleccionado.id,
        tipo_movimiento_id: tipoId,
        cantidad: cantidadNum,
        clasificacion: formData.clasificacion,
        referencia: formData.referencia.trim() || undefined,
        requiere_auditoria: false,
      };

      await registrarMovimiento(payload);

      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoSeleccionado.id
            ? { ...p, stockActual: stockResultante }
            : p
        )
      );

      await loadMovimientos();
      handleClear();
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar el movimiento");
    } finally {
      setSubmitting(false);
    }
  };

  if (!puedeRegistrar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-3">
        <ClipboardList className="w-10 h-10 text-[#5a5a6e] mx-auto" aria-hidden />
        <h1 className="text-lg font-semibold text-[#e1e1eb]">
          Ajuste de Movimientos
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
    <div className="max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
        <header className="px-5 sm:px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f3] tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#22c55e]" />
              Ajuste de Movimientos
            </h1>
            <p className="text-sm text-[#7a7a8c] mt-0.5">
              Registrá entradas, salidas y correcciones de stock.
            </p>
          </div>
          <span className="text-xs text-[#7a7a8c] border border-[#2a2a32] rounded-full px-3 py-1.5 tabular-nums whitespace-nowrap self-start sm:self-auto">
            {historial.length} movimiento{historial.length !== 1 ? "s" : ""}{" "}
            reciente{historial.length !== 1 ? "s" : ""}
          </span>
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

          <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] p-5 space-y-5">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#9a9aac]">
                Producto
              </span>
              {!productoSeleccionado ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a6e]" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    disabled={loading}
                    placeholder="Buscar producto por nombre o código de barras…"
                    className="w-full rounded-lg border border-[#2a2a32] bg-[#111114] pl-10 pr-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
                  />
                  {showDropdown && search.trim() && (
                    <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-[#1e1e24] bg-[#111114] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                      {productosFiltrados.length === 0 ? (
                        <p className="p-3 text-sm text-[#5a5a6e]">
                          No hay coincidencias.
                        </p>
                      ) : (
                        <ul className="divide-y divide-[#1e1e24]">
                          {productosFiltrados.map((p) => {
                            const st = stockEntero(p);
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onMouseDown={() => handleSelectProducto(p)}
                                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#1a1a22] transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-[#f1f1f3] text-sm block truncate">
                                      {p.nombre}
                                    </span>
                                    {p.codigoBarras ? (
                                      <span className="text-xs text-[#5a5a6e] block truncate">
                                        {p.codigoBarras}
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="text-xs font-semibold text-[#22c55e] tabular-nums whitespace-nowrap">
                                    {st}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#f1f1f3] text-sm truncate">
                      {productoSeleccionado.nombre}
                    </p>
                    <p className="text-xs text-[#5a5a6e] truncate mt-0.5">
                      {productoSeleccionado.codigoBarras
                        ? `Cód. ${productoSeleccionado.codigoBarras}`
                        : null}
                      {productoSeleccionado.codigoBarras &&
                      productoSeleccionado.stockActual != null
                        ? " • "
                        : ""}
                      {productoSeleccionado.stockActual != null
                        ? `Stock actual ${stockEntero(productoSeleccionado)}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="shrink-0 p-1.5 rounded-lg text-[#5a5a6e] hover:text-[#f1f1f3] hover:bg-[#1e1e24] transition-colors"
                    title="Cambiar producto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </label>

            {productoSeleccionado && (
              <AjusteStock
                producto={productoSeleccionado}
                formData={formData}
                setFormData={setFormData}
                stockResultante={stockResultante}
                disabled={loading}
                submitting={submitting}
                onSolicitar={procesarMovimiento}
                onLimpiar={handleClear}
              />
            )}
          </div>

          <HistorialAjustes items={historial} />
        </div>
      </div>
    </div>
  );
}
