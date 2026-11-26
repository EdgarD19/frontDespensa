# 🖨️ Integración de impresión — QZ Tray (POS58/TDR058BT)

Arquitectura: `React → QZ Tray (WebSocket localhost:8182) → spooler/driver Windows → POS58 USB`.

- El **frontend** (React) arma los bytes ESC/POS (`src/services/printer/escpos.js`: 42 columnas FontB, CP850 con `ESC t 2`, corte `GS V 01`).
- **QZ Tray** (Windows) recibe los bytes crudos por WebSocket y los manda al spooler → papel.
- El **backend Java** (Docker) **NO imprime nunca**: solo firma las peticiones de QZ Tray (endpoint `/api/qz/sign`) y sirve los endpoints comerciales. El contenedor no tiene acceso a USB/impresoras ni lo necesita.

## Estado actual (post prueba real ✔)

- ✔ La POS58 ya imprimió vía QZ Tray en Windows (duo).
- ✔ Endpoint `/api/qz/sign` **implementado** en el backend.
- ✔ Encoding CP850 (acentos y ñ correctos).

## Selección de impresora (front)

1. `localStorage.setItem("despensa_qz_printer", "NOMBRE_EXACTO")` — elección manual (máxima prioridad).
2. Si no hay elección: autodetección por tokens: `POS58`, `TDR058`, `POS-Printer`, `thermal`, `termica`, `58`, `receipt`.
3. Si el listado es ambiguo, el front lanza un error con el listado completo para elegir a mano.

## Endpoint de firma (implementado ✔ — referencia)

```
POST /DespensaProyect/api/qz/sign
Content-Type: application/json
Body:   { "toSign": "<cadena que QZ Tray pide firmar (timestamp + hash URL de qz-tray)>" }
Responde: { "firma": "<hex SHA256withRSA>" }
```

Reglas de seguridad vigentes:
1. La clave privada vive **solo por variable de entorno / archivo local del host Windows** — nunca en Git.
2. Exponer solo en la red local de la tienda (no Internet).
3. Límite de tamaño del `toSign` (2048).

## Impresión de prueba (diagnóstico sin venta)

Desde la consola del navegador, con QZ Tray corriendo:

```js
const qz = (await import("/src/services/printer/qz.js")).default;
await qz.connect();
const config = qz.configs.create((await qz.printers.find())[0] ?? "");
await qz.print(config, [{ type: "raw", format: "base64", data: btoa("1B40 1B6101 Venta OK\n") }]);
```

Si el papel no corta o sale basura: el driver POS-Printer puede no aceptar RAW — probar el driver "Genérico / Solo texto" instanciado sobre el puerto USB001 (o verificar con el fabricante). No confirmado por falta de prueba específica: documentar el resultado del duo.

## Transportes retirados

- **WebUSB** fue retirado del proyecto (era experimental y sin uso tras QZ Tray; además el driver de Windows reclamaba el USB y Chrome no podía tomarlo). Si se necesitara reactivar, el código está en el historial de Git (`services/printer/webusb.js`).
