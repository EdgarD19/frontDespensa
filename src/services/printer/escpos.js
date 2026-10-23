const ESC = 0x1B;
const GS = 0x1D;

function concat(arrays) {
  const total = arrays.reduce((sum, a) => sum + (a?.length || 0), 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    if (!a) continue;
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function cmd(bytes) {
  return new Uint8Array(bytes);
}

function text(str) {
  if (!str) return new Uint8Array([]);
  const s = String(str);
  // Use TextEncoder for UTF-8
  const enc = new TextEncoder();
  return enc.encode(s);
}

function line(str = "") {
  return concat([text(str), cmd([0x0A])]);
}

function center() {
  return cmd([ESC, 0x61, 0x01]);
}

function left() {
  return cmd([ESC, 0x61, 0x00]);
}

function boldOn() {
  return cmd([ESC, 0x45, 0x01]);
}

function boldOff() {
  return cmd([ESC, 0x45, 0x00]);
}

function size(nw = 1, nh = 1) {
  const n = ((nw & 0x07) << 4) | (nh & 0x07);
  return cmd([GS, 0x21, n]);
}

function sizeNormal() {
  return size(1, 1);
}

function sizeDouble() {
  return size(2, 2);
}

function cut() {
  return cmd([GS, 0x56, 0x01]);
}

function init() {
  return cmd([ESC, 0x40]);
}

function separator() {
  return line("--------------------------------");
}

function money(v) {
  if (v == null) return "0.00";
  const num = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(num)) return String(v);
  return num.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(valor) {
  if (!valor) return "—";
  try {
    const d = new Date(String(valor));
    if (Number.isNaN(d.getTime())) {
      const d2 = new Date(String(valor) + "T00:00:00");
      if (Number.isNaN(d2.getTime())) return String(valor);
      return d2.toLocaleDateString("es-PY") + " " + d2.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-PY") + " " + d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(valor);
  }
}

function getNombre(l) {
  return l.nombre || l.nombreProducto || `Producto #${l.productoId}`;
}

function getCant(l) {
  return Number(l.cantidad) || 0;
}

function getPU(l) {
  return Number(l.precioUnitario) || 0;
}

export function buildVentaEscPos(datos = {}) {
  const {
    numero,
    fecha,
    cliente,
    lineas = [],
    total,
    montoPagado,
    cambio,
    formaPagoLabel,
    timbrado,
  } = datos;

  const parts = [];
  parts.push(init());

  // Header
  parts.push(center());
  parts.push(boldOn());
  parts.push(sizeDouble());
  parts.push(line("DESPENSA SANDRA Y CARLOS"));
  parts.push(sizeNormal());
  parts.push(boldOff());
  parts.push(line("COMPROBANTE DE VENTA"));
  parts.push(left());
  parts.push(separator());

  // Info
  parts.push(line(`TICKET Nº: ${numero || "—"}`));
  parts.push(line(`FECHA: ${fmtFecha(fecha)}`));
  if (timbrado?.numeroTimbrado) parts.push(line(`TIMBRADO: ${timbrado.numeroTimbrado}`));
  if (formaPagoLabel) parts.push(line(`FORMA PAGO: ${formaPagoLabel}`));
  parts.push(line(`CLIENTE: ${cliente?.razonSocial || cliente?.nombreCompleto || cliente?.nombre || "CONSUMIDOR FINAL"}`));
  if (cliente?.nroDocumento || cliente?.documento || cliente?.ruc || cliente?.ci) {
    parts.push(line(`DOC: ${cliente?.nroDocumento || cliente?.documento || cliente?.ruc || cliente?.ci}`));
  }
  parts.push(separator());

  // Items
  parts.push(boldOn());
  parts.push(line("ITEM                        IMPORTE"));
  parts.push(boldOff());
  for (const l of lineas) {
    const cant = getCant(l);
    const pu = getPU(l);
    const sub = cant * pu;
    const nombre = getNombre(l);
    const line1 = `${cant > 1 ? cant.toFixed(cant % 1 === 0 ? 0 : 3) + "x " : ""}${nombre}`.substring(0, 32);
    parts.push(line(line1.padEnd(26) + money(sub).padStart(10)));
    parts.push(line(`  P.U: ${money(pu)}`));
  }
  parts.push(separator());

  // Totals
  parts.push(boldOn());
  parts.push(line("TOTAL:".padEnd(26) + money(total).padStart(10)));
  parts.push(boldOff());
  if (montoPagado != null) parts.push(line("RECIBIDO:".padEnd(26) + money(montoPagado).padStart(10)));
  if (cambio != null && cambio > 0) parts.push(line("VUELTO:".padEnd(26) + money(cambio).padStart(10)));
  parts.push(separator());

  // Footer
  parts.push(center());
  parts.push(line("¡GRACIAS POR SU COMPRA!"));
  parts.push(line("VUELVA PRONTO"));
  parts.push(left());
  parts.push(line(""));
  parts.push(cut());

  return concat(parts);
}

export function escPosToText(bytes) {
  if (!bytes) return "";
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x0A) { out += "\n"; continue; }
    if (b === 0x0D) { out += "\r"; continue; }
    if (b < 0x20) continue;
    if (b > 0x7E && b < 0xA0) continue;
    out += String.fromCharCode(b);
  }
  return out;
}
