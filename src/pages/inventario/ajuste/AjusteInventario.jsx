import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ClipboardList,
  ArrowLeftRight,
  Search,
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
import {
  TIPOS_MOVIMIENTO,
  backendDeMotivo,
} from "./ajuste-inventario/tiposAjuste";

export default function AjusteInventario() {
  const puedeRegistrar = canGestionarAjustesInventario();

  const [productos, setProductos] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    tipoMovimiento: "",
    clasificacion: "",
    referencia: "",
  });
  const [items, setItems] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState({ desde: "", hasta: "" });

  const tipoPorNombre = useMemo(() => {
    return Object.fromEntries(tiposMovimiento.map((t) => [t.nombre, t.id]));
  }, [tiposMovimiento]);

  const loadMovimientos = useCallback(async (filtro) => {
    const f = filtro ?? filtroFecha;
    const res = await getMovimientosStock({
      pageSize: 50,
      fechaInicio: f.desde || undefined,
      fechaFin: f.hasta || undefined,
    });
    setHistorial(res.content || []);
  }, [filtroFecha]);

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
    const idsEnLista = new Set(items.map((it) => it.producto.id));
    return productos.filter(
      (p) =>
        !idsEnLista.has(p.id) &&
        (!q ||
          p.nombre?.toLowerCase().includes(q) ||
          (p.codigoBarras && String(p.codigoBarras).includes(search.trim())))
    );
  }, [productos, search, items]);

  const handleSelectProducto = (producto) => {
    setItems((prev) => [...prev, { producto, cantidad: "" }]);
    setSearch("");
    setShowDropdown(false);
    setError(null);
  };

  const handleClear = () => {
    setFormData({ tipoMovimiento: "", clasificacion: "", referencia: "" });
    setItems([]);
    setSearch("");
    setError(null);
  };

  function resultadoDeItem(item) {
    const stock = stockEntero(item.producto);
    const cant = Number(item.cantidad);
    if (!Number.isFinite(cant) || cant <= 0) return null;
    return formData.tipoMovimiento === "NEGATIVO" ? stock - cant : stock + cant;
  }

  function validarFormulario() {
    if (!puedeRegistrar) {
      setError("No tenés permisos para registrar movimientos de stock.");
      return false;
    }
    if (items.length === 0) {
      setError("Agregá al menos un producto a ajustar.");
      return false;
    }
    if (!formData.tipoMovimiento) {
      setError("Seleccioná el tipo de movimiento (Inventario Inicial, Ajuste Positivo (+) o Ajuste Negativo (-)).");
      return false;
    }
    const tipoMeta = TIPOS_MOVIMIENTO.find((t) => t.value === formData.tipoMovimiento);
    if (tipoMeta?.requiereBackend) {
      setError("El tipo 'Inventario Inicial' requiere una actualización del backend. Usá Ajuste Positivo (+) o Ajuste Negativo (-).");
      return false;
    }
    if (!formData.clasificacion) {
      setError("Seleccioná el motivo del ajuste.");
      return false;
    }
    const backendPar = backendDeMotivo(formData.tipoMovimiento, formData.clasificacion);
    if (!backendPar) {
      setError("El motivo seleccionado requiere una actualización del backend. Elegí otro motivo.");
      return false;
    }
    for (const it of items) {
      const cant = Number(it.cantidad);
      if (!Number.isFinite(cant) || cant <= 0) {
        setError(`Indicá una cantidad válida para "${it.producto.nombre}".`);
        return false;
      }
      const res = resultadoDeItem(it);
      if (res != null && res < 0) {
        setError(
          `El stock de "${it.producto.nombre}" no puede quedar en negativo (resultante ${res}).`
        );
        return false;
      }
    }
    return true;
  }

  const procesarMovimiento = async () => {
    setError(null);
    if (!validarFormulario()) return;

    const backendPar = backendDeMotivo(formData.tipoMovimiento, formData.clasificacion);
    const tipoId = tipoPorNombre[backendPar.tipo];
    if (tipoId == null) {
      setError(
        "No se pudo determinar el tipo de movimiento. Verificá que el backend tenga cargados los tipos."
      );
      return;
    }

    try {
      setSubmitting(true);

      const pendientes = items.map((it) => ({
        producto_id: it.producto.id,
        tipo_movimiento_id: tipoId,
        cantidad: Math.round(Number(it.cantidad)),
        clasificacion: backendPar.clasificacion,
        referencia: formData.referencia.trim() || undefined,
        requiere_auditoria: false,
      }));

      for (const payload of pendientes) {
        await registrarMovimiento(payload);
      }

      setProductos((prev) =>
        prev.map((p) => {
          const item = items.find((it) => it.producto.id === p.id);
          if (!item) return p;
          const res = resultadoDeItem(item);
          return res == null ? p : { ...p, stockActual: res };
        })
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
        <header className="px-5 sm:px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f3] tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#22c55e]" />
              Ajuste de Stock
            </h1>
            <p className="text-sm text-[#7a7a8c] mt-0.5">
              Registrá inventario inicial y ajustes positivos o negativos de
              stock.
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
                Buscador de producto
              </span>
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
                  placeholder="Buscar producto por nombre o código de barras para agregarlo a la tabla…"
                  className="w-full rounded-lg border border-[#2a2a32] bg-[#111114] pl-10 pr-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
                />
                {showDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-[#1e1e24] bg-[#111114] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {productosFiltrados.length === 0 ? (
                      <p className="p-3 text-sm text-[#5a5a6e]">
                        {search.trim()
                          ? items.some((it) =>
                              it.producto.nombre
                                ?.toLowerCase()
                                .includes(search.trim().toLowerCase())
                            )
                            ? "Ese producto ya está en la lista."
                            : "No hay coincidencias."
                          : "Sin productos cargados."}
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
            </label>

            <AjusteStock
              formData={formData}
              setFormData={setFormData}
              items={items}
              setItems={setItems}
              disabled={loading}
              submitting={submitting}
              onSolicitar={procesarMovimiento}
              onLimpiar={handleClear}
            />
          </div>

          <HistorialAjustes
            items={historial}
            filtrosIniciales={filtroFecha}
            onFiltrosChange={(f) => setFiltroFecha({ desde: f.desde || "", hasta: f.hasta || "" })}
          />
        </div>
      </div>
    </div>
  );
}