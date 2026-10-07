export function stockEntero(producto) {
  const n = Number(producto?.stockActual ?? 0);
  if (!Number.isFinite(n)) return 0;
  if (unidadAdmiteDecimales(producto?.unidadMedida)) return n;
  return Math.trunc(n);
}

export function unidadAdmiteDecimales(unidad) {
  const u = String(unidad || "").trim().toLowerCase();
  return u.includes("kilogramo") || u.includes("kilo") || u === "kg";
}

export function sanitizarConteo(unidad, valor) {
  const v = String(valor ?? "");
  if (unidadAdmiteDecimales(unidad)) {
    const limpio = v.replace(/[^0-9.,]/g, "");
    const pos = limpio.search(/[.,]/);
    if (pos === -1) return limpio;
    return (
      limpio.slice(0, pos + 1) +
      limpio.slice(pos + 1).replace(/[.,]/g, "")
    );
  }
  return v.replace(/\D/g, "");
}

export function parseConteo(valor) {
  const raw = String(valor ?? "").trim().replace(",", ".");
  return raw === "" ? NaN : Number(raw);
}
