// Ventas locales (tickets) + Intercambio de ventas — persistencia en el front.
// El backend aún no expone endpoints de ventas (/api/ventas/facturas, buscar tickets),
// por eso se guarda en localStorage. Cuando existan los endpoints, es
// reemplazar estas funciones por llamadas a la API (misma firma).

const VENTAS_KEY = "despensa_ventas_local_v1";
const INTERCAMBIOS_KEY = "despensa_intercambios_venta_v1";

function leer(key) {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function escribir(key, list) {
  localStorage.setItem(key, JSON.stringify(list || []));
}

export function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function pad4(n) {
  return String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(4, "0");
}

/* ───────────── Tickets de venta (historial local) ───────────── */

/** Todas las ventas registradas localmente, más recientes primero. */
export function getVentasLocal() {
  return leer(VENTAS_KEY).slice().sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

/**
 * Guarda una venta confirmada (back OK o modo local) como ticket buscable.
 * venta: { numero, fecha, cliente, lineas[], total, montoPagado, cambio, formaPago, sincronizado }
 */
export function guardarVentaLocal(venta) {
  const list = leer(VENTAS_KEY);
  const registro = {
    id: nuevoId(),
    numero: venta?.numero ?? null,
    fecha: venta?.fecha ?? new Date().toISOString(),
    cliente: venta?.cliente ?? "Sin nombre",
    lineas: Array.isArray(venta?.lineas) ? venta.lineas : [],
    total: Number(venta?.total) || 0,
    montoPagado: Number(venta?.montoPagado) || 0,
    cambio: Number(venta?.cambio) || 0,
    formaPago: venta?.formaPago ?? "",
    formaPagoLabel: venta?.formaPagoLabel ?? "",
    sincronizado: Boolean(venta?.sincronizado),
  };
  list.push(registro);
  escribir(VENTAS_KEY, list);
  return registro;
}

/**
 * Busca tickets por número (también escaneado sin guiones), cliente o fecha.
 * Sin consulta devuelve los más recientes.
 */
export function buscarTicketsLocal(consulta = "", limite = 25) {
  const q = String(consulta || "").trim().toLowerCase();
  const qDigitos = q.replace(/\D/g, "");
  const list = getVentasLocal();
  if (!q) return list.slice(0, limite);

  const encontrados = list.filter((t) => {
    const numero = String(t.numero || "").toLowerCase();
    const cliente = String(t.cliente || "").toLowerCase();
    const fecha = String(t.fecha || "").slice(0, 10);
    if (numero.includes(q) || cliente.includes(q) || fecha.includes(q)) return true;
    // Escáner de código de barras: suele llegar solo numérico, sin guiones.
    if (qDigitos && numero.replace(/\D/g, "").includes(qDigitos)) return true;
    return false;
  });
  return encontrados.slice(0, limite);
}

/** Un ticket por id (para revalidar antes de registrar el intercambio). */
export function getTicketLocal(id) {
  return leer(VENTAS_KEY).find((t) => t.id === id) ?? null;
}

/* ───────────── Intercambio homogéneo de ventas ───────────── */

/** Todos los intercambios registrados, más recientes primero. */
export function getInterCambiosVenta() {
  return leer(INTERCAMBIOS_KEY)
    .slice()
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

/**
 * Registra un intercambio: 1 unidad del mismo producto entra y sale,
 * diferencia financiera ₲ 0. Devuelve el registro con su número y el efecto
 * sobre el stock (dato interno; el stock se ajusta directo al sincronizar).
 *
 * datos: { ticketId, ticketNumero, cliente, idProducto, producto, cantidad,
 *          precioUnitario, motivo, motivoLabel, destino, destinoLabel, fecha }
 */
export function crearIntercambioVenta(datos) {
  const list = leer(INTERCAMBIOS_KEY);
  const cantidad = Math.max(0, Number(datos?.cantidad) || 1);
  const esKG = datos?.unidadMedida === "KG";
  const registro = {
    id: nuevoId(),
    numero: `IC-${pad4(list.length + 1)}`,
    fecha: datos?.fecha ?? new Date().toISOString(),
    ticketId: datos?.ticketId ?? null,
    ticketNumero: datos?.ticketNumero ?? null,
    cliente: datos?.cliente ?? "Sin nombre",
    idProducto: datos?.idProducto ?? null,
    producto: datos?.producto ?? "—",
    cantidad,
    unidadMedida: datos?.unidadMedida === "KG" ? "KG" : "UN",
    precioUnitario: Number(datos?.precioUnitario) || 0,
    motivo: datos?.motivo ?? "",
    motivoLabel: datos?.motivoLabel ?? "",
    destino: datos?.destino ?? "",
    destinoLabel: datos?.destinoLabel ?? "",
    diferencia: 0,
    sincronizado: false,
    // Efecto sobre el stock (dato interno): sale la unidad nueva y reingresa la
    // devuelta con la condición elegida (merma → pérdidas / inventario → reponedor).
    movimientos: [
      {
        tipo: "SALIDA",
        cantidad,
        detalle: esKG
          ? `Sale ${cantidad} kg del stock vendible`
          : `Sale ${cantidad} u. nueva${cantidad === 1 ? "" : "s"} del stock vendible`,
      },
      {
        tipo: "ENTRADA",
        cantidad,
        detalle:
          datos?.destino === "MERMA"
            ? esKG
              ? `Entra ${cantidad} kg devueltos → merma / defectuoso (pérdidas o proveedor)`
              : `Entra ${cantidad} u. devuelta${cantidad === 1 ? "" : "s"} → merma / defectuoso (pérdidas o proveedor)`
            : esKG
              ? `Entra ${cantidad} kg devueltos → al inventario`
              : `Entra ${cantidad} u. devuelta${cantidad === 1 ? "" : "s"} → al inventario`,
      },
    ],
  };
  list.push(registro);
  escribir(INTERCAMBIOS_KEY, list);
  return registro;
}
