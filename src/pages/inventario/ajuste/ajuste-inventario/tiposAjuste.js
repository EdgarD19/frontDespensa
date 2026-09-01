export const TIPOS_MOVIMIENTO = [
  { value: "ENTRADA", label: "Entrada", descripcion: "Ingreso de stock" },
  { value: "SALIDA", label: "Salida", descripcion: "Egreso de stock" },
  { value: "AJUSTE", label: "Ajuste", descripcion: "Corrección de stock" },
];

export const CLASIFICACIONES_POR_TIPO = {
  ENTRADA: [
    { value: "COMPRA_PROVEEDOR", label: "Compra a proveedor" },
    { value: "DEVOLUCION_CLIENTE", label: "Devolución de cliente" },
    { value: "RECLAMO_RESUELTO", label: "Reclamo resuelto" },
    { value: "REGALO_PROMOCION", label: "Regalo / promoción" },
    { value: "CORRECCION_AJUSTE", label: "Corrección de ajuste" },
  ],
  SALIDA: [
    { value: "VENTA", label: "Venta" },
    { value: "ROBO", label: "Robo" },
    { value: "MERMA", label: "Merma" },
    { value: "DAÑO", label: "Daño" },
    { value: "DEVOLUCION_PROVEEDOR", label: "Devolución a proveedor" },
    { value: "REGALO_PROMOCION", label: "Regalo / promoción" },
    { value: "MUESTRA", label: "Muestra" },
  ],
  AJUSTE: [
    { value: "DIFERENCIA_CONTEO", label: "Diferencia de conteo" },
    { value: "ERROR_REGISTRO", label: "Error de registro" },
    { value: "SOBRANTE_NO_IDENTIFICADO", label: "Sobrante no identificado" },
    { value: "CORRECCION_ENTRADA", label: "Corrección de entrada" },
    { value: "CORRECCION_SALIDA", label: "Corrección de salida" },
  ],
};

export const TIPO_MOVIMIENTO_LABEL = Object.fromEntries(
  TIPOS_MOVIMIENTO.map(({ value, label }) => [value, label])
);

export function labelTipoMovimiento(value) {
  return TIPO_MOVIMIENTO_LABEL[value] || value || "—";
}

export function clasificacionesDeTipo(tipo) {
  return CLASIFICACIONES_POR_TIPO[tipo] || [];
}

export function labelClasificacion(tipo, value) {
  const item = clasificacionesDeTipo(tipo).find((c) => c.value === value);
  return item ? item.label : value || "—";
}
