/**
 * Valores alineados con database/init.sql del backend (primer arranque en BD vacía).
 * Si tus IDs reales difieren, definí VITE_MAESTROS_JSON o ajustá estos valores.
 */
export const MAESTROS_SEED = {
  categorias: [{ id: 1, nombre: "Comestibles" }],
  unidades: [{ id: 1, nombre: "Gramos", abreviatura: "gr" }],
  proveedores: [{ id: 1, nombre: "Conti" }],
};
