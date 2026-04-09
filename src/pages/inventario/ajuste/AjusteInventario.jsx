import { useState, useEffect } from "react";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import { getHistorialAjustes, crearAjuste } from "../../../api/ajustesApi";

export default function AjusteInventario() {
    // Datos del server
    const [productos, setProductos] = useState([]); // lista completa para el selector
    const [historial, setHistorial] = useState([]); // ajustes registrados anteriormente
    const [loading, setLoading] = useState(true); // spinner mientras carga (manejar el estado de carga)
    const [error, setError] = useState(null);

    // interaccion del usuario
    const [productoSeleccionado, setProductoSeleccionado] = useState(null); // fila clickeada
    const [search, setSearch] = useState(""); // texto del buscador

    // Formulario del panel
    const [formData, setFormData] = useState({
        tipoAjuste: "", // select: "Robo", "Vencimiento", etc.
        fechaAjuste: "", // input date
        nuevoStock: "", // input number
        justificacion: "", // textarea
        autorizadoPor: "", // input text
    });

    const diferencia = Number(formData.nuevoStock || 0) - Number(productoSeleccionado?.stockActual || 0);

    // Carga la lista de productos para el selector (se ejecuta al montar el componente)
    useEffect(() => {
        let cancelled = false; // variable de control
        (async () => {
            // funcion async autoejecutable
            try {
                setError(null);
                setLoading(true); // indicar que esta cargando
                const res = await getProductos({ pageSize: 500 }); // llamada al backend, hasta 500 productos
                if (!cancelled) setProductos(res.content || []); // guarda si el componente sigue activo
            } catch (err) {
                if (!cancelled) {
                    setError(apiErrorMessage(err) || "Error al cargar productos");
                    setProductos([]);
                }
            } finally {
                if (!cancelled) setLoading(false); // exito o error
            }
        })();
        return () => {
            cancelled = true;
        }; // se ejecuta cuando el componente se desmonta
    }, []); // se ejecuta una sola vez

    // carga el historial de ajustes anteriores
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getHistorialAjustes({ pageSize: 50 });
                if (!cancelled) setHistorial(res.content || []);
            } catch {
                // historial opcional: si falla no bloquea el modulo
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSelectProducto = (producto) => {
        setProductoSeleccionado(producto);
        // Pre-rellena nuevoStock con el stock actual para que la diferencia arranque en 0
        setFormData((prev) => ({
            ...prev,
            nuevoStock: String(producto.stockActual ?? ""),
        }));
        setError(null);
    };

    // valida, llama a la API y actualiza la UI sin recargar
    const handleSubmit = async (e) => {
        e.preventDefault();

        // validaciones antes de tocar el servidor
        if (!productoSeleccionado) return;
        if (!formData.tipoAjuste) {setError("Selecciona un tipo de ajuste"); return; }
        if (formData.nuevoStock === "") { setError("Ingresa el nuevo stock."); return; }
        if (!formData.justificacion.trim()) { setError("La justificación es obligatoria."); return; }
        if (!formData.autorizadoPor.trim()) { setError("Ingresa quien autoriza."); return; }

        try {
            setError(null);

            const ajuste = await crearAjuste({
                idProducto: productoSeleccionado.id,
                tipoAjuste: formData.tipoAjuste,
                fechaAjuste: formData.fechaAjuste,
                stockAnterior: productoSeleccionado.stockActual,
                nuevoStock: Number(formData.nuevoStock),
                justificacion: formData.justificacion,
                autorizadoPor: formData.autorizadoPor,
            });

            // actualiza el stock del producto 
            setProductos((prev) =>
                prev.map((p) => 
                    p.id === productoSeleccionado.id
                        ? { ...p, stockActual: Number(formData.nuevoStock) }
                        : p
                )
            );

            // agrega el ajuste nuevo al principio del historial local
            setHistorial((prev) => [ajuste, ...prev]);
            // limpa el formulario despues del exito
            handleClear();

        } catch (err) {
            setError(apiErrorMessage(err) || "Error al registrar el ajuste");
        }
    };

    // resetea todo al estado inicial
    const handleClear = () => {
        setFormData({
            tipoAjuste: "", fechaAjuste: "",
            nuevoStock: "", justificacion: "", autorizadoPor: "",
        });
        setProductoSeleccionado(null);
        setError(null);
    };

    return (
        <div>
            <p>funciona?</p>
        </div>
    );

}

