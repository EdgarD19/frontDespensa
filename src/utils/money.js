/**
 * Formato de moneda ÚNICO del proyecto: "Gs. 25.000.000".
 * Simbolo fijo determinista (no depende del ICU del navegador, que a veces
 * imprimía "₲" y otras "Gs."). Usarlo en TODA la UI; no anteponer símbolos a mano.
 */
export function moneyGs(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "Gs. 0";
  const abs = Math.abs(Math.round(v)).toLocaleString("es-PY", { maximumFractionDigits: 0 });
  return `${v < 0 ? "-" : ""}Gs. ${abs}`;
}

export default moneyGs;
