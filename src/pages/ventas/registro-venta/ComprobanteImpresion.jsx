import { formatMoney, labelCliente, docCliente, esProductoPesable } from "./utils";

/** Comprobante de venta imprimible (A4-like, compacto). */
export default function ComprobanteImpresion({ datos }) {
  if (!datos) return null;
  const { fecha, numero, cliente, lineas, total, montoPagado, cambio, tipo, formaPagoLabel, timbrado } = datos;

  const fmtFecha = (valor) => {
    if (!valor) return "—";
    try {
      const d = new Date(String(valor) + "T00:00:00");
      if (Number.isNaN(d.getTime())) return String(valor);
      return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return String(valor);
    }
  };

  const getNombre = (l) => l.nombre || l.nombreProducto || `Producto #${l.productoId}`;
  const getCodigo = (l) => l.codigoBarras || l.codigo || "—";
  const getUm = (l) => (esProductoPesable(l) ? (l.unidadMedida || "KG") : (l.unitAbbreviation || l.unidadMedida || "UN"));
  const getCant = (l) => Number(l.cantidad) || 0;
  const getPU = (l) => Number(l.precioUnitario) || 0;
  const getSub = (l) => (typeof l.importe === "number" ? l.importe : getPU(l) * getCant(l));

  const COMERCIO = "Despensa Sandra y Carlos";

  return (
    <>
      <style>{css}</style>
      <article className="cv-hoja">
        <header className="cv-cabecera">
          <div>
            <p className="cv-comercio">{COMERCIO}</p>
            <h1 className="cv-titulo">Comprobante de venta</h1>
          </div>
          <div className="cv-identificacion">
            <span className="cv-registro">Nº {numero || "—"}</span>
            {tipo && <span className="cv-etiqueta">{tipo}</span>}
            {formaPagoLabel && <span className="cv-etiqueta">{formaPagoLabel}</span>}
          </div>
        </header>

        <dl className="cv-meta">
          <div>
            <dt>Fecha</dt>
            <dd>{fmtFecha(fecha)}</dd>
          </div>
          {timbrado?.numeroTimbrado && (
            <div>
              <dt>Timbrado</dt>
              <dd>{timbrado.numeroTimbrado}</dd>
            </div>
          )}
          <div className="cv-meta--span">
            <dt>Cliente</dt>
            <dd>{labelCliente(cliente)}</dd>
          </div>
          {docCliente(cliente) && (
            <div>
              <dt>Documento</dt>
              <dd>{docCliente(cliente)}</dd>
            </div>
          )}
        </dl>

        <table className="cv-tabla">
          <thead>
            <tr>
              <th className="cv-col-nro">Nº</th>
              <th className="cv-col-cod">Código</th>
              <th>Producto</th>
              <th className="cv-col-um">U.M.</th>
              <th className="cv-num">Cant.</th>
              <th className="cv-num">Precio unit.</th>
              <th className="cv-num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(lineas || []).map((l, i) => (
              <tr key={l.productoId ?? i}>
                <td className="cv-col-nro">{i + 1}</td>
                <td className="cv-col-cod">{getCodigo(l)}</td>
                <td>{getNombre(l)}</td>
                <td className="cv-col-um">{getUm(l)}</td>
                <td className="cv-num">{getCant(l).toLocaleString("es-PY", { maximumFractionDigits: 3 })}</td>
                <td className="cv-num">{formatMoney(getPU(l))}</td>
                <td className="cv-num">{formatMoney(getSub(l))}</td>
              </tr>
            ))}
            {(lineas || []).length === 0 && (
              <tr>
                <td colSpan={7} className="cv-vacio">Sin productos</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="cv-totales">
          <div className="cv-totales__fila">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
          {montoPagado != null && (
            <div className="cv-totales__fila">
              <span>Pagado</span>
              <span>{formatMoney(montoPagado)}</span>
            </div>
          )}
          {cambio != null && (
            <div className="cv-totales__fila">
              <span>Cambio</span>
              <span>{formatMoney(cambio)}</span>
            </div>
          )}
        </div>

        <footer className="cv-pie">
          {COMERCIO} · Emitido {fmtFecha(fecha)}
        </footer>
      </article>
    </>
  );
}

const css = `
.print-only { display: none; }
  max-width: 210mm; margin: 0 auto; padding: 14mm;
  background: #fff; color: #111;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 10pt; line-height: 1.4;
}
.cv-cabecera {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 20px; border-bottom: 2px solid #111; padding-bottom: 8px;
}
.cv-comercio { margin: 0; font-size: 9pt; letter-spacing: .02em; }
.cv-titulo { margin: 2px 0 0; font-size: 14pt; font-weight: 700; }
.cv-identificacion { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.cv-registro { font-size: 9pt; font-weight: 600; }
.cv-etiqueta {
  font-size: 8pt; font-weight: 600; text-transform: uppercase;
  letter-spacing: .08em; color: #333;
}
.cv-meta {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 6px 16px; margin: 10px 0 12px;
}
.cv-meta--span { grid-column: 1 / -1; }
.cv-meta dt { font-size: 8pt; color: #666; }
.cv-meta dd { margin: 0; font-weight: 600; word-break: break-word; }
.cv-tabla { width: 100%; border-collapse: collapse; }
.cv-tabla th, .cv-tabla td {
  border: 1px solid #c9c9c9; padding: 4px 6px; vertical-align: middle;
}
.cv-tabla thead th {
  background: #f3f3f3; font-size: 8.5pt; font-weight: 700; text-align: left;
}
.cv-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.cv-col-nro { width: 24px; text-align: right; color: #777; }
.cv-col-cod { width: 80px; font-variant-numeric: tabular-nums; }
.cv-col-um  { width: 60px; }
.cv-vacio { text-align: center; color: #777; }
.cv-totales { margin-top: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.cv-totales__fila { display: flex; gap: 16px; width: 220px; justify-content: space-between; font-variant-numeric: tabular-nums; }
.cv-totales__fila:last-of-type { font-weight: 700; }
.cv-pie {
  margin-top: 12px; padding-top: 5px; border-top: 1px solid #ddd;
  font-size: 8pt; color: #777; text-align: center;
}
@page { size: A4; margin: 12mm; }
@media screen {
  .print-only { display: none !important; }
}
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body * { visibility: hidden; }
  .cv-hoja, .cv-hoja * { visibility: visible; }
  .cv-hoja { position: absolute; top: 0; left: 0; max-width: none; width: 100%; padding: 0; }
  .cv-tabla thead th {
    background: #f3f3f3 !important;
    color: #111 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cv-etiqueta,
  .cv-meta dt,
  .cv-pie,
  .cv-vacio {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;
