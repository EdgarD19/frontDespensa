export default function ResumenFactura({ fechaISO, numeroPreview, tipoFactura = "CONTADO" }) {
  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] p-4 space-y-2 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5a5a6e]">Datos de la factura</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <dt className="text-[#5a5a6e] text-xs">Fecha</dt>
          <dd className="text-[#f1f1f3] font-medium">{fechaISO}</dd>
        </div>
        <div>
          <dt className="text-[#5a5a6e] text-xs">Nº factura (previsualización)</dt>
          <dd className="text-[#f1f1f3] font-mono text-xs break-all">{numeroPreview}</dd>
        </div>
        <div>
          <dt className="text-[#5a5a6e] text-xs">Tipo</dt>
          <dd className="text-[#f1f1f3]">{tipoFactura}</dd>
        </div>
        <div>
          <dt className="text-[#5a5a6e] text-xs">Estado al guardar</dt>
          <dd className="text-amber-400/90">Pendiente (cierre en caja)</dd>
        </div>
      </dl>
    </div>
  );
}
