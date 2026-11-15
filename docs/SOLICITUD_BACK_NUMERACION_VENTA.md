# Solicitud de back — numeración autorizada de facturas de venta

Estado: **pendiente de implementación en el back**.  
Mientras no exista, el front mantiene la configuración actual en `localStorage`
(`despensa_timbrados_venta_extras_v1`) y **no** la presenta como si controlara la numeración real.

## 1. Situación actual

- El back ya tiene un singleton `ConfiguracionFacturaVenta`
  (`configuracion_factura_venta`, id = 1) con:
  - `establecimiento` (3 dígitos)
  - `puntoExpedicion` (3 dígitos)
  - `fechaActualizacion`
- Endpoint existente:
  - `GET /api/configuracion-venta`
  - `PUT /api/configuracion-venta`
- La numeración real se genera en `FacturaVentaService.generarNumeroFactura()`:
  - toma el prefijo `AAA-AAA-`
  - busca el **máximo número existente** con ese prefijo y suma 1.
- No existen en el back:
  - rango autorizado (`numeroDesde` / `numeroHasta`)
  - último número emitido
  - validación de agotamiento del rango

Consecuencia: la pantalla de Comprobantes del front guarda rango y “último emitido”
solo en el navegador; no afectan la factura que emite el back.

## 2. Cambios solicitados

### 2.1 Modelo de datos

Extender `ConfiguracionFacturaVenta` (o crear una entidad equivalente) con:

| Campo | Tipo | Regla |
|---|---|---|
| `numeroDesde` | entero | `>= 1` |
| `numeroHasta` | entero | `>= numeroDesde` |
| `ultimoEmitido` | entero | `>= 0`; nunca menor a `numeroDesde - 1` |
| `fechaActualizacion` | timestamp | ya existe |

Notas:
- El proyecto usa `spring.jpa.hibernate.ddl-auto=update`; las columnas se crean
  automáticamente, pero hace falta **backfill** de datos existentes.
- Backfill sugerido: `ultimoEmitido = max(secuencia de facturas existentes del prefijo)`
  y un rango por defecto configurable (por ejemplo `1..9999999`).

### 2.2 API

`GET /api/configuracion-venta` debe devolver, además de lo actual:

```json
{
  "establecimiento": "001",
  "puntoExpedicion": "001",
  "prefijo": "001-001-",
  "numeroDesde": 1,
  "numeroHasta": 500,
  "ultimoEmitido": 37,
  "proximoNumero": 38,
  "restantes": 463,
  "ejemploNumero": "001-001-0000038",
  "fechaActualizacion": "2026-11-14T10:00:00"
}
```

`PUT /api/configuracion-venta` debe aceptar:

```json
{
  "establecimiento": "001",
  "puntoExpedicion": "001",
  "numeroDesde": 1,
  "numeroHasta": 500
}
```

Reglas de actualización:
- `establecimiento` y `puntoExpedicion`: 3 dígitos, obligatorios.
- `numeroDesde >= 1`, `numeroHasta >= numeroDesde`.
- No permitir `numeroHasta < ultimoEmitido` (ya se emitieron comprobantes).
- No permitir bajar `numeroDesde` por debajo de `ultimoEmitido + 1`
  (evita reutilizar números).
- Si se cambia el rango porque DNIT autorizó uno nuevo, permitir actualizarlo
  aunque el anterior esté agotado.
- Responder `409` con mensaje claro si el rango está agotado o la actualización
  es inválida.

### 2.3 Generación del número

Reemplazar en `FacturaVentaService.generarNumeroFactura()`:

- `max(numeroFactura) + 1`

por:

1. leer la configuración con bloqueo pesimista
   (`SELECT ... FOR UPDATE` sobre el singleton),
2. validar `ultimoEmitido < numeroHasta` (si no, `409 RANGO_NUMERACION_AGOTADO`),
3. calcular `siguiente = max(ultimoEmitido + 1, numeroDesde)`,
4. generar `prefijo + %07d`,
5. actualizar `ultimoEmitido = siguiente` en la misma transacción,
6. guardar la factura.

Requisitos:
- **Atomicidad**: dos cajas no pueden obtener el mismo número.
- Mantener la verificación de unicidad (`existsByNumeroFactura`) como red de seguridad.
- Si la factura falla después de reservar el número, el `ultimoEmitido` debe
  revertirse con la transacción (misma transacción, sin `REQUIRES_NEW`).
- Documentar si la numeración es **global por prefijo** (comportamiento actual)
  o **por timbrado**. Si DNIT exige por timbrado, el rango debe colgar del
  `TimbradoVenta` y no del singleton.

### 2.4 Errores esperados

| Código | Situación |
|---|---|
| `400 CONFIGURACION_NUMERACION_INVALIDA` | rango inválido |
| `409 RANGO_NUMERACION_AGOTADO` | `ultimoEmitido >= numeroHasta` |
| `409 NUMERO_FACTURA_DUPLICADO` | colisión inesperada |

Con mensajes en español listos para mostrar en el front.

## 3. Impacto en el front (cuando el back esté listo)

- `ComprobantesConfig` deja de leer/escribir `despensa_timbrados_venta_extras_v1`.
- Establecimiento, punto, rango y último emitido pasan a `GET/PUT /api/configuracion-venta`.
- Se elimina la validación local de rango y se muestra `proximoNumero` / `restantes`
  que devuelve el back.
- El front sigue sin imprimir ni calcular números: solo muestra/edita la configuración.

## 4. Criterios de aceptación

1. `GET /api/configuracion-venta` devuelve rango y último emitido.
2. `PUT` rechaza rangos inválidos y no permite reutilizar números ya emitidos.
3. Emitir una venta incrementa `ultimoEmitido` exactamente en 1.
4. Dos requests concurrentes de venta obtienen números distintos.
5. Al llegar a `numeroHasta`, la siguiente venta devuelve `409` con mensaje claro.
6. Reiniciar el back no reinicia el correlativo.
7. Borrar el `localStorage` del navegador no afecta la numeración.
