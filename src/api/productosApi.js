import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function parseStockActual(raw) {
  if (raw === "" || raw === undefined || raw === null || raw === "—") return 0;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convierte el ProductResponse del backend al shape que usa el frontend.
 *
 * El backend (ProductMapper) devuelve ÚNICAMENTE:
 *   { id, name, price, description, code }
 *
 * Campos como category_name, unit_name, stock_actual, id_categoria, etc.
 * NO vienen en la respuesta — quedan vacíos hasta que el backend los exponga.
 */
function toFrontendProduct(backend) {
  if (!backend) return null;

  // "price" es el único campo numérico confirmado en ProductResponse
  const precioStr = backend.price != null ? String(backend.price) : "";

  return {
    id: backend.id,
    nombre: backend.name ?? "",

    // "code" del backend = código de barras / codigo_producto
    codigoBarras: backend.code ?? "",

    // El backend no devuelve estos campos aún → vacíos por defecto
    idCategoria: "",
    categoria: "",
    idSubcategoria: "",
    subcategoria: "",

    // El backend no devuelve producto_pesable → default "no"
    productoPesable: "no",

    idUnidad: "",
    unidadMedida: "",

    // El backend no devuelve precio_compra ni precios por kg
    precioCompra: "",
    precioVenta: precioStr,   // "price" = precio de venta
    precioCompraKg: "",
    precioVentaKg: "",

    // El backend no devuelve stock_minimo ni stock_actual en la respuesta
    stockMinimo: "",
    stockActual: "",

    idProveedor: "",
    proveedor: "",

    // "description" en ProductResponse
    observaciones: backend.description ?? "",
  };
}

/**
 * Arma el body para POST /api/products.
 *
 * ProductRequest (Spring) espera:
 *   name, descripcion, precio, id_categoria, id_unidad, id_proveedor,
 *   stock_actual, codigo_producto
 */
function toCreateBody(frontend, idCategoria, idUnidad, idProveedor) {
  const isPesable = frontend.productoPesable === "si";
  const precioStr = isPesable ? frontend.precioVentaKg : frontend.precioVenta;
  const precio = parseFloat(String(precioStr || "").replace(",", "."));
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error("El precio de venta debe ser mayor que 0.");
  }

  const codigoBarras = String(frontend.codigoBarras || "").replace(/\D/g, "");
  if (!/^\d{9,13}$/.test(codigoBarras)) {
    throw new Error("El código de barras debe tener entre 9 y 13 dígitos numéricos.");
  }
  const codigoProducto = codigoBarras;

  const descripcion = (frontend.observaciones || "").trim();

  return {
    name: frontend.nombre?.trim(),
    descripcion: descripcion.length > 0 ? descripcion : null,
    precio,
    id_categoria: Number(idCategoria),
    id_unidad: Number(idUnidad),
    id_proveedor: Number(idProveedor),
    stock_actual: parseStockActual(frontend.stockActual),
    codigo_producto: codigoProducto,
  };
}

/**
 * Arma el body para PATCH /api/products/{id}.
 *
 * PatchRequest (Spring) solo acepta: { precio }
 */
function toPatchPrecioBody(producto) {
  const isPesable = producto.productoPesable === "si";
  const precioStr = isPesable ? producto.precioVentaKg : producto.precioVenta;
  const precio = parseFloat(String(precioStr || "").replace(",", "."));
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error("El precio de venta debe ser mayor que 0.");
  }
  return { precio };
}

// ---------------------------------------------------------------------------
// Funciones exportadas
// ---------------------------------------------------------------------------

/**
 * GET /api/products
 * Params: search?, page, pageSize, sortBy?, sortDir (ASC|DESC)
 */
export async function getProductos(params = {}) {
  const searchTrim = params.search != null ? String(params.search).trim() : "";
  const { data } = await api.get("/api/products", {
    params: {
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 20,      // default del backend: 20
      search: searchTrim || undefined,
      sortBy: params.sortBy || undefined,
      sortDir: params.sortDir || "ASC",     // el Controller lo recibe como "sortDir"
    },
  });
  return {
    content: (data?.content || []).map(toFrontendProduct).filter(Boolean),
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    page: data?.page ?? 0,
    size: data?.size ?? 0,
  };
}

/**
 * GET /api/products/{id}
 */
export async function getProductoById(id) {
  const { data } = await api.get(`/api/products/${id}`);
  return toFrontendProduct(data);
}

/**
 * GET /api/products/barcode/{codigo}
 * Devuelve null si el backend responde 404.
 */
export async function getProductoByCodigo(codigo) {
  try {
    const { data } = await api.get(`/api/products/barcode/${encodeURIComponent(codigo.trim())}`);
    return toFrontendProduct(data);
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * POST /api/products
 * El backend responde 201 sin cuerpo → no retorna nada.
 */
export async function createProducto(producto, idCategoria, idUnidad, idProveedor) {
  const body = toCreateBody(producto, idCategoria, idUnidad, idProveedor);
  await api.post("/api/products", body);
}

/**
 * PATCH /api/products/{id}
 * Solo actualiza el precio. Devuelve el producto actualizado.
 */
export async function updateProducto(id, producto) {
  const body = toPatchPrecioBody(producto);
  const { data } = await api.patch(`/api/products/${id}`, body);
  return toFrontendProduct(data);
}

/**
 * PATCH /api/products/{id} — variante directa con valor numérico.
 */
export async function updateProductoPrecio(id, precio) {
  const { data } = await api.patch(`/api/products/${id}`, { precio });
  return toFrontendProduct(data);
}

/**
 * DELETE /api/products/{id}
 * El backend responde 204 sin cuerpo.
 */
export async function deleteProducto(id) {
  await api.delete(`/api/products/${id}`);
}
