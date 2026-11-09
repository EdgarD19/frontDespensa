const ESC = 0x1B;
const GS = 0x1D;

// ═══════════════════════════════════════════════════════════════
// Papel: impresora térmica FTX Revece 2" TDR058BT (58 mm).
// Área imprimible ~48 mm = 384 dots → 32 caracteres en Font A 12x24.
// Todas las líneas del ticket se alinean a este ancho (localStorage del
// ancho sugerido solo si se cambia de impresora: 80 mm → 48 columnas).
const WIDTH = 32;
// Ancho reservado a la columna de importes (derecha, negrita).
// Las etiquetas más largas del ticket ("PAGO TRANSFERENCIA:" = 19) entran
// en los 20 caracteres restantes con el importe de 12.
const AMOUNT_W = 12;
const LABEL_W = WIDTH - AMOUNT_W; // = 20

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

function cut() {
  return cmd([GS, 0x56, 0x01]);
}

function init() {
  return cmd([ESC, 0x40]);
}

function separator() {
  return line("-".repeat(WIDTH));
}

function money(v) {
  if (v == null) return "0.00";
  const num = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(num)) return String(v);
  return num.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Monto compacto para la tabla de productos: enteros sin decimales;
// pesables/cortes decimales con 2 decimales.
function compMoney(v) {
  const num = Number(v) || 0;
  const esEntero = Math.abs(num % 1) < 0.005;
  return num.toLocaleString("es-PY", { minimumFractionDigits: esEntero ? 0 : 2, maximumFractionDigits: 2 });
}

function fmtFecha(valor) {
  if (!valor) return "—";
  // Fechas sin hora (LocalDate del back) se parsean como medianoche LOCAL para
  // no retroceder un día en zonas UTC-3; sin hora se muestra solo la fecha.
  const s = String(valor);
  const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = esSoloFecha ? new Date(s + "T00:00:00") : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  if (esSoloFecha) return d.toLocaleDateString("es-PY");
  return d.toLocaleDateString("es-PY") + " " + d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
}

function fmtFechaSolo(valor) {
  if (!valor) return "—";
  const s = String(valor);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-PY");
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
    montoMixto,
    timbrado,
  } = datos;

  const empName = datos?.empresaNombreComercial || datos?.nombreComercial || "DESPENSA SANDRA Y CARLOS";
  const empRuc = datos?.empresaRuc || datos?.ruc;
  const empDir = datos?.empresaDireccion || datos?.direccion;
  const empTel = datos?.empresaTelefono || datos?.telefono;
  const footerText = datos?.empresaPieTicket || datos?.pieTicket || "¡GRACIAS POR SU COMPRA!";
  // Cabecera compacta: RUC y teléfono comparten línea (si existen ambos).
  const headerL1 = [empRuc ? `RUC: ${empRuc}` : null, empTel ? `Tel: ${empTel}` : null]
    .filter(Boolean)
    .join(" ");
  // Vigencia del timbrado: solo la parte fecha (dd/mm/yyyy).
  const vigInicio = fmtFechaSolo(timbrado?.fechaInicio);
  const vigFin = fmtFechaSolo(timbrado?.fechaVencimiento);
  const tieneVigencia = Boolean(timbrado?.fechaInicio || timbrado?.fechaVencimiento);

  const parts = [];
  parts.push(init());

  // Header: nombre centrado, resto y bloque de datos también centrados
  parts.push(center());
  parts.push(boldOn());
  // En 58mm (32 col) el doble-ancho completo haría overflow con nombres largos:
  // se usa doble ALTO (1x2) — prominencia sin romper la línea.
  parts.push(size(1, 2));
  parts.push(line(empName));
  parts.push(sizeNormal());
  parts.push(boldOff());
  if (headerL1) parts.push(line(headerL1));
  if (empDir) parts.push(line(empDir));

  // Info (timbrado, vigencia, forma de pago, número y fecha de venta)
  if (timbrado?.numeroTimbrado || tieneVigencia) parts.push(line(`TIMBRADO: ${timbrado?.numeroTimbrado || "—"}`));
  if (tieneVigencia) parts.push(line(`VIGENCIA: ${vigInicio} AL ${vigFin}`));
  if (formaPagoLabel) parts.push(line(`FORMA PAGO: ${String(formaPagoLabel).toUpperCase()}`));
  parts.push(line(`FACTURA CONTADO: ${numero || "—"}`));
  parts.push(line(`FECHA Y HORA VENTA: ${fmtFecha(fecha)}`));
  parts.push(left());
  parts.push(separator());

  // Cliente
  if (cliente?.nroDocumento || cliente?.documento || cliente?.ruc || cliente?.ci) {
    parts.push(line(`CI / RUC: ${cliente?.nroDocumento || cliente?.documento || cliente?.ruc || cliente?.ci}`));
  }
  parts.push(line(`CLIENTE: ${cliente?.razonSocial || cliente?.nombreCompleto || cliente?.nombre || "Sin Nombre"}`));
  parts.push(separator());

  // Items: 2 líneas por artículo (estándar en papel de 58 mm = 32 columnas):
  //   línea 1: nombre del producto (con sufijo (KG) si pesable)
  //   línea 2: cant × precio unitario ……………… total
  // El IVA por artículo no se imprime en esta versión (el desglose total
  // por tasa está más abajo), igual que el ticket de pantalla.
  const unidadDe = (l) => {
    const u = String(l?.unidadMedida || "").toUpperCase();
    return l?.productoPesable === "si" || u === "KG" || u === "KILOGRAMO" || u === "KILOGRAMOS" ? "kg" : "u.";
  };
  const wrapText = (str, w = WIDTH) => {
    const s = String(str ?? "");
    const out = [];
    for (let i = 0; i < s.length; i += w) out.push(s.slice(i, i + w));
    return out.length > 0 ? out : [""];
  };

  for (const l of lineas) {
    const cant = getCant(l);
    const pu = getPU(l);
    const sub = Math.round(cant * pu * 100) / 100;
    const pesable = unidadDe(l) === "kg";
    const nombreBase = getNombre(l) + (pesable ? " (KG)" : "");

    // Línea 1: nombre (si es largo, se separa en varias líneas de 32)
    for (const tramo of wrapText(nombreBase)) {
      parts.push(line(tramo));
    }

    // Línea 2: "2 u. × 1.250 ……… 2.500" (total alineado a la derecha)
    const leftTxt = `  ${cant.toLocaleString("es-PY", { maximumFractionDigits: 3 })} ${unidadDe(l)} × ${compMoney(pu)}`;
    const subTxt = compMoney(sub);
    parts.push(
      line(leftTxt.padEnd(WIDTH - subTxt.length) + subTxt),
    );
  }
  parts.push(separator());

  // Totals
  const pagoLabel = formaPagoLabel ? `PAGO ${String(formaPagoLabel).toUpperCase()}` : "RECIBIDO";
  parts.push(boldOn());
  parts.push(line("TOTAL A PAGAR:".padEnd(LABEL_W) + money(total).padStart(AMOUNT_W)));
  parts.push(boldOff());
  // Pago múltiple: desglose Efectivo + Transferencia en el papel también.
  const mixto = montoMixto;
  if (mixto) {
    parts.push(line("PAGO EFECTIVO:".padEnd(LABEL_W) + money(mixto.efectivo).padStart(AMOUNT_W)));
    parts.push(line("PAGO TRANSFERENCIA:".padEnd(LABEL_W) + money(mixto.transferencia).padStart(AMOUNT_W)));
    if (montoPagado != null) parts.push(line("VUELTO:".padEnd(LABEL_W) + money(cambio || 0).padStart(AMOUNT_W)));
  } else {
    if (montoPagado != null) parts.push(line(`${pagoLabel}:`.padEnd(LABEL_W) + money(montoPagado).padStart(AMOUNT_W)));
    if (montoPagado != null) parts.push(line("VUELTO:".padEnd(LABEL_W) + money(cambio || 0).padStart(AMOUNT_W)));
  }
  parts.push(separator());

  // Desglose de IVA por tasa (replica CalculoIvaUtil del back)
  const r2 = (n) => Math.round(n * 100) / 100;
  let iva5 = 0;
  let iva10 = 0;
  for (const l of lineas) {
    const cant = getCant(l);
    const pu = getPU(l);
    const t = Number(l.iva ?? l.tasaIva ?? 10);
    if (t === 0) continue;
    const base = r2(r2(pu / (1 + t / 100)) * cant);
    const iva = r2((base * t) / 100);
    if (t === 5) iva5 += iva;
    else iva10 += iva;
  }
  iva5 = r2(iva5);
  iva10 = r2(iva10);
  parts.push(line("IVA 5%:".padEnd(LABEL_W) + money(iva5).padStart(AMOUNT_W)));
  parts.push(line("IVA 10%:".padEnd(LABEL_W) + money(iva10).padStart(AMOUNT_W)));
  parts.push(boldOn());
  parts.push(line("TOTAL IVA:".padEnd(LABEL_W) + money(r2(iva5 + iva10)).padStart(AMOUNT_W)));
  parts.push(boldOff());
  parts.push(separator());

  // Apartado: Gravadas / Exentas (montos con IVA incluido por tasa)
  let g5 = 0;
  let g10 = 0;
  let ex = 0;
  for (const l of lineas) {
    const cant = getCant(l);
    const pu = getPU(l);
    const t = Number(l.iva ?? l.tasaIva ?? 10);
    const monto = r2(pu * cant);
    if (t === 0) ex += monto;
    else if (t === 5) g5 += monto;
    else g10 += monto;
  }
  parts.push(line("GRAVADAS 5%:".padEnd(LABEL_W) + money(r2(g5)).padStart(AMOUNT_W)));
  parts.push(line("GRAVADAS 10%:".padEnd(LABEL_W) + money(r2(g10)).padStart(AMOUNT_W)));
  parts.push(line("EXENTAS:".padEnd(LABEL_W) + money(r2(ex)).padStart(AMOUNT_W)));
  parts.push(separator());

  // Footer
  parts.push(center());
  const footerLines = String(footerText).split(/\r?\n/);
  for (const fl of footerLines) {
    if (fl.trim() === "") parts.push(line(""));
    else parts.push(line(fl));
  }
  if (!footerText || String(footerText).trim() === "") {
    parts.push(line("VUELVA PRONTO"));
  }
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
