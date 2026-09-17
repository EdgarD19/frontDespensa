// Tipos de movimiento del módulo "Ajuste de Stock" (vista usuario).
// C/ tipo tiene motivos dinámicos; cada motivo mapea a un (tipoBackend, clasificacion)
// que el backend realmente acepta (MovimientoInventarioService.CLASIFICACIONES_VALIDAS).
// Los motivos con requiereBackend=true se renderizan DESHABILITADOS (no clickeables).

export const TIPOS_MOVIMIENTO = [
  {
    value: "INICIAL",
    label: "Inventario Inicial",
    descripcion: "Carga de apertura del negocio",
    requiereBackend: true,
  },
  {
    value: "POSITIVO",
    label: "Ajuste Positivo (+)",
    descripcion: "Incrementa el stock",
    requiereBackend: false,
  },
  {
    value: "NEGATIVO",
    label: "Ajuste Negativo (-)",
    descripcion: "Descuenta el stock",
    requiereBackend: false,
  },
];

export const MOTIVOS_POR_TIPO = {
  INICIAL: [],
  POSITIVO: [
    {
      value: "DIFERENCIA_CONTEO",
      label: "Sobrante por conteo",
      backendTipo: "AJUSTE",
      requiereBackend: false,
    },
    {
      value: "ERROR_REGISTRO",
      label: "Corrección de registro",
      backendTipo: "AJUSTE",
      requiereBackend: false,
    },
    {
      value: "SOBRANTE_NO_IDENTIFICADO",
      label: "Sobrante no identificado",
      backendTipo: "AJUSTE",
      requiereBackend: false,
    },
    {
      value: "REGALO_PROMOCION",
      label: "Promoción / Muestra recibida",
      backendTipo: "ENTRADA",
      requiereBackend: true,
    },
  ],
  NEGATIVO: [
    {
      value: "DIFERENCIA_CONTEO",
      label: "Faltante por conteo",
      backendTipo: "AJUSTE",
      requiereBackend: false,
    },
    {
      value: "MERMA",
      label: "Merma / Vencimiento",
      backendTipo: "SALIDA",
      requiereBackend: false,
    },
    {
      value: "DAÑO",
      label: "Daño / Rotura",
      backendTipo: "SALIDA",
      requiereBackend: false,
    },
    {
      value: "ROBO",
      label: "Robo / Pérdida",
      backendTipo: "SALIDA",
      requiereBackend: false,
    },
    {
      value: "CONSUMO_INTERNO",
      label: "Consumo interno",
      backendTipo: null,
      requiereBackend: true,
    },
  ],
};

// Etiquetas para el historial (el backend devuelve ENTRADA/SALIDA/AJUSTE).
const TIPO_HISTORIAL_LABEL = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
  INICIAL: "Inventario Inicial",
  POSITIVO: "Ajuste Positivo (+)",
  NEGATIVO: "Ajuste Negativo (-)",
};

export function labelTipoMovimiento(value) {
  return TIPO_HISTORIAL_LABEL[value] || value || "—";
}

export function motivosDeTipo(tipo) {
  return MOTIVOS_POR_TIPO[tipo] || [];
}

export function motivoPorValor(tipo, value) {
  return motivosDeTipo(tipo).find((m) => m.value === value) || null;
}

export function labelMotivo(tipo, value) {
  const item = motivoPorValor(tipo, value);
  return item ? item.label : value || "—";
}

// Devuelve {tipo, clasificacion} listo para el payload del backend,
// o null si el motivo no se puede registrar sin tocar el backend.
export function backendDeMotivo(tipo, value) {
  const item = motivoPorValor(tipo, value);
  if (!item || item.requiereBackend || !item.backendTipo) return null;
  return { tipo: item.backendTipo, clasificacion: item.value };
}