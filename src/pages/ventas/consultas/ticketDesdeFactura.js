/**
 * ticketDesdeFactura.js
 * -----------------------------------------------------------------------------
 * Convierte el TicketFacturaVentaResponse del back
 * (GET /api/facturas-venta/{id}/ticket) al formato `datos` que consumen el
 * preview TicketVenta y la impresión física printVenta (POS58), tal
 * como RegistroVenta lo arma al finalizar una venta.
 *
 * Diferencias con el ticket de una venta recién cobrada: en un pago MIXTO el
 * back no expone el desglose efectivo/transferencia; acá se arma con el monto
 * transferido que trae el front.
 *
 * ⚠️ El back (obtenerTicket) cuenta TODA transferencia de la factura, incluso
 * una DESCARTADA o PENDIENTE: si el pago se rechazó (o aún no se recibió),
 * `t.formaPago` dice TRANSFERENCIA/MIXTO. Por eso el consumidor puede pasar
 * `formaPago`/`montoTransferencia` derivados en el front (solo cuentan las
 * RECIBIDAS, ver ventas/common.js y transferenciasVentaApi.js) para pisar lo
 * que informa el back.
 */

export function ticketDesdeFactura(t, { formaPago: formaPagoFront, montoTransferencia } = {}) {
  if (!t) return null;

  const lineas = (Array.isArray(t.detalles) ? t.detalles : []).map((d, i) => {
    const unidad = d.unidadMedida || "";
    return {
      productoId: i + 1,
      nombre: d.nombreProducto || "",
      codigoBarras: d.codigoBarra || "",
      cantidad: Number(d.cantidad) || 0,
      precioUnitario: Number(d.precioUnitario) || 0,
      tasaIva: Number(d.tasaIva ?? 10),
      // Desde el back (TicketDetalleFacturaVentaResponse.unidadMedida): el
      // ticket muestra "(KG)"/"(L)" y cuenta artículos correctamente.
      unidadMedida: unidad,
      productoPesable: /kilo/i.test(unidad) ? "si" : "no",
    };
  });

  const numero = t.numeroFactura || "—";
  const total = Number(t.totalGeneral) || 0;
  // El back ya informa el cobro (desde TransferenciaVenta cuando existe), pero
  // la derivación del front tiene prioridad: ignora transferencias DESCARTADAS.
  const formaPago = (formaPagoFront || String(t.formaPago ?? "")).toUpperCase();
  const montoPagado = t.montoPagado != null ? Number(t.montoPagado) : total;
  // En MIXTO el back no expone el desglose: se arma con el monto transferido
  // real (el resto se cobró en efectivo). El vuelto del back siempre es 0.
  const montoT = Number(montoTransferencia);
  const montoMixto =
    formaPago === "MIXTO" && Number.isFinite(montoT) && montoT > 0
      ? { transferencia: montoT, efectivo: Math.max(0, total - montoT) }
      : null;

  return {
    idComprobante: `${t.idFacturaVenta ?? ""}-${numero}`,
    // fechaCreacion trae hora (LocalDateTime); fechaEmision es solo fecha.
    fecha: t.fechaCreacion || t.fechaEmision || null,
    numero,
    // TicketVenta muestra CI/RUC desde numeroDocumento y el nombre con
    // labelCliente({ nombre, apellido }).
    cliente: t.clienteNombre
      ? { nombre: t.clienteNombre, numeroDocumento: t.clienteDocumento || "" }
      : null,
    lineas,
    total,
    montoPagado,
    cambio: t.vuelto != null ? Number(t.vuelto) : 0,
    tipo: "CONTADO",
    formaPagoLabel: formaPago || null,
    montoMixto,
    timbrado: t.numeroTimbrado ? { numeroTimbrado: t.numeroTimbrado } : null,
    empresaNombreComercial: t.empresaNombreComercial || t.empresaRazonSocial,
    empresaRazonSocial: t.empresaRazonSocial,
    empresaRuc: t.empresaRuc,
    empresaDireccion: t.empresaDireccion,
    empresaTelefono: t.empresaTelefono,
    empresaCiudad: t.empresaCiudad,
    empresaEmail: t.empresaEmail,
    empresaPieTicket: t.empresaPieTicket,
  };
}
