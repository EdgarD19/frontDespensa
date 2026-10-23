import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { formatMoney, labelCliente, docCliente, esProductoPesable } from "./utils";

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

  // handleReplay disponible si se requiere en el futuro

  const fmtFecha = (valor) => {
    if (!valor) return "—";
    try {
      const d = new Date(String(valor) + "T00:00:00");
      if (Number.isNaN(d.getTime())) return String(valor);
      return d.toLocaleDateString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(valor);
    }
  };

  const getNombre = (l) => l.nombre || l.nombreProducto || `Producto #${l.productoId}`;
  const getCantidad = (l) => Number(l.cantidad) || 0;
  const getPU = (l) => Number(l.precioUnitario) || 0;
  const isPesable = (l) => esProductoPesable(l);
  const comercio = "Despensa Sandra y Carlos";

  const isPrinting = status === "printing";
  const isCompleted = status === "completed";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-[380px] flex-col items-center overflow-y-auto">

        <div className="relative flex w-full flex-col items-center">
          <div className="relative z-20 w-full rounded-2xl border border-[#1F1F1F] bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0B0B0B] p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="mb-2 flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md border border-[#1F1F1F] bg-[#0E0E0E] text-[#A1A1A1]">
                  <Printer className="h-3 w-3" />
                </div>
                <span className="font-mono text-[11px] font-medium tracking-tight text-[#FAFAFA]">POS-TICKET</span>
              </div>
              <div className="flex items-center gap-2">
                {isCompleted && (
                  <button type="button" onClick={onCerrar} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-black transition-all hover:bg-white/90">
                    Nueva compra
                  </button>
                )}
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isPrinting ? "animate-ping bg-amber-400" : "bg-emerald-400"}`} />
                  <span className="font-mono text-[10px] text-[#6B6B6B]">{isPrinting ? "IMPRIMIENDO" : "LISTO"}</span>
                </div>
              </div>
            </div>
            <div className="relative flex h-3 w-full items-center justify-center overflow-hidden rounded-full border border-[#1F1F1F] bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              <div className="h-[1px] w-3/4 bg-gradient-to-r from-transparent via-[#1F1F1F] to-transparent" />
            </div>
          </div>

          <div className="relative -mt-1.5 z-10 flex w-full justify-center overflow-hidden pb-4 pt-1">
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

              <div className="border-b border-dashed border-current/25 pb-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider">{comercio}</p>
                <p className="mt-0.5 text-[9px] opacity-60">COMPROBANTE DE VENTA</p>
              </div>

              <div className="space-y-1 border-b border-dashed border-current/25 py-2.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="opacity-60">TICKET Nº:</span>
                  <span className="font-semibold">{numero || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">FECHA:</span>
                  <span>{fmtFecha(fecha)}</span>
                </div>
                {timbrado?.numeroTimbrado && (
                  <div className="flex justify-between">
                    <span className="opacity-60">TIMBRADO:</span>
                    <span>{timbrado.numeroTimbrado}</span>
                  </div>
                )}
                {formaPagoLabel && (
                  <div className="flex justify-between">
                    <span className="opacity-60">FORMA PAGO:</span>
                    <span>{formaPagoLabel}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="opacity-60">CLIENTE:</span>
                  <span className="max-w-[60%] truncate text-right">{labelCliente(cliente)}</span>
                </div>
                {docCliente(cliente) && (
                  <div className="flex justify-between">
                    <span className="opacity-60">DOC:</span>
                    <span>{docCliente(cliente)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-b border-dashed border-current/25 py-3">
                <div className="flex justify-between text-[9px] font-bold uppercase opacity-60">
                  <span>ITEM</span>
                  <span>IMPORTE</span>
                </div>
                {lineas.map((l, idx) => {
                  const cant = getCantidad(l);
                  const pu = getPU(l);
                  const sub = cant * pu;
                  return (
                    <div key={l.productoId ?? idx} className="space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2 text-[10px]">
                        <span className="truncate font-medium">
                          {cant > 1 ? `${cant.toLocaleString("es-PY", { maximumFractionDigits: 3 })}x ` : ""}
                          {getNombre(l)}
                          {isPesable(l) && " (KG)"}
                        </span>
                        <span className="shrink-0 font-semibold">{formatMoney(sub)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] opacity-60">
                        <span>P.U: {formatMoney(pu)} {isPesable(l) ? "/kg" : "/u."}</span>
                      </div>
                    </div>
                  );
                })}
                {lineas.length === 0 && <p className="text-center text-[10px] opacity-50">Sin productos</p>}
              </div>

              <div className="space-y-1 border-b border-dashed border-current/25 py-2.5 text-[10px]">
                <div className="flex justify-between items-baseline border-t border-current/15 pt-1 text-xs font-bold">
                  <span>TOTAL:</span>
                  <span className="text-sm">{formatMoney(total)}</span>
                </div>
                {montoPagado != null && (
                  <div className="flex justify-between opacity-70">
                    <span>RECIBIDO:</span>
                    <span>{formatMoney(montoPagado)}</span>
                  </div>
                )}
                {cambio != null && cambio > 0 && (
                  <div className="flex justify-between opacity-70">
                    <span>VUELTO:</span>
                    <span>{formatMoney(cambio)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center pb-1 pt-3">
                <div className="h-7 w-full max-w-[200px] opacity-80">
                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 160 40" fill="currentColor">
                    <rect x="0" y="0" width="3" height="40" />
                    <rect x="5" y="0" width="1.5" height="40" />
                    <rect x="9" y="0" width="4" height="40" />
                    <rect x="15" y="0" width="2" height="40" />
                    <rect x="19" y="0" width="1" height="40" />
                    <rect x="22" y="0" width="3" height="40" />
                    <rect x="27" y="0" width="1.5" height="40" />
                    <rect x="31" y="0" width="5" height="40" />
                    <rect x="38" y="0" width="2" height="40" />
                    <rect x="42" y="0" width="1" height="40" />
                    <rect x="45" y="0" width="4" height="40" />
                    <rect x="51" y="0" width="2" height="40" />
                    <rect x="55" y="0" width="1.5" height="40" />
                    <rect x="58" y="0" width="3" height="40" />
                    <rect x="63" y="0" width="5" height="40" />
                    <rect x="70" y="0" width="1.5" height="40" />
                    <rect x="73" y="0" width="3" height="40" />
                    <rect x="78" y="0" width="2" height="40" />
                    <rect x="82" y="0" width="4" height="40" />
                    <rect x="88" y="0" width="1.5" height="40" />
                    <rect x="92" y="0" width="3" height="40" />
                    <rect x="97" y="0" width="1" height="40" />
                    <rect x="100" y="0" width="4" height="40" />
                    <rect x="106" y="0" width="2" height="40" />
                    <rect x="110" y="0" width="3" height="40" />
                    <rect x="115" y="0" width="1.5" height="40" />
                    <rect x="118" y="0" width="5" height="40" />
                    <rect x="125" y="0" width="2" height="40" />
                    <rect x="129" y="0" width="1" height="40" />
                    <rect x="132" y="0" width="4" height="40" />
                    <rect x="138" y="0" width="2" height="40" />
                    <rect x="142" y="0" width="1.5" height="40" />
                    <rect x="145" y="0" width="3" height="40" />
                    <rect x="150" y="0" width="2" height="40" />
                    <rect x="154" y="0" width="4" height="40" />
                    <rect x="159" y="0" width="1" height="40" />
                  </svg>
                </div>
                <span className="mt-1 font-mono text-[8px] tracking-widest opacity-60">*{numero ? String(numero).replace(/\D/g, "") : "000000"}*</span>
              </div>

              <div className="pt-2 text-center text-[9px] opacity-70">
                <p className="font-medium">¡Gracias por su compra!</p>
                <p className="mt-0.5 text-[8px] opacity-50">Vuelva pronto</p>
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
  );
}
