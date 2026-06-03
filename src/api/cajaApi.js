import { api } from "./client";

export async function abrirCaja(montoInicial) {
  const { data } = await api.post("/api/caja/abrir", { montoInicial });
  return data;
}

export async function cerrarCaja() {
  const { data } = await api.post("/api/caja/cerrar");
  return data;
}

export async function getCajaActual() {
  try {
    const { data } = await api.get("/api/caja/actual");
    return data;
  } catch {
    return null;
  }
}
