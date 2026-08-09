export const TIPOS_AJUSTE = [
  { value: "MERMA", label: "Merma" },
  { value: "EXTRAVIO", label: "Extravío" },
  { value: "DANO", label: "Daño" },
  { value: "AJUSTE_INVENTARIO", label: "Ajuste de inventario" },
  { value: "OTRO", label: "Otro" },
];

export const TIPO_AJUSTE_LABEL = Object.fromEntries(
  TIPOS_AJUSTE.map(({ value, label }) => [value, label])
);

export function labelTipoAjuste(value) {
  return TIPO_AJUSTE_LABEL[value] || value || "—";
}
