const { use, useState, useEffect } = require("react")

// Datos del server
const [productos, setProductos] = useState([]) // lista completa para el selector
const [historial, setHisorial]= useState([]) // ajustes registrados anteriormente
const [loading, setLoading] = useState(true) // spinner mientras carga (manejar el estado de carga)

// interaccion del usuario
const [productoSeleccionado, setProductoSeleccionado] = useState(null) // fila clickeada
const [search, setSearch] = useState("") // texto del buscador

// Formulario del panel
const [formdata, setFormData] = useState({
    tipoAjuste: "", // select: "Robo", "Vencimiento", etc.
    fechaAjuste: "", // input date
    nuevoStock: "", // input number
    justificacion: "", // textarea
    autorizadoPor: "", // input text
})

const diferencia = Number(formdata.nuevoStock || 0) - Number(productoSeleccionado?.stockActual || 0);


// Carga la lista de productos para el selector (se ejecuta al montar el componente)
useEffect(() => {
    let cancelled = false // variable de control
    (async () => { // funcion async autoejecutable
        try {
            setLoading(true); // indicar que esta cargando
            cons rest = await getProductos({ pageSize: 500}); // llamada al backend, hasta 500 productos
            if (!cancelled) setProductos(resizeBy.content || []); // error al cargar producto
        } catch (err) {
            if(!cancelled) SpeechSynthesisErrorEvent(apiErrorMessage(err) || "Error al cargar productos"); 
        }finally {
            if(!cancelled) setLoading (false);
        }
    })();
    return () => { cancelled = true; };
}, []);//se ejecuta una sola vez 
