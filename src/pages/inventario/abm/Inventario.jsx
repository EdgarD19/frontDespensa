// Hooks de React:
//   useState   → guarda valores que pueden cambiar (estado local)
//   useEffect  → ejecuta código cuando algo cambia (ej: al montar el componente)
//   useCallback → memoriza una función para que no se recree en cada render
import { useState, useEffect, useCallback } from "react";

// Ícono "X" (cruz para cerrar) de la librería lucide-react
import { Plus, X } from "lucide-react";

// Componentes hijos: el formulario ABM y la tabla/lista de productos
import ProductForm from "./ProductForm";
import ProductList from "./ProductList";

// Funciones que llaman al backend (Spring Boot) para productos
import {
  getProductos,      // GET  → trae la lista paginada de productos
  createProducto,    // POST → crea un producto nuevo
  updateProducto,    // PATCH/PUT → edita un producto existente
  deleteProducto,    // DELETE → elimina un producto
  apiErrorMessage,   // Extrae el mensaje de error de una respuesta fallida
} from "../../../api/productosApi";

// Funciones que traen las "tablas maestro" (catálogos de selects del formulario)
import {
  getCategorias,     // GET → lista de categorías
  getUnidades,       // GET → lista de unidades de medida
  getProveedores,    // GET → lista de proveedores
  getSubcategorias,  // GET → subcategorías filtradas por idCategoria
} from "../../../api/maestrosApi";

// Retorna la URL base de la API (ej: http://localhost:8080)
import { absoluteApiOrigin } from "../../../api/client";

// ESTADO INICIAL DEL FORMULARIO
/*
  INITIAL_FORM es un objeto "plantilla vacía" que representa un producto en blanco.
  Se usa en dos momentos:
    1. Al abrir el modal para CREAR un producto nuevo (todos los campos limpios).
    2. Al cerrar o limpiar el formulario (resetear a valores vacíos).
*/
const INITIAL_FORM = {
  id: null,             // null = producto nuevo (aún no tiene ID de BD)
  codigoBarras: "",
  nombre: "",
  idCategoria: "",
  categoria: "",
  idSubcategoria: "",
  subcategoria: "",
  productoPesable: "no", // "si" o "no" → cambia qué campos de precio se usan
  idUnidad: "",
  unidadMedida: "",
  precioCompra: "",
  precioVenta: "",
  precioCompraKg: "",    // Solo se usa si productoPesable === "si"
  precioVentaKg: "",     // Solo se usa si productoPesable === "si"
  stockMinimo: "",
  stockActual: "",
  idProveedor: "",
  proveedor: "",
  observaciones: "",
};

// FUNCIÓN AUXILIAR: mergeProductoLista
function mergeProductoLista(prev, next) {
  // Spread: empieza copiando todo de prev, luego pisa con lo que trae next
  const m = { ...prev, ...next };

  // Para cada campo importante: si next lo trajo vacío/nulo, restauramos el de prev
  if (!next.categoria)     m.categoria     = prev.categoria;
  if (!next.idCategoria)   m.idCategoria   = prev.idCategoria;
  if (!next.idSubcategoria) m.idSubcategoria = prev.idSubcategoria;
  if (!next.subcategoria)  m.subcategoria  = prev.subcategoria;
  if (!next.idUnidad)      m.idUnidad      = prev.idUnidad;
  if (!next.unidadMedida)  m.unidadMedida  = prev.unidadMedida;
  if (!next.idProveedor)   m.idProveedor   = prev.idProveedor;
  if (!next.proveedor)     m.proveedor     = prev.proveedor;

  // stockActual vacío o null → conservar el anterior
  if (next.stockActual === "" || next.stockActual == null) m.stockActual = prev.stockActual;

  // stockMinimo vacío (y el anterior tenía valor) → conservar el anterior
  if (next.stockMinimo === "" && prev.stockMinimo !== "") m.stockMinimo = prev.stockMinimo;

  // Precios: si next no los trajo, conservar los anteriores
  if (!next.precioCompra    && prev.precioCompra)    m.precioCompra    = prev.precioCompra;
  if (!next.precioCompraKg  && prev.precioCompraKg)  m.precioCompraKg  = prev.precioCompraKg;

  return m;
}
// COMPONENTE PRINCIPAL: Inventario
/*
  - Mantener el estado global del módulo (lista de productos, formulario, modal, etc.)
  - Llamar a la API (backend)
  - Pasar datos y funciones a los componentes hijos

  "export default" significa que este componente es el que se exporta
  cuando otro archivo hace: import Inventario from "./Inventario"
*/
export default function Inventario() {
  /*
    ESTADOS (useState) 
    useState devuelve un array de dos elementos: [valorActual, funcionParaCambiarlo]
  */
  const [productos, setProductos]       = useState([]);      // Lista de productos cargados del backend
  const [loading, setLoading]           = useState(true);    // true mientras espera la respuesta del servidor
  const [error, setError]               = useState(null);    // Mensaje de error a mostrar (null = sin error)
  const [formData, setFormData]         = useState(INITIAL_FORM); // Datos actuales del formulario ABM
  const [editingId, setEditingId]       = useState(null);    // ID del producto que se está editando (null = alta nueva)
  const [searchNombre, setSearchNombre] = useState("");      // Texto del filtro "buscar por nombre"
  const [searchCodigo, setSearchCodigo] = useState("");      // Texto del filtro "buscar por código"
  const [modalOpen, setModalOpen]       = useState(false);   // true = el modal del formulario está visible

  // Estados para los "maestros" (datos de catálogo para los <select> del formulario)
  const [categorias, setCategorias]     = useState([]);
  const [unidades, setUnidades]         = useState([]);
  const [proveedores, setProveedores]   = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);

  /*
    maestrosAviso: si los tres catálogos vienen vacíos, guardamos un aviso único
    en ámbar para mostrar en pantalla (en lugar de lanzar tres errores rojos).
  */
  const [maestrosAviso, setMaestrosAviso] = useState(null);

  // URL del Swagger del backend, útil para depuración en desarrollo
  const swaggerUrl = `${absoluteApiOrigin()}/swagger-ui.html`;

  //  FUNCIONES ASÍNCRONAS (llamadas a la API) 

  /**
   * loadProductos
   * Llama al backend para traer hasta 200 productos y los guarda en `productos`.
   * Si falla, muestra el mensaje de error. En ambos casos quita el spinner (loading).
   */
  const loadProductos = async () => {
    try {
      setError(null);                          // Limpia cualquier error previo
      const res = await getProductos({ pageSize: 200 }); // Espera la respuesta del backend
      setProductos(res.content);               // Guarda el array de productos en el estado
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cargar productos");
      setProductos([]);                        // Si falló, lista vacía
    } finally {
      setLoading(false);                       // finally → siempre se ejecuta, haya error o no
    }
  };

  /**
   * loadMaestros
   * Carga los catálogos (categorías, unidades, proveedores) necesarios para
   * rellenar los <select> del formulario.
   *
   * Usa una función interna `safe` que envuelve cada llamada en try/catch:
   * si una falla, devuelve [] en lugar de romper todo el Promise.all.
   *
   * Promise.all lanza las tres peticiones EN PARALELO (más rápido que hacerlas
   * una por una en secuencia).
   */
  const loadMaestros = async () => {
    setMaestrosAviso(null); // Limpia aviso anterior

    // Función auxiliar: ejecuta fn() de forma segura, devuelve [] si falla
    const safe = async (fn) => {
      try {
        const v = await fn();
        return Array.isArray(v) ? v : []; // Asegura que siempre sea un array
      } catch {
        return []; // Si el endpoint no existe o falla, devuelve vacío
      }
    };

    // Lanza las tres peticiones al mismo tiempo y espera que todas terminen
    const [cats, unids, provs] = await Promise.all([
      safe(getCategorias),
      safe(getUnidades),
      safe(getProveedores),
    ]);

    // Guarda los resultados en sus estados correspondientes
    setCategorias(cats);
    setUnidades(unids);
    setProveedores(provs);

    // Si los tres llegaron vacíos, muestra el aviso ámbar con instrucciones
    if (cats.length === 0 && unids.length === 0 && provs.length === 0) {
      setMaestrosAviso(
        "No hay categorías, unidades ni proveedores para el alta de productos. "
      );
    }
  };

  /*
    useEffect(() => { ... }, [deps])
    ─ El código dentro se ejecuta DESPUÉS de que React pinte el componente.
    ─ El array [deps] controla CUÁNDO se vuelve a ejecutar:
        []        → solo al montar (primera vez que aparece en pantalla)
        [x, y]    → cada vez que x o y cambien
        (sin array) → cada render (raramente útil)
  */

  // Al montar el componente: carga los catálogos maestros UNA sola vez
  useEffect(() => {
    loadMaestros();
  }, []); // [] = sin dependencias → solo al montar

  /*
    Cada vez que el usuario cambia la categoría seleccionada en el formulario,
    pedimos al backend las subcategorías que pertenecen a esa categoría.
    Si no hay categoría seleccionada, vaciamos el listado de subcategorías.
  */
  useEffect(() => {
    if (formData.idCategoria) {
      getSubcategorias(Number(formData.idCategoria))
        .then(setSubcategorias)        // Si resuelve bien → guarda las subcategorías
        .catch(() => setSubcategorias([])); // Si falla → lista vacía
    } else {
      setSubcategorias([]); // Sin categoría → sin subcategorías
    }
  }, [formData.idCategoria]); // Se re-ejecuta solo cuando cambia idCategoria

  // Al montar el componente: carga la lista de productos UNA sola vez
  useEffect(() => {
    loadProductos();
  }, []); // [] = solo al montar

  /*
      * CERRAR MODAL 
    useCallback memoriza la función closeModal para que no se recree en cada render.
    closeModal se usa como dependencia en el useEffect del teclado
  */
  const closeModal = useCallback(() => {
    setModalOpen(false);       // Oculta el modal
    setFormData(INITIAL_FORM); // Resetea el formulario a vacío
    setEditingId(null);        // Ya no hay producto en edición
    setError(null);            // Limpia errores
  }, []); // Sin dependencias → closeModal nunca cambia

  /*
    Efecto: cuando el modal está abierto...
      1. Bloquea el scroll de la página (document.body.style.overflow = "hidden")
         para que el fondo no se mueva mientras el modal está visible.
      2. Escucha la tecla Escape para cerrar el modal con el teclado.

    El "return" dentro del useEffect es la función de LIMPIEZA:
    se ejecuta cuando el componente se desmonta O antes de que el efecto
    se vuelva a ejecutar. Aquí restaura el scroll y elimina el listener.
  */
  useEffect(() => {
    if (!modalOpen) return; // Si el modal no está abierto, no hace nada

    const prev = document.body.style.overflow; // Guarda el valor anterior del overflow
    document.body.style.overflow = "hidden";   // Bloquea el scroll del body

    const onKey = (ev) => {
      if (ev.key === "Escape") closeModal(); // Escape → cerrar modal
    };
    window.addEventListener("keydown", onKey); // Registra el listener de teclado

    // Función de limpieza: se ejecuta al desmontar o al cambiar modalOpen/closeModal
    return () => {
      document.body.style.overflow = prev;        // Restaura el scroll original
      window.removeEventListener("keydown", onKey); // Elimina el listener
    };
  }, [modalOpen, closeModal]);

  /**
      HANDLERS (manejadores de eventos)
   * openModalForAdd
   * Abre el modal en modo ALTA (nuevo producto).
   * Limpia el formulario y asegura que no haya ningún ID de edición activo.
   */
  const openModalForAdd = () => {
    setFormData(INITIAL_FORM); // Formulario en blanco
    setEditingId(null);        // Sin ID → modo "crear"
    setError(null);
    setModalOpen(true);        // Abre el modal
  };

  /**
   * handleSubmit
   * Se ejecuta cuando el usuario hace clic en "Guardar" dentro del formulario.
   * Decide si CREAR o EDITAR según si hay un editingId activo.
   *
   * e.preventDefault() → evita que el formulario recargue la página
   * (comportamiento nativo de los <form> en HTML).
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Frena el comportamiento por defecto del formulario

    const data = { ...formData }; // Copia del estado actual del formulario

    // Elige el precio correcto según si el producto se vende por peso o por unidad
    const precioCompra = data.productoPesable === "si" ? data.precioCompraKg : data.precioCompra;
    const precioVenta  = data.productoPesable === "si" ? data.precioVentaKg  : data.precioVenta;

    // Validaciones básicas antes de enviar al servidor
    if (Number(precioCompra) < 0 || Number(precioVenta) < 0) return; // No acepta precios negativos
    if (Number(data.stockMinimo || 0) < 0) return;                   // No acepta stock mínimo negativo

    // Convierte los IDs a número (los selects guardan strings)
    const idCat  = data.idCategoria  ? Number(data.idCategoria)  : null;
    const idUnid = data.idUnidad     ? Number(data.idUnidad)     : null;
    const idProv = data.idProveedor  ? Number(data.idProveedor)  : null;

    // Solo en ALTA (no edición): los tres campos son obligatorios
    if (!editingId && (!idCat || !idUnid || !idProv)) {
      setError("Debe seleccionar categoría, unidad de medida y proveedor para crear un producto.");
      return;
    }

    if (!editingId) {
      const cb = String(data.codigoBarras || "").replace(/\D/g, "");
      if (!/^\d{9,13}$/.test(cb)) {
        setError("El código de barras debe tener entre 9 y 13 dígitos, solo números.");
        return;
      }
      data.codigoBarras = cb;
    }

    try {
      setError(null);

      if (editingId) {
        // ─ MODO EDICIÓN ─
        // Llama al backend para actualizar el producto
        const updated = await updateProducto(editingId, data);

        // Actualiza solo ese producto en la lista local sin recargar todo
        // prev.map recorre el array y reemplaza el que coincide por ID
        setProductos((prev) =>
          prev.map((p) => (p.id === editingId ? mergeProductoLista(p, updated) : p))
        );
        setEditingId(null); // Ya no estamos editando

      } else {
        // ─ MODO ALTA ─
        // Crea el producto nuevo en el backend
        await createProducto(data, idCat, idUnid, idProv);
        // Recarga la lista completa (para obtener el ID asignado por la BD)
        await loadProductos();
      }

      setFormData(INITIAL_FORM); // Resetea el formulario
      setModalOpen(false);       // Cierra el modal
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al guardar");
    }
  };

  /**
   * handleClear
   * Limpia el formulario sin cerrar el modal.
   * Útil si el usuario quiere empezar de cero sin salir del modal.
   */
  const handleClear = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  /**
   * handleEdit
   * Se llama cuando el usuario hace clic en "Editar" en una fila de ProductList.
   * Carga los datos de ese producto en el formulario y abre el modal en modo edición.
   *
   * El operador ?? (nullish coalescing) devuelve el valor de la derecha
   * si el de la izquierda es null o undefined. Ej: null ?? "" → ""
   * Esto asegura que los campos de los selects reciban "" en lugar de null
   * (los <select> controlados no aceptan null como value).
   */
  const handleEdit = (producto) => {
    setFormData({
      ...producto,                                        // Copia todos los campos del producto
      id: producto.id,
      idCategoria:   producto.idCategoria   ?? "",        // null → ""
      idSubcategoria: producto.idSubcategoria ?? "",
      idUnidad:      producto.idUnidad      ?? "",
      idProveedor:   producto.idProveedor   ?? "",
      productoPesable: producto.productoPesable || "no",  // Si viene undefined → "no"
    });
    setEditingId(producto.id); // Marca cuál producto se está editando
    setModalOpen(true);        // Abre el modal
  };

  /**
   * handleDelete
   * Se llama cuando el usuario hace clic en "Eliminar" en una fila de ProductList.
   * Pide confirmación, luego llama al backend y elimina el producto de la lista local.
   *
   * prev.filter devuelve un nuevo array SIN el elemento que cumple la condición.
   * Es la forma idiomática de "borrar" un elemento de un array en React.
   */
  const handleDelete = async (id) => {
    // Confirma con el usuario antes de eliminar (window.confirm = popup nativo)
    if (!window.confirm("¿Está seguro de eliminar este producto?")) return;

    try {
      setError(null);
      await deleteProducto(id); // Llama al backend: DELETE /productos/{id}

      // Elimina el producto de la lista local sin recargar del servidor
      setProductos((prev) => prev.filter((p) => p.id !== id));

      // Si justo ese producto estaba siendo editado, limpia también el formulario
      if (editingId === id) {
        setFormData(INITIAL_FORM);
        setEditingId(null);
        setModalOpen(false);
      }
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al eliminar");
    }
  };

  return (
    // Contenedor principal: columna flexible que ocupa casi toda la pantalla
    <div className="space-y-6 flex flex-col min-h-[calc(100dvh-6rem)]">

      {/* Encabezado de la sección */}
      <div>
        <h1 className="text-2xl font-bold text-[#f0f6fc]">Inventario</h1>
        <p className="text-[#8b949e] text-sm mt-1">
          Gestiona tus productos y stock en un solo lugar
        </p>
      </div>

      {/*
        Renderizado condicional
      */}
      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Aviso ámbar: se muestra solo si los maestros llegaron vacíos */}
      {maestrosAviso && (
        <div className="rounded-lg bg-amber-500/20 border border-amber-500/50 px-4 py-3 text-amber-100 text-sm space-y-2">
          <p className="font-medium text-amber-50">Maestros necesarios para crear productos</p>
          <p className="text-amber-100/95 leading-relaxed">{maestrosAviso}</p>
          <p className="text-amber-200/90 text-xs">
            Swagger: <span className="font-mono break-all">{swaggerUrl}</span>
          </p>
        </div>
      )}

      {/*
        ProductList: componente hijo que muestra la tabla de productos.
        Le pasamos "props"  con los datos y las funciones que necesita.
        Si loading es true, le pasamos [] para que muestre un estado vacío.
      */}
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <ProductList
          products={loading ? [] : productos}
          onEdit={handleEdit}
          onDelete={handleDelete}
          filterNombre={searchNombre}
          setFilterNombre={setSearchNombre}
          filterCodigo={searchCodigo}
          setFilterCodigo={setSearchCodigo}
          primaryAction={
            <button
              type="button"
              onClick={openModalForAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-white rounded-full sm:rounded-md font-medium transition-all duration-300 whitespace-nowrap w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              Agregar producto
            </button>
          }
        />
      </div>

      {/*
        MODAL: se renderiza solo si modalOpen es true.
      */}
      {modalOpen && (
        // Overlay: ocupa toda la pantalla (fixed inset-0), fondo semitransparente
        // onClick en el overlay → cierra el modal (clic fuera del cuadro)
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
          role="presentation"
          onClick={closeModal}
        >
          {/*
            Cuadro del modal (dialog):
            e.stopPropagation() → evita que el clic DENTRO del cuadro
            se propague al overlay y cierre el modal accidentalmente.
          */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-gestion-producto" // Accesibilidad: 
            className="relative w-full max-w-6xl max-h-[min(92dvh,920px)] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Detiene la propagación del evento
          >
            {/* Botón X para cerrar el modal (esquina superior derecha) */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 z-10 p-2 rounded-full bg-[#252525] text-white hover:bg-black border border-[#30363d] transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/*
              ProductForm: componente hijo con el formulario de alta/edición.
              isEditing={!!editingId} → convierte editingId a booleano:
                si editingId tiene un número → true (modo edición)
                si editingId es null → false (modo alta)
              lockNonPriceFields → en edición, bloquea ciertos campos
            */}
            <div className="pt-2">
              <ProductForm
                formData={formData}             // Datos actuales del formulario
                setFormData={setFormData}       // Función para actualizarlos
                onSubmit={handleSubmit}         // Al hacer submit del form
                onClear={handleClear}           // Al hacer clic en "Limpiar"
                isEditing={!!editingId}         // true = modo edición, false = alta
                lockNonPriceFields={!!editingId} // Bloquea campos en edición
                categorias={categorias}         // Lista para el <select> de categorías
                subcategorias={subcategorias}   // Lista para el <select> de subcategorías
                unidades={unidades}             // Lista para el <select> de unidades
                proveedores={proveedores}       // Lista para el <select> de proveedores
                loading={loading}
                titleId="modal-gestion-producto" // ID para accesibilidad (aria-labelledby)
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
