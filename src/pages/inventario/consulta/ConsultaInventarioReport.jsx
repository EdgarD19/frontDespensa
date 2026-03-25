import { ClipboardList, Loader2 } from "lucide-react";
import { getEstadoStock } from "../utils";

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

function ProductThumb({ nombre, categoria }) {
  const inicial = (nombre?.[0] || "?").toUpperCase();
  const hue = hashHue(categoria || nombre);
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-inner shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 55%, 38%) 0%, hsl(${(hue + 40) % 360}, 50%, 28%) 100%)`,
      }}
    >
      {inicial}
    </div>
  );
}

function formatPrecioValor(p, tipo) {
  const isPesable = p.productoPesable === "si";
  const valor =
    tipo === "compra"
      ? isPesable
        ? p.precioCompraKg
        : p.precioCompra
      : isPesable
        ? p.precioVentaKg
        : p.precioVenta;
  const sufijo = isPesable ? "/kg" : "";
  const n = Number(valor || 0);
  return { text: `${n.toLocaleString("es-PY")}${sufijo}`, isPesable };
}

function EstadoPill({ estado, stock, unidadMedida }) {
  const base = "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap";
  if (estado === "sin") {
    return <span className={`${base} bg-[#ef4444]/20 text-[#f87171]`}>Sin stock</span>;
  }
  if (estado === "bajo") {
    return (
      <span className={`${base} bg-[#f97316]/20 text-[#fb923c]`}>
        {stock}
        {unidadMedida ? ` ${unidadMedida}` : ""} (Bajo)
      </span>
    );
  }
  return (
    <span className={`${base} bg-[#22c55e]/20 text-[#4ade80]`}>
      {stock}
      {unidadMedida ? ` ${unidadMedida}` : ""}
    </span>
  );
}

export default function ConsultaInventarioReport({ productos, loading }) {
  const count = productos?.length ?? 0;

  return (
    <div className="bg-[#171717] rounded-[25px] overflow-hidden shadow-[inset_2px_5px_10px_rgb(5,5,5)]">
      <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-[#30363d]">
        <ClipboardList className="w-5 h-5 text-[var(--accent-cyan)] flex-shrink-0" />
        <h3 className="text-[#f0f6fc] font-semibold text-base">
          Inventario detallado — {loading ? "…" : count} productos
        </h3>
      </div>

      <div className="p-4 sm:p-6 pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8b949e] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
            <span className="text-sm">Cargando inventario…</span>
          </div>
        ) : count === 0 ? (
          <p className="text-[#8b949e] text-center py-16 text-sm">
            No hay productos que coincidan con los filtros o el catálogo está vacío.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-[#30363d]/80 bg-[#0d0d0d]/50">
            <table className="w-full min-w-[1000px] text-sm border-collapse">
              <thead>
                <tr className="bg-[#252525] text-left">
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">
                    Producto
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">
                    Categoría
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Marca</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Código</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Unidad</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-right">
                    Compra
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-right">
                    Venta
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">
                    Stock (act. / mín.)
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] whitespace-nowrap">
                    Últ. actualización
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const estado = getEstadoStock(p);
                  const stock = Number(p.stockActual ?? p.stock ?? 0);
                  const minimo = Number(p.stockMinimo ?? 0);
                  const compra = formatPrecioValor(p, "compra");
                  const venta = formatPrecioValor(p, "venta");
                  const codigoLine = [p.codigoBarras || p.codigo, p.unidadMedida].filter(Boolean).join(" • ");

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#30363d]/60 hover:bg-[#252525]/40 transition-colors"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {p.foto ? (
                            <img
                              src={p.foto}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-inner"
                            />
                          ) : (
                            <ProductThumb nombre={p.nombre} categoria={p.categoria} />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#f0f6fc] truncate" title={p.nombre}>
                              {p.nombre}
                            </p>
                            <p className="text-xs text-[#8b949e] truncate" title={codigoLine}>
                              {codigoLine || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {p.categoria ? (
                          <span className="inline-block rounded-full bg-[#22c55e]/15 text-[#4ade80] px-2.5 py-0.5 text-xs font-medium">
                            {p.categoria}
                          </span>
                        ) : (
                          <span className="text-[#8b949e]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#d3d3d3] align-middle">{p.marca || "—"}</td>
                      <td className="px-4 py-3 text-[#8b949e] font-mono text-xs align-middle">
                        {p.codigoBarras || p.codigo || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#d3d3d3] align-middle">{p.unidadMedida || "—"}</td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="text-[#8b949e] line-through decoration-[#6b7280]">
                          ₲{compra.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="font-bold text-[var(--accent-green)]">₲{venta.text}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#d3d3d3] tabular-nums align-middle">
                        {stock} / {minimo || "—"}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <EstadoPill estado={estado} stock={stock} unidadMedida={p.unidadMedida} />
                      </td>
                      <td className="px-4 py-3 text-[#8b949e] align-middle whitespace-nowrap">
                        {p.ultimaActualizacion || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
