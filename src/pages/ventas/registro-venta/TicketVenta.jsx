import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { formatMoney, labelCliente, esProductoPesable } from "./utils";

export default function TicketVenta({ datos, onCerrar }) {
  const [status, setStatus] = useState("printing");
  const [printKey] = useState(0);
  const timerRef = useRef(null);

  const {
    fecha,
    numero,
    cliente,
    lineas = [],
    total,
    montoPagado,
    cambio,
    formaPagoLabel,
    timbrado,
  } = datos || {};

  useEffect(() => {
    if (status === "completed") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus((s) => (s === "printing" ? "completed" : s));
    }, 2400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        if (onCerrar) onCerrar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCerrar]);

  const fmtFecha = (valor) => {
    if (!valor) return "—";
    // Fechas sin hora (LocalDate del back) se parsean como medianoche LOCAL:
    // si se usan como UTC, en zonas UTC-3 la pantalla retrocede un día.
    // Sin hora se muestra solo la fecha.
    const s = String(valor);
    const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(s);
    const d = esSoloFecha ? new Date(s + "T00:00:00") : new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const opciones = esSoloFecha
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        };
    return d.toLocaleDateString("es-PY", opciones);
  };

  const getNombre = (l) => l.nombre || l.nombreProducto || `Producto #${l.productoId}`;
  const getCantidad = (l) => Number(l.cantidad) || 0;
  const getPU = (l) => Number(l.precioUnitario) || 0;
  const getCodigo = (l) => l.codigoBarras || l.codigo || l.codigoBarra || "—";
  const isPesable = (l) => esProductoPesable(l);
  // Monto compacto para la tabla de productos: Gs necesitan 2 decimales salvo pesables.
  const montoCorto = (v) => {
    const num = Number(v) || 0;
    const esEntero = Math.abs(num % 1) < 0.005;
    return num.toLocaleString("es-PY", { minimumFractionDigits: esEntero ? 0 : 2, maximumFractionDigits: 2 });
  };
  const comercio = datos?.empresaNombreComercial || datos?.nombreComercial || "Despensa Sandra y Carlos";

  const isPrinting = status === "printing";
  const isCompleted = status === "completed";

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center py-4">
        <div className="relative flex max-h-[90vh] w-full max-w-[380px] flex-col items-center overflow-y-auto">

        <div className="relative flex min-h-0 w-full flex-col items-center">
          <div className="relative z-20 w-full shrink-0 rounded-2xl border border-[#1F1F1F] bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0B0B0B] p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#1F1F1F] pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md border border-[#1F1F1F] bg-[#0E0E0E] text-[#A1A1A1]">
                  <Printer className="h-3 w-3" />
                </div>
                <span className="font-mono text-[11px] font-medium tracking-tight text-[#FAFAFA]">POS-TICKET</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isPrinting ? "animate-ping bg-amber-400" : "bg-emerald-400"}`} />
                <span className="font-mono text-[10px] text-[#6B6B6B]">{isPrinting ? "IMPRIMIENDO" : "LISTO"}</span>
              </div>
              <div className="flex h-5 justify-end">
                {isCompleted && (
                  <button type="button" onClick={onCerrar} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-black transition-all hover:bg-white/90">
                    Nueva compra
                  </button>
                )}
              </div>
            </div>
            <div className="relative flex h-3 w-full items-center justify-center overflow-hidden rounded-full border border-[#1F1F1F] bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              <div className="h-[1px] w-3/4 bg-gradient-to-r from-transparent via-[#1F1F1F] to-transparent" />
            </div>
          </div>

          <div className="relative -mt-1.5 z-10 flex w-full shrink-0 justify-center pb-4 pt-1">
            <div
              key={printKey}
              className="relative w-[92%] rounded-b-md border border-[#E2E2E0] bg-[#F9F9F8] px-5 pb-6 pt-5 font-mono text-[#111111] shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-transform duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: status === "printing" ? "translateY(-100%)" : "translateY(0%)" }}
            >
              <div className="absolute -top-1.5 inset-x-0 h-1.5 overflow-hidden flex">
                <svg className="h-1.5 w-full text-[#F9F9F8]" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <polygon fill="currentColor" points="0,10 5,0 10,10 15,0 20,10 25,0 30,10 35,0 40,10 45,0 50,10 55,0 60,10 65,0 70,10 75,0 80,10 85,0 90,10 95,0 100,10" />
                </svg>
              </div>

              <div className="absolute -left-2 top-28 h-3.5 w-3.5 rounded-full bg-[#050505]" />
              <div className="absolute -right-2 top-28 h-3.5 w-3.5 rounded-full bg-[#050505]" />

              <div className="border-b border-dashed border-current/25 pb-3">
                <p className="text-center text-xs font-bold uppercase tracking-wider">{comercio}</p>
                <div className="mt-1.5 space-y-0.5 text-center text-[9px] opacity-70">
                  {(datos?.empresaRuc || datos?.ruc || datos?.empresaTelefono || datos?.telefono) && (() => {
                    const ruc = datos?.empresaRuc || datos?.ruc;
                    const tel = datos?.empresaTelefono || datos?.telefono;
                    return (
                      <p>
                        {ruc && `RUC: ${ruc}`}
                        {ruc && tel && " "}
                        {tel && `Tel: ${tel}`}
                      </p>
                    );
                  })()}
                  {(datos?.empresaDireccion || datos?.direccion) && <p>{datos?.empresaDireccion || datos?.direccion}</p>}
                  {(timbrado?.numeroTimbrado || timbrado?.fechaInicio || timbrado?.fechaVencimiento) && (
                    <p className="font-semibold">TIMBRADO: {timbrado?.numeroTimbrado || "—"}</p>
                  )}
                  {(timbrado?.fechaInicio || timbrado?.fechaVencimiento) && (
                    <p>VIGENCIA: {fmtFecha(timbrado?.fechaInicio) || "—"} AL {fmtFecha(timbrado?.fechaVencimiento) || "—"}</p>
                  )}
                  {formaPagoLabel && <p>FORMA PAGO: {String(formaPagoLabel).toUpperCase()}</p>}
                  <p>FACTURA CONTADO: {numero || "—"}</p>
                  <p>FECHA Y HORA VENTA: {fmtFecha(fecha)}</p>
                </div>
              </div>

              <div className="space-y-0.5 border-b border-dashed border-current/25 py-2 text-[10px]">
                {(() => {
                  const doc = cliente ? String(cliente.numeroDocumento ?? cliente.documentNumber ?? cliente.document_number ?? cliente.ruc ?? "").trim() : "";
                  return (
                    <>
                      {doc && <p>CI / RUC: {doc}</p>}
                      <p className="truncate">CLIENTE: {(cliente && labelCliente(cliente)) || "Sin Nombre"}</p>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-2 border-b border-dashed border-current/25 py-3">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="uppercase opacity-60">
                      <th className="w-[46px] text-left font-bold">Cod.</th>
                      <th className="text-left font-bold">Descrip.</th>
                      <th className="w-[26px] text-right font-bold">Cant.</th>
                      <th className="w-[38px] text-left font-bold">Prec.</th>
                      <th className="w-[26px] text-right font-bold">IVA</th>
                      <th className="w-[50px] text-left font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, idx) => {
                      const cant = getCantidad(l);
                      const pu = getPU(l);
                      const sub = cant * pu;
                      const tasa = Number(l.iva ?? l.tasaIva ?? 10);
                      const ivaTxt = tasa === 0 ? "—" : `${tasa}%`;
                      return (
                        <tr key={l.productoId ?? idx}>
                          <td className="pr-1 align-top">
                            <span className="block truncate" title={String(getCodigo(l))}>{getCodigo(l)}</span>
                          </td>
                          <td className="align-top">
                            <span className="block truncate" title={getNombre(l)}>{getNombre(l)}{isPesable(l) && " (KG)"}</span>
                          </td>
                          <td className="text-right align-top">{cant.toLocaleString("es-PY", { maximumFractionDigits: 3 })}</td>
                          <td className="pl-1 text-left align-top">{montoCorto(pu)}</td>
                          <td className="text-right align-top">{ivaTxt}</td>
                          <td className="pl-1 text-left align-top font-semibold">{montoCorto(sub)}</td>
                        </tr>
                      );
                    })}
                    {lineas.length === 0 && (
                      <tr><td colSpan={6} className="text-center opacity-50">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 border-b border-dashed border-current/25 py-2.5 text-[10px]">
                <div className="flex justify-between items-baseline border-t border-current/15 pt-1 text-xs font-bold">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-sm">{formatMoney(total)}</span>
                </div>
                {montoPagado != null && (
                  <div className="flex justify-between opacity-70">
                    <span>{formaPagoLabel ? `PAGO ${String(formaPagoLabel).toUpperCase()}:` : "RECIBIDO:"}</span>
                    <span>{formatMoney(montoPagado)}</span>
                  </div>
                )}
                {montoPagado != null && (
                  <div className="flex justify-between opacity-70">
                    <span>VUELTO:</span>
                    <span>{formatMoney(cambio || 0)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-0.5 py-2 text-[10px]">
                {(() => {
                  // Desglose de IVA por tasa, replicando CalculoIvaUtil del back
                  const r2 = (n) => Math.round(n * 100) / 100;
                  let iva5 = 0;
                  let iva10 = 0;
                  for (const l of lineas) {
                    const cant = getCantidad(l);
                    const pu = getPU(l);
                    const t = Number(l.iva ?? l.tasaIva ?? 10);
                    if (t === 0) continue;
                    const base = r2(r2(pu / (1 + t / 100)) * cant);
                    const iva = r2((base * t) / 100);
                    if (t === 5) iva5 += iva;
                    else iva10 += iva;
                  }
                  iva5 = r2(iva5);
                  iva10 = r2(iva10);
                  const totalIva = r2(iva5 + iva10);
                  return (
                    <>
                      <div className="flex justify-between opacity-70"><span>IVA 5%:</span><span>{formatMoney(iva5)}</span></div>
                      <div className="flex justify-between opacity-70"><span>IVA 10%:</span><span>{formatMoney(iva10)}</span></div>
                      <div className="flex justify-between font-semibold"><span>TOTAL IVA:</span><span>{formatMoney(totalIva)}</span></div>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-0.5 border-y border-dashed border-current/25 py-2 text-[10px]">
                {(() => {
                  // Gravadas / Exentas: montos con IVA incluido por tasa (liq. DNIT)
                  const r2 = (n) => Math.round(n * 100) / 100;
                  let g5 = 0;
                  let g10 = 0;
                  let ex = 0;
                  for (const l of lineas) {
                    const cant = getCantidad(l);
                    const pu = getPU(l);
                    const t = Number(l.iva ?? l.tasaIva ?? 10);
                    const monto = r2(pu * cant);
                    if (t === 0) ex += monto;
                    else if (t === 5) g5 += monto;
                    else g10 += monto;
                  }
                  return (
                    <>
                      <div className="flex justify-between opacity-70"><span>GRAVADAS 5%:</span><span>{formatMoney(r2(g5))}</span></div>
                      <div className="flex justify-between opacity-70"><span>GRAVADAS 10%:</span><span>{formatMoney(r2(g10))}</span></div>
                      <div className="flex justify-between opacity-70"><span>EXENTAS:</span><span>{formatMoney(r2(ex))}</span></div>
                    </>
                  );
                })()}
              </div>

              <div className="pb-1 pt-3 text-center">
                <p className="font-medium whitespace-pre-line">{datos?.empresaPieTicket || datos?.pieTicket || "¡GRACIAS POR SU COMPRA!"}</p>
                {!datos?.empresaPieTicket && !datos?.pieTicket && <p className="mt-0.5 text-[8px] opacity-50">Vuelva pronto</p>}
              </div>

              <div className="absolute -bottom-1.5 inset-x-0 h-1.5 overflow-hidden flex translate-y-full">
                <svg className="h-1.5 w-full text-[#F9F9F8]" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <polygon fill="currentColor" points="0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
