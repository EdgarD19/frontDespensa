import { api } from "./client";

const PATHS = {
  categorias: ["/api/categories"],
  unidades: ["/api/unidades-medida"],
  proveedores: ["/api/v1/proveedor"],
  marcas: ["/api/v1/marcas"],
  rubros: ["/api/v1/rubros"],
  paises: ["/api/v1/paises"],
};

function parseMaestrosEnv() {
  const raw = import.meta.env.VITE_MAESTROS_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeMaestroRow(row) {
  if (!row || typeof row !== "object") return null;
  const id =
    row.id ??
    row.id_categoria ??
    row.idCategoria ??
    row.id_unidad ??
    row.idUnidad ??
    row.id_proveedor ??
    row.idProveedor ??
    row.id_subcategoria ??
    row.idSubcategoria;
  if (id == null) return null;
  const nombre = row.nombre ?? row.name ?? "";
  if (!String(nombre).trim()) return null;
  return { id: Number(id) || id, nombre: String(nombre) };
}

function normalizeUnidadRow(row) {
  const base = normalizeMaestroRow(row);
  if (!base) return null;
  const abreviatura = row.abreviatura ?? row.abreviatura_unidad ?? row.abreviaturaUnidad ?? "";
  return { ...base, abreviatura: abreviatura ? String(abreviatura) : "" };
}

function normalizeList(rows, rowNormalizer = normalizeMaestroRow) {
  return unwrapList(rows)
    .map((r) => rowNormalizer(r))
    .filter(Boolean);
}

async function fetchFirst(paths) {
  let lastErr;
  for (const path of paths) {
    try {
      const { data } = await api.get(path);
      return normalizeList(data);
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

async function loadCategorias() {
  const env = parseMaestrosEnv();
  if (env?.categorias?.length) return normalizeList(env.categorias);
  return fetchFirst(PATHS.categorias);
}

async function loadUnidades() {
  const env = parseMaestrosEnv();
  if (env?.unidades?.length) {
    return unwrapList(env.unidades).map((r) => normalizeUnidadRow(r)).filter(Boolean);
  }
  for (const path of PATHS.unidades) {
    try {
      const { data } = await api.get(path);
      return unwrapList(data).map((r) => normalizeUnidadRow(r)).filter(Boolean);
    } catch {
      /* siguiente */
    }
  }
  return [];
}

async function loadProveedores() {
  const env = parseMaestrosEnv();
  if (env?.proveedores?.length) return normalizeList(env.proveedores);
  return fetchFirst(PATHS.proveedores);
}

export async function getCategorias() {
  return loadCategorias();
}

export async function getUnidades() {
  return loadUnidades();
}

export async function getProveedores() {
  return loadProveedores();
}

async function loadMarcas() {
  const env = parseMaestrosEnv();
  if (env?.marcas?.length) return normalizeList(env.marcas);
  return fetchFirst(PATHS.marcas);
}

export async function getMarcas() {
  return loadMarcas();
}

async function loadRubros() {
  const env = parseMaestrosEnv();
  if (env?.rubros?.length) return normalizeList(env.rubros);
  return fetchFirst(PATHS.rubros);
}

export async function getRubros() {
  return loadRubros();
}

async function loadPaises() {
  const env = parseMaestrosEnv();
  if (env?.paises?.length) return normalizeList(env.paises);
  return fetchFirst(PATHS.paises);
}

export async function getPaises() {
  return loadPaises();
}

export async function getCiudades(idPais) {
  if (!idPais) return [];
  try {
    const { data } = await api.get(`/api/v1/paises/${idPais}/ciudades`);
    return normalizeList(data);
  } catch {
    return [];
  }
}

const SUBCATEGORIA_PATH_TEMPLATES = [
  (id) => `/api/categories/${id}/subcategorias`,
];

export async function getSubcategorias(idCategoria) {
  if (!idCategoria) return [];
  const env = parseMaestrosEnv();
  const key = String(idCategoria);
  if (env?.subcategoriasPorCategoria?.[key]?.length) {
    return normalizeList(env.subcategoriasPorCategoria[key]);
  }
  for (const build of SUBCATEGORIA_PATH_TEMPLATES) {
    try {
      const { data } = await api.get(build(idCategoria));
      return normalizeList(data);
    } catch {
      /* siguiente */
    }
  }
  return [];
}
