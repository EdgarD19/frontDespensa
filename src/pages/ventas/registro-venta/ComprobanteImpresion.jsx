import { formatMoney, labelCliente } from "./utils";

/** Contenido imprimible (window.print); estilos en index.css `.print-invoice`. */
export default function ComprobanteImpresion({ datos }) {
  if (!datos) return null;
  const { fecha, numero, cliente, lineas, total, montoPagado, cambio, tipo, formaPagoLabel } = datos;

  return (
    <div className="print-invoice hidden print:block print:p-8 print:bg-white print:text-black">
      <div className="max-w-md mx-auto font-sans text-sm text-black">
        <h1 className="text-lg font-bold border-b border-black pb-2 mb-4">Comprobante de venta</h1>
        <p className="mb-1">
          <strong>Fecha:</strong> {fecha}
        </p>
        <p className="mb-1">
          <strong>Nº:</strong> {numero}
        </p>
        <p className="mb-1">
          <strong>Tipo:</strong> {tipo}
        </p>
        {formaPagoLabel ? (
          <p className="mb-1">
            <strong>Pago:</strong> {formaPagoLabel}
          </p>
        ) : null}
        <p className="mb-4">
          <strong>Cliente:</strong> {labelCliente(cliente)}
        </p>
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1">Producto</th>
              <th className="text-right py-1">Cant.</th>
              <th className="text-right py-1">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.productoId} className="border-b border-gray-300">
                <td className="py-1 pr-2">{l.nombre}</td>
                <td className="text-right tabular-nums">{l.cantidad}</td>
                <td className="text-right tabular-nums">{formatMoney(l.precioUnitario * l.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </p>
        <p className="flex justify-between">
          <span>Pagado</span>
          <span>{formatMoney(montoPagado)}</span>
        </p>
        <p className="flex justify-between">
          <span>Cambio</span>
          <span>{formatMoney(cambio)}</span>
        </p>
        <p className="mt-6 text-xs text-gray-600">Estado: pendiente de cierre en caja.</p>
      </div>
    </div>
  );
}
