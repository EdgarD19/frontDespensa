import { api } from "./client";

export async function login(username, password) {
  const { data } = await api.post("/api/auth/login", { username, password });
  return data;
}

export async function register(username, password, nombre, idRol) {
  const { data } = await api.post("/api/auth/register", {
    username,
    password,
    nombre: nombre || undefined,
    idRol: idRol || undefined,
  });
  return data;
}

export async function listUsers() {
  const { data } = await api.get("/api/auth/users");
  return data;
}

export async function updateUser(id, body) {
  const { data } = await api.patch(`/api/auth/users/${id}`, body);
  return data;
}
