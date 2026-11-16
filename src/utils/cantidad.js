/**
 * Helpers de cantidades compartidos por el front.
 *
 * El backend persiste stock y cantidades con `numeric(..., 2)`, así que la UI
 * nunca debe mostrar ni enviar más de 2 decimales.
 */

const nfCantidad = new Intl.NumberFormat("es-PY", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Redondea a la precisión que acepta el backend (2 decimales). */
export function redondearCantidad(n, decimales = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  const factor = 10 ** Math.max(0, decimales | 0);
  return Math.round((v + Number.EPSILON) * factor) / factor;
}

/** Formatea una cantidad para mostrarla (máximo 2 decimales, sin ceros de más). */
export function fmtCantidad(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return nfCantidad.format(redondearCantidad(v));
}

/**
 * Etiqueta corta de unidad para mostrar junto a cantidades.
 * El proyecto solo usa tres unidades de medida: Kilogramo ("kg"), Litro ("L")
 * y Unidad ("u."). Cualquier valor desconocido cae en "u.".
 */
export function unidadCorta(unidad) {
  const u = String(unidad ?? "").trim().toLowerCase();
  if (/kilo/.test(u)) return "kg";
  if (/litro/.test(u)) return "L";
  return "u.";
}

/**
 * El backend solo exige enteros para la unidad "Unidad"/"UN"; el resto de las
 * unidades (kilogramo, litro) admiten decimales.
 */
export function unidadAdmiteDecimales(unidad) {
  const u = String(unidad ?? "").trim().toLowerCase();
  if (!u) return false;
  return !(u === "unidad" || u === "un");
}

/**
 * Igual que `unidadAdmiteDecimales` pero para un objeto producto: prueba
 * unidadMedida, unitAbbreviation y nombreUnidadMedida. Sin unidad conocida
 * devuelve false (entero), que es lo más conservador.
 */
export function productoAdmiteDecimales(producto) {
  return unidadAdmiteDecimales(
    producto?.unidadMedida ?? producto?.unitAbbreviation ?? producto?.nombreUnidadMedida
  );
}
