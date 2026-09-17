import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Pencil, Power, Check } from "lucide-react";
import {
  getTimbradosProveedor,
  crearTimbrado,
  actualizarTimbrado,
  toggleActivoTimbrado,
  apiErrorMessage,
} from "../../../api/facturasCompraApi";
import { getProveedorId } from "../../../api/proveedoresApi";

const hoyAsuncion = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" });

const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  fieldMono:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
};

const estado = (t) => {
  if (!t.activo) return { label: "Inactivo", cls: "bg-white/10 text-[#8b8b9e]" };
  if (t.esVigente) return { label: "Vigente", cls: "bg-[#22c55e]/15 text-[#22c55e]" };
  if (t.estaVencido) return { label: "Vencido", cls: "bg-red-500/15 text-red-400" };
  return { label: "Pendiente", cls: "bg-white/10 text-[#8b8b9e]" };
};

export default function TimbradosModal({ proveedor, onClose, onCambio }) {
  const idProveedor = proveedor ? getProveedorId(proveedor) : null;

  const [timbrados, setTimbrados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(null); // timbrado en edición | null para nuevo

  const [numero, setNumero] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [activo, setActivo] = useState(true);

  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (idProveedor == null) return;
    setCargando(true);
    try {
      const res = await getTimbradosProveedor(idProveedor, { pageSize: 200 });
      setTimbrados(res?.content || []);
    } catch {
      setTimbrados([]);
    } finally {
      setCargando(false);
    }
  }, [idProveedor]);

  useEffect(() => { cargar(); }, [cargar]);

  const resetForm = () => {
    setEditando(null);
    setNumero("");
    setFechaInicio(hoyAsuncion());
    setFechaVencimiento("");
    setActivo(true);
    setError(null);
  };

  useEffect(() => {
    if (editando) {
      setNumero(editando.numeroTimbrado || "");
      setFechaInicio(editando.fechaInicio || "");
      setFechaVencimiento(editando.fechaVencimiento || "");
      setActivo(editando.activo !== false);
      setError(null);
    }
  }, [editando]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numero.match(/^\d{8}$/)) {
      setError("El número de timbrado debe tener exactamente 8 dígitos.");
      return;
    }
    if (!fechaInicio) { setError("Indicá la fecha de inicio."); return; }
    if (!fechaVencimiento) { setError("Indicá la fecha de vencimiento."); return; }
    if (fechaVencimiento < fechaInicio) {
      setError("La fecha de vencimiento no puede ser anterior a la de inicio.");
      return;
    }
    if (idProveedor == null) { setError("Seleccioná primero un proveedor."); return; }

    const payload = {
      idProveedor,
      numeroTimbrado: numero,
      fechaInicio,
      fechaVencimiento,
      activo,
    };

    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await actualizarTimbrado(editando.idTimbrado, payload);
      } else {
        await crearTimbrado(payload);
      }
      await cargar();
      onCambio();
      resetForm();
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al guardar el timbrado");
    } finally {
      setGuardando(false);
    }
  };

  const handleToggle = async (t) => {
    try {
      await toggleActivoTimbrado(t.idTimbrado, t.activo === false);
      await cargar();
      onCambio();
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cambiar el estado del timbrado");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Timbrados del proveedor</h3>
            <p className="text-sm text-[#5a5a6e]">{proveedor?.nombre || ""}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#5a5a6e] hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-5">
          {/* Lista */}
          <div>
            <p className="mb-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Registrados</p>
            <div className="max-h-[38vh] overflow-y-auto space-y-2 pr-1">
              {cargando ? (
                <p className="text-sm italic text-[#5a5a6e]">Cargando...</p>
              ) : timbrados.length === 0 ? (
                <p className="text-sm italic text-[#5a5a6e]">
                  Este proveedor no tiene timbrados registrados.
                </p>
              ) : (
                timbrados.map((t) => {
                  const st = estado(t);
                  return (
                    <div
                      key={t.idTimbrado}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-white">{t.numeroTimbrado}</p>
                        <p className="text-xs text-[#5a5a6e]">
                          {t.fechaInicio} → {t.fechaVencimiento}
                        </p>
                        <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditando(t)}
                          className="rounded p-1.5 text-[#5a5a6e] hover:bg-white/5 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(t)}
                          className={`rounded p-1.5 transition-colors ${t.activo ? "text-[#22c55e]" : "text-[#5a5a6e]"} hover:bg-white/5`}
                          title={t.activo ? "Desactivar" : "Activar"}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={S.eyebrow}>{editando ? "Editar timbrado" : "Nuevo timbrado"}</p>
              {!editando && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs text-[#5a5a6e] hover:text-white transition-colors"
                >
                  <Plus size={13} /> Limpiar
                </button>
              )}
            </div>

            <div>
              <label className={S.eyebrow} htmlFor="numeroTimbrado">Número *</label>
              <input
                id="numeroTimbrado"
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="12345678"
                className={`${S.fieldMono} mt-1`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={S.eyebrow} htmlFor="fechaInicio">Inicio *</label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className={`${S.field} mt-1`}
                />
              </div>
              <div>
                <label className={S.eyebrow} htmlFor="fechaVencimiento">Vencimiento *</label>
                <input
                  id="fechaVencimiento"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className={`${S.field} mt-1`}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-4 h-4 accent-[#22c55e]"
              />
              Timbrado activo
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
              >
                {guardando ? (
                  "Guardando..."
                ) : (
                  <>
                    {editando ? <Pencil size={15} /> : <Plus size={15} />}
                    {editando ? "Guardar cambios" : "Registrar timbrado"}
                  </>
                )}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white/5 text-white border border-white/10 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <p className="text-xs text-[#5a5a6e]">
            {timbrados.length} timbrado{timbrados.length === 1 ? "" : "s"} · {" "}
            {timbrados.filter((t) => t.esVigente).length} vigente(s)
          </p>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-white border border-white/10 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            <Check size={15} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}