/**
 * PlanillaConteo.jsx
 * -----------------------------------------------------------------------------
 * Documento imprimible del módulo de ajuste de inventario.
 *
 * Un mismo componente cubre los dos usos:
 *   modo="conteo"  -> se imprime ANTES de contar. Las columnas "Stock físico"
 *                     y "Diferencia" salen vacías para llenar a mano.
 *   modo="informe" -> se imprime DESPUÉS. Muestra los valores cargados,
 *                     la diferencia calculada y los totales.
 *
 * Recibe directamente una sesión de ajuste (la misma que guarda AjusteInventario
 * en localStorage) y deriva los datos de cabecera/detalle.
 *
 * Uso:
 *   <PlanillaConteo sesion={sesion} modo="informe" onVolver={() => ...} />
 */

import { useMemo } from "react";

const COMERCIO = "Despensa Sandra y Carlos";

const MOTIVO_LABELS = { ROBO: "Robo", MERMA: "Merma", REGALO: "Regalo", ERROR: "Error", OTROS: "Otros" };
const nombreMotivo = (m) => MOTIVO_LABELS[m] || m || "—";

// Formatea cantidades con separador local y sin decimales inútiles.
const fmt = (n) =>
  new Intl.NumberFormat("es-PY", { maximumFractionDigits: 3 }).format(n ?? 0);

// Diferencia con signo explícito: el + importa tanto como el -.
const fmtDif = (n) => (n > 0 ? `+${fmt(n)}` : fmt(n));

const fmtFecha = (valor) => {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime())
    ? String(valor)
    : d.toLocaleString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export default function PlanillaConteo({ sesion, modo = "informe", onVolver }) {
  const esConteo = modo === "conteo";
  const detalles = useMemo(() => sesion?.items ?? [], [sesion]);
  const aplicado = sesion?.estado === "APLICADO";

  if (!sesion) return null;

  function imprimir() {
    const original = document.title;
    document.title = `${esConteo ? "Planilla de conteo de stock" : "Informe de ajuste de inventario"} · Lista #${sesion?.id ?? ""}`;
    window.print();
    document.title = original;
  }

  return (
    <>
      <style>{css}</style>

      {/* Barra de acciones: no se imprime. */}
      <div className="pc-acciones no-print">
        {onVolver ? (
          <button type="button" className="pc-secundario" onClick={onVolver}>
            Volver
          </button>
        ) : null}
        <button type="button" onClick={imprimir}>
          Imprimir
        </button>
      </div>

      <article className="pc-hoja">
        {/* ------------------------------- Cabecera ------------------------ */}
        <header className="pc-cabecera">
          <div>
            <p className="pc-comercio">{COMERCIO}</p>
            <h1 className="pc-titulo">
              {esConteo ? "Planilla de conteo de stock" : "Informe de ajuste de inventario"}
            </h1>
          </div>

          <div className="pc-identificacion">
            <span className="pc-registro">Registro Nº {sesion.id}</span>
            <span
              className={`pc-estado ${
                aplicado ? "pc-estado--aplicado" : "pc-estado--pendiente"
              }`}
            >
              {aplicado ? "Aplicado" : "Pendiente"}
            </span>
          </div>
        </header>

        {/* ------------------------------ Metadatos ------------------------ */}
        <dl className="pc-meta">
          <div>
            <dt>Fecha del ajuste</dt>
            <dd>{fmtFecha(sesion.fechaHora)}</dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{nombreMotivo(sesion.motivo)}</dd>
          </div>
          <div>
            <dt>Ítems</dt>
            <dd>{detalles.length}</dd>
          </div>
        </dl>

        {/* ------------------------------- Detalle ------------------------- */}
        <table className="pc-tabla">
          <thead>
            <tr>
              <th className="pc-col-nro">Nº</th>
              <th className="pc-col-cod">Código</th>
              <th>Producto</th>
              <th className="pc-col-um">U.M.</th>
              <th className="pc-num">Stock físico</th>
              <th className="pc-num">Diferencia</th>
              {esConteo && <th className="pc-col-obs">Observación</th>}
            </tr>
          </thead>

          <tbody>
            {detalles.map((d, i) => {
              const dif = (d.stockFisico ?? 0) - (d.stockSistema ?? 0);
              return (
                <tr key={d.idProducto ?? d.codigo ?? i}>
                  <td className="pc-col-nro">{i + 1}</td>
                  <td className="pc-col-cod">{d.codigo || "—"}</td>
                  <td>{d.nombre}</td>
                  <td className="pc-col-um">{d.unidadMedida}</td>

                  {/* En modo conteo estas celdas quedan en blanco, con altura
                      suficiente para escribir encima. */}
                  <td className="pc-num pc-escribible">
                    {esConteo ? "" : fmt(d.stockFisico)}
                  </td>
                  <td
                    className={`pc-num pc-escribible ${
                      !esConteo && dif !== 0
                        ? dif > 0
                          ? "pc-dif pc-dif--pos"
                          : "pc-dif pc-dif--neg"
                        : ""
                    }`}
                  >
                    {esConteo ? "" : fmtDif(dif)}
                  </td>

                  {esConteo && <td className="pc-col-obs" />}
                </tr>
              );
            })}

            {detalles.length === 0 && (
              <tr>
                <td colSpan={esConteo ? 7 : 6} className="pc-vacio">
                  El ajuste no tiene productos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ------------------------------- Firmas -------------------------- */}
        <section className="pc-firmas">
          <div>
            <span className="pc-linea" />
            <p>Responsable del conteo</p>
            <p className="pc-aclaracion">Aclaración y C.I.</p>
          </div>
          <div>
            <span className="pc-linea" />
            <p>Autorizado por</p>
            <p className="pc-aclaracion">Aclaración y C.I.</p>
          </div>
        </section>

        <footer className="pc-pie">
          {COMERCIO} · Emitido el {fmtFecha(new Date())}
        </footer>
      </article>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Estilos. Pantalla: hoja blanca centrada sobre el fondo oscuro de la app.
 * Impresión: A4, sin cromo del navegador, encabezado repetido por página.
 * ------------------------------------------------------------------------ */
const css = `
.pc-acciones { display: flex; justify-content: flex-end; gap: 8px; max-width: 210mm; margin: 0 auto 12px; }
.pc-acciones button {
  background: #22c55e; color: #05240f; font-weight: 600;
  border: 0; border-radius: 6px; padding: 8px 18px; cursor: pointer;
}
.pc-acciones .pc-secundario {
  background: transparent; color: #b0b0c0;
  border: 1px solid #2a2a32;
}
.pc-acciones .pc-secundario:hover { color: #e1e1eb; background: #1a1a22; }

.pc-hoja {
  max-width: 210mm; margin: 0 auto; padding: 16mm;
  background: #fff; color: #111;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt; line-height: 1.45;
}

/* Cabecera */
.pc-cabecera {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 24px; border-bottom: 2px solid #111; padding-bottom: 10px;
}
.pc-comercio { margin: 0; font-size: 10pt; letter-spacing: .02em; }
.pc-titulo { margin: 2px 0 0; font-size: 15pt; font-weight: 700; }
.pc-identificacion { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.pc-registro { font-size: 9.5pt; color: #444; }
.pc-estado {
  margin-top: 2px; padding: 1px 9px; border-radius: 999px;
  border: 1px solid currentColor; font-size: 8.5pt; font-weight: 600;
}
.pc-estado--pendiente { color: #92400e; }
.pc-estado--aplicado  { color: #166534; }

/* Metadatos */
.pc-meta {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px 24px; margin: 12px 0 16px;
}
.pc-meta > div { min-width: 0; }
.pc-meta dt { font-size: 8.5pt; color: #666; margin-bottom: 1px; }
.pc-meta dd { margin: 0; font-weight: 600; }

/* Tabla */
.pc-tabla { width: 100%; border-collapse: collapse; }
.pc-tabla th, .pc-tabla td {
  border: 1px solid #c9c9c9; padding: 5px 8px; vertical-align: middle;
}
.pc-tabla thead th {
  background: #f1f1f1; font-size: 9pt; font-weight: 700; text-align: left;
}
.pc-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pc-col-nro { width: 30px; text-align: right; color: #777; }
.pc-col-cod { width: 90px; font-variant-numeric: tabular-nums; }
.pc-col-um  { width: 80px; }
.pc-col-obs { width: 130px; }
.pc-escribible { height: 26px; }
.pc-dif--pos { color: #166534; }
.pc-dif--neg { color: #b91c1c; }
.pc-vacio { text-align: center; color: #777; padding: 18px; }

/* Firmas */
.pc-firmas {
  display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
  margin-top: 26mm; text-align: center; font-size: 9.5pt;
}
.pc-linea { display: block; border-top: 1px solid #111; margin-bottom: 4px; }
.pc-firmas p { margin: 0; }
.pc-aclaracion { color: #777; font-size: 8.5pt; }

.pc-pie {
  margin-top: 14px; padding-top: 6px; border-top: 1px solid #ddd;
  font-size: 8pt; color: #777; text-align: center;
}

@page {
  size: A4;
  margin: 15mm;            /* márgenes propios: ocultan el header/footer del navegador */
}

@media print {
  /* Todo lo que sea cromo de la app desaparece. Poné .no-print en el
     sidebar y en los botones del layout. */
  .no-print { display: none !important; }

  html, body { background: #fff !important; }
  body * { visibility: hidden; }
  .pc-hoja, .pc-hoja * { visibility: visible; }
  .pc-hoja {
    position: absolute; top: 0; left: 0;
    max-width: none; width: 100%; padding: 0;
  }

  thead { display: table-header-group; }   /* encabezado repetido por página */
  tr    { break-inside: avoid; }
  .pc-firmas { break-inside: avoid; }

  .pc-tabla thead th,
  .pc-tabla td.pc-dif--pos, .pc-tabla td.pc-dif--neg {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}
`;