# Solicitud de cambios de back — Ticket de venta (reimpresión)

> Origen: botón "Imprimir ticket" del Historial de ventas (`/ventas/historial`).
> El front ya imprime tickets viejos con `GET /api/facturas-venta/{id}/ticket`
> (funciona hoy); estos son datos extra que mejorarían la fidelidad del
> comprobante reimpreso.

## 1. `TicketDetalleFacturaVentaResponse`: incluir la unidad de medida

### Archivo a modificar
- `src/main/java/com/proyecto2/DespensaProyect/model/response/TicketDetalleFacturaVentaResponse.java`
- `src/main/java/com/proyecto2/DespensaProyect/service/FacturaVentaService.java` (mapeo en `obtenerTicket`)

### Cambio
Agregar `private String unidadMedida;` y completarlo en el builder:

```java
.unidadMedida(det.getProducto() != null && det.getProducto().getUnidad() != null
        ? det.getProducto().getUnidad().getNombre() : null)
```

### Motivo
Sin la unidad, el front no puede saber si la línea es Kilogramo/Litro/Unidad:
los tickets de productos vendidos por kg o L se re-imprimen como "u." y el
sufijo "(KG)"/"(L)" no sale. (El nombre del campo exacto del producto puede
diferir; es la relación con UnidadMedida.)

## 2. (Opcional) Forma de pago y vuelto en `TicketFacturaVentaResponse`

### Cambio
Si la factura registra el cobro (efectivo recibido / transferencia), exponer
`formaPago`, `montoPagado` y `vuelto` (o el desglose efectivo/transferencia)
en el ticket response.

### Motivo
El ticket original imprime "FORMA PAGO", "PAGO:" y "VUELTO:". La reimpresión
actual los omite porque el back no los incluye (la entidad FacturaVenta no
persiste el efectivo recibido; si no se guarda en ninguna tabla, este punto
requeriría ese registro y puede quedar como mejoras futuras).
