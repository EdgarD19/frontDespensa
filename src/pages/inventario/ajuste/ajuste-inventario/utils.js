import {
  redondearCantidad,
  unidadAdmiteDecimales,
} from "../../../../utils/cantidad";

export { unidadAdmiteDecimales };

/**
 * Stock actual del producto como número, sin truncar: el backend guarda
 * `numeric(19,2)` y admite decimales también fuera de Kilogramo.
 */
export function stockCantidad(producto) {
  const n = Number(producto?.stockActual ?? 0);
  return Number.isFinite(n) ? redondearCantidad(n) : 0;
}

export function sanitizarConteo(unidad, valor) {
  const v = String(valor ?? "");
  if (unidadAdmiteDecimales(unidad)) {
    const limpio = v.replace(/[^0-9.,]/g, "");
    const pos = limpio.search(/[.,]/);
    if (pos === -1) return limpio;
    // El backend persiste numeric(...,2): no dejar cargar más decimales.
    const entero = limpio.slice(0, pos);
    const decimales = limpio
      .slice(pos + 1)
      .replace(/[.,]/g, "")
      .slice(0, 2);
    return `${entero}.${decimales}`;
  }
  return v.replace(/\D/g, "");
}

export function parseConteo(valor) {
  const raw = String(valor ?? "").trim().replace(",", ".");
  return raw === "" ? NaN : Number(raw);
}
