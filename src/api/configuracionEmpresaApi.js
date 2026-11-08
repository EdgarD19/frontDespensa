import { api } from "./client";

export async function getConfiguracionEmpresa() {
  const res = await api.get("/api/configuracion-empresa");
  return res.data;
}

export async function actualizarConfiguracionEmpresa(data) {
  const res = await api.put("/api/configuracion-empresa", data);
  return res.data;
}
