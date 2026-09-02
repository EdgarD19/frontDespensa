import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

// Helpers internos

/**
 * Convierte el ProductoResponse del backend al shape que usa el frontend.
 *
 * El backend (ProductoController -> ProductoResponse) devuelve:
 *   { idProducto, nombre, codigoBarra, descripcion, stockActual,
 *     idCategoria, categoriaNombre, idUnidad, unidadNombre, activo,
 *     fechaCreacion, precioVentaVigente, fechaPrecioVentaVigente,
 *     habilitadoParaVenta }
 */
function toFrontendProduct(backend) {
  if (!backend) return null;

  const precioStr =
    backend.precioVentaVigente != null ? String(backend.precioVentaVigente) : "";

  return {
    id: backend.idProducto,
    nombre: backend.nombre ?? "",
    descripcion: backend.descripcion ?? "",
    codigoBarras: backend.codigoBarra ?? "",

    idCategoria: backend.idCategoria ?? "",
    categoria: backend.categoriaNombre ?? "",
    idSubcategoria: "",
    subcategoria: "",

    productoPesable: "no",

    idMarca: "",
    marca: "",

    idUnidad: backend.idUnidad ?? "",
    unidadMedida: backend.unidadNombre ?? "",
    unitAbbreviation: "",

    precioVenta: precioStr,
    precio: precioStr,

    stockActual: backend.stockActual ?? "",

    precioCompra: "",

    idProveedor: "",
    proveedor: "",

    activo: backend.activo !== false,

    precioFuturo: backend.precioFuturo ?? null,
    fechaVigencia: backend.fechaVigencia ?? null,
  };
}

/**
 * Arma el body para POST /api/productos.
 *
 * ProductoRequest (Spring) espera:
 *   nombre, codigoBarra, descripcion, stockActual, idCategoria, idUnidad, activo
 */
function toCreateBody(frontend, idUnidad) {
  const codigoBarras = String(frontend.codigoBarras || "").replace(/\D/g, "");
  const descripcion = (frontend.descripcion || "").trim();

  return {
    nombre: frontend.nombre?.trim(),
    codigoBarra: codigoBarras || null,
    descripcion: descripcion.length > 0 ? descripcion : null,
    stockActual: 0,
    idCategoria: Number(frontend.idCategoria) || undefined,
    idUnidad: idUnidad ? Number(idUnidad) : undefined,
    activo: true,
  };
}

/**
 * Arma el body para PUT /api/productos/{id}.
 *
 * ProductoRequest (Spring): nombre, codigoBarra, descripcion, stockActual,
 * idCategoria, idUnidad, activo. Los campos null NO se actualizan.
 */
function toPatchBody(producto) {
  return {
    nombre: producto.nombre?.trim() ?? undefined,
    codigoBarra: String(producto.codigoBarras || "").replace(/\D/g, "") || undefined,
    descripcion: (producto.descripcion || "").trim() || undefined,
    idCategoria: Number(producto.idCategoria) || undefined,
    idUnidad: Number(producto.idUnidad) || undefined,
    activo: producto.activo !== false,
  };
}

// ---------------------------------------------------------------------------
// Funciones exportadas
// ---------------------------------------------------------------------------

/**
 * GET /api/productos
 * Params: page, size, sortBy, sortDirection
 * Respuesta: { data: { content, page, size, totalElements, totalPages }, mensaje }
 */
export async function getProductos(params = {}) {
  const searchTrim = params.search != null ? String(params.search).trim() : "";
  const { data } = await api.get(searchTrim ? "/api/productos/buscar" : "/api/productos", {
    params: searchTrim
      ? {
          nombre: searchTrim,
          page: params.page ?? 0,
          size: params.pageSize ?? 20,
          sortBy: params.sortBy || params.sortField || undefined,
          sortDirection: params.sortDir || "asc",
        }
      : {
          page: params.page ?? 0,
          size: params.pageSize ?? 20,
          sortBy: params.sortBy || params.sortField || undefined,
          sortDirection: params.sortDir || "asc",
        },
  });

  const pageData = data?.data ?? data ?? {};
  const content = Array.isArray(pageData.content)
    ? pageData.content
    : Array.isArray(pageData)
    ? pageData
    : [];

  return {
    content: content.map(toFrontendProduct).filter(Boolean),
    totalElements: pageData.totalElements ?? content.length,
    totalPages: pageData.totalPages ?? 0,
    page: pageData.page ?? 0,
    size: pageData.size ?? content.length,
  };
}

/**
 * GET /api/productos/{id}
 */
export async function getProductoById(id) {
  const { data } = await api.get(`/api/productos/${id}`);
  return toFrontendProduct(data?.data ?? data);
}

/**
 * GET /api/productos/codigo/{codigoBarra}
 * Devuelve null si el backend responde 404.
 */
export async function getProductoByCodigo(codigo) {
  try {
    const { data } = await api.get(`/api/productos/codigo/${encodeURIComponent(codigo.trim())}`);
    return toFrontendProduct(data?.data ?? data);
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * POST /api/productos
 * El backend responde 201 con el producto creado.
 */
export async function createProducto(producto, idUnidad, idProveedor) {
  const body = toCreateBody(producto, idUnidad, idProveedor);
  const { data } = await api.post("/api/productos", body);
  return toFrontendProduct(data?.data ?? data);
}

/**
 * PUT /api/productos/{id}
 * Actualiza el producto. Devuelve el producto actualizado.
 */
export async function updateProducto(id, producto) {
  const body = toPatchBody(producto);
  const { data } = await api.put(`/api/productos/${id}`, body);
  return toFrontendProduct(data?.data ?? data);
}

/**
 * POST /api/precios-venta
 * Crea/actualiza el precio de venta vigente de un producto (APPEND-ONLY).
 * fechaVigencia (ISO local) intenta programarlo a futuro; el contrato actual
 * no lo soporta, por lo que se envía de todas formas (puede fallar).
 */
export async function updateProductoPrecio(id, precio, fechaVigencia = null) {
  const precioNum = Number(precio);
  const body = {
    productoId: Number(id),
    precio: Number.isFinite(precioNum) ? precioNum : 0,
  };
  if (fechaVigencia) body.fecha_vigencia = fechaVigencia;
  const { data } = await api.post("/api/precios-venta", body);
  return toFrontendProduct(data?.data ?? data);
}

/**
 * DELETE /api/productos/{id}/programacion
 * Cancela el precio de venta programado a futuro.
 * El contrato actual no lo expone: puede fallar hasta que el duo lo implemente.
 */
export async function cancelarProgramacionPrecio(id) {
  const { data } = await api.delete(`/api/productos/${id}/programacion`);
  return toFrontendProduct(data?.data ?? data);
}

/**
 * GET /api/precios-venta/producto/{productoId}
 * Historial de precios de venta de un producto.
 * Mapea al shape que espera el modal (incluye estado / variación).
 */
export async function getHistorialPrecios(productoId) {
  const { data } = await api.get(`/api/precios-venta/producto/${productoId}`, {
    params: { page: 0, size: 100, sortBy: "fechaHora", sortDirection: "desc" },
  });
  const rows = Array.isArray(data) ? data : (data?.content || data?.data?.content || []);
  return rows
    .map((r, idx) => {
      const venta = Number(r.precio ?? 0);
      return {
        id: r.idPrecioVenta ?? r.id ?? (idx + 1),
        codigoBarra: "",
        precioCompra: "",
        precioVenta: r.precio ?? "",
        margen: "",
        margenPorcentaje: "",
        estado: idx === 0 ? "VIGENTE" : "HISTORICO",
        precioVentaAnterior: null,
        variacionPorcentaje: null,
        vigencia: "",
        fecha: r.fechaHora ? String(r.fechaHora).slice(0, 10) : (r.fecha ?? ""),
        hora: r.fechaHora ? String(r.fechaHora).slice(11, 19) : (r.hora ?? ""),
      };
    })
    .sort((a, b) => {
      if (!a.fecha || !b.fecha) return 0;
      return String(b.fecha).localeCompare(String(a.fecha)) || String(b.hora || "").localeCompare(String(a.hora || ""));
    });
}

/**
 * PATCH /api/productos/{id}/desactivar
 * Soft delete del producto.
 */
export async function deleteProducto(id) {
  const { data } = await api.patch(`/api/productos/${id}/desactivar`);
  return toFrontendProduct(data?.data ?? data);
}
