import { useEffect, useState, useCallback } from "react";
import { User, X } from "lucide-react";
import { getClientes } from "../../../api/clientesApi";
import { apiErrorMessage } from "../../../api/errors";
import { labelCliente } from "./utils";

const DEBOUNCE_MS = 350;

export default function ClienteOpcional({ cliente, onSeleccionar, onQuitar }) {
  const [busqueda, setBusqueda] = useState("");
  const [debounced, setDebounced] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(busqueda), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await getClientes({
        search: debounced,
        page: 0,
        pageSize: 15,
        sortBy: "idCliente",
        sortDir: "ASC",
      });
      const body = res.data ?? {};
      setOpciones(Array.isArray(body.content) ? body.content : []);
    } catch (err) {
      setOpciones([]);
      setError(apiErrorMessage(err) || "No se pudieron cargar clientes");
    } finally {
      setCargando(false);
    }
  }, [debounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-4 space-y-3">
      <div className="flex items-center gap-2 text-[#e1e1eb]">
        <User className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
        <h3 className="text-sm font-semibold">Cliente (opcional)</h3>
      </div>
      <p className="text-xs text-[#5a5a6e]">
        Sin selección la factura se emite como venta genérica &quot;sin nombre&quot;.
      </p>

      {cliente ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-2">
          <span className="text-sm text-[#f1f1f3] truncate">{labelCliente(cliente)}</span>
          <button
            type="button"
            onClick={onQuitar}
            className="p-1.5 rounded-lg text-[#9a9aac] hover:text-rose-300 hover:bg-rose-500/10"
            title="Quitar cliente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento…"
            className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] outline-none"
          />
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <ul className="max-h-36 overflow-y-auto rounded-lg border border-[#1e1e24] divide-y divide-[#1e1e24] bg-[#0d0d0f]">
            {cargando ? (
              <li className="px-3 py-2 text-xs text-[#5a5a6e]">Buscando…</li>
            ) : opciones.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[#5a5a6e]">Sin resultados.</li>
            ) : (
              opciones.map((c) => (
                <li key={c.id ?? c.idCliente}>
                  <button
                    type="button"
                    onClick={() => {
                      onSeleccionar(c);
                      setBusqueda("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#e1e1eb] hover:bg-[#15151a]"
                  >
                    {labelCliente(c)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
