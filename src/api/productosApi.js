import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

function parseStockActual(raw) {
  if (raw === "" || raw === undefined || raw === null || raw === "—") return 0;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Respuesta del backend: ProductResponse (name, price, description, code) + campos opcionales.
 */
function toFrontendProduct(backend) {
  if (!backend) return null;

  const idCategoria = backend.id_categoria ?? backend.idCategoria;
  const idUnidad = backend.id_unidad ?? backend.idUnidad;
  const idProveedor = backend.id_proveedor ?? backend.idProveedor;
  const stockRaw = backend.stock_actual ?? backend.stockActual ?? 0;
  const precioVenta = backend.precio ?? backend.price ?? 0;
  const codigoProducto = backend.codigo_producto ?? backend.code ?? "";
  const isPesable =
    backend.producto_pesable === true || backend.productoPesable === true;

  return {
    id: backend.id,
    nombre: backend.name ?? "",
    codigo: (backend.codigo_interno ?? backend.codigoInterno) || "",
    codigoBarras: codigoProducto,
    idCategoria: idCategoria != null ? String(idCategoria) : "",
    categoria: backend.category_name ?? backend.categoryName ?? "",
    idSubcategoria: "",
    subcategoria: "",
    marca: backend.marca || "",
    productoPesable: isPesable ? "si" : "no",
    idUnidad: idUnidad != null ? String(idUnidad) : "",
    unidadMedida: backend.unit_name ?? backend.unitName ?? "",
    precioCompra: String(backend.precio_compra ?? backend.precioCompra ?? ""),
    precioVenta: isPesable ? "" : String(precioVenta),
    precioCompraKg: String(
      backend.precio_compra_kg ?? backend.precioCompraKg ?? ""
    ),
    precioVentaKg: isPesable ? String(precioVenta) : "",
    stockMinimo: String(backend.stock_minimo ?? backend.stockMinimo ?? ""),
    stockActual: String(stockRaw),
    idProveedor: idProveedor != null ? String(idProveedor) : "",
    proveedor: backend.proveedor_nombre ?? backend.proveedorNombre ?? "",
    foto: backend.foto || "",
    observaciones: backend.descripcion ?? backend.description ?? "",
  };
}

/**
 * POST — ProductRequest (Spring).
 */
function toCreateBody(frontend, idCategoria, idUnidad, idProveedor) {
  const isPesable = frontend.productoPesable === "si";
  const precioStr = isPesable ? frontend.precioVentaKg : frontend.precioVenta;
  const precio = parseFloat(String(precioStr || "").replace(",", "."));
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error("El precio de venta debe ser mayor que 0.");
  }

  const codigoBarras = (frontend.codigoBarras || "").trim();
  const codigoInterno = (frontend.codigo || "").trim();
  const codigoProducto =
    codigoBarras || codigoInterno || `AUTO-${Date.now()}`;

  const descripcion = (frontend.observaciones || "").trim();

  return {
    name: frontend.nombre?.trim(),
    descripcion: descripcion.length > 0 ? descripcion : null,
    precio,
    id_categoria: idCategoria,
    id_unidad: idUnidad,
    id_proveedor: idProveedor,
    stock_actual: parseStockActual(frontend.stockActual),
    codigo_producto: codigoProducto,
  };
}

/**
 * PATCH — el backend solo aplica PatchRequest.precio.
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

export async function getProductos(params = {}) {
  const { data } = await api.get("/api/products", {
    params: {
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 100,
      search: params.search || undefined,
      sortBy: params.sortBy || undefined,
      sortDir: params.sortDir || "ASC",
    },
  });
  return {
    content: (data.content || []).map(toFrontendProduct),
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

export async function getProductoById(id) {
  const { data } = await api.get(`/api/products/${id}`);
  return toFrontendProduct(data);
}

/** El backend responde 201 sin cuerpo: no hay id en la respuesta. */
export async function createProducto(producto, idCategoria, idUnidad, idProveedor) {
  const body = toCreateBody(producto, idCategoria, idUnidad, idProveedor);
  await api.post("/api/products", body);
}

export async function updateProducto(id, producto) {
  const body = toPatchPrecioBody(producto);
  const { data } = await api.patch(`/api/products/${id}`, body);
  return toFrontendProduct(data);
}

export async function updateProductoPrecio(id, precio) {
  const { data } = await api.patch(`/api/products/${id}`, { precio });
  return toFrontendProduct(data);
}

export async function deleteProducto(id) {
  await api.delete(`/api/products/${id}`);
}
