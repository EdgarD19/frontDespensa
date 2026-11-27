let printerInstance = null;

// ¿QZ Tray corriendo y respondiendo en :8182?
// Sin timeout corto a propósito: si QZ Tray está corriendo, la conexión
// WebSocket es instantánea (fail-fast si no está: conexión rechazada).
// Lo único que puede demorar es el DIÁLOGO de confianza de QZ Tray ("Permitir
// siempre") — ese espera al usuario, no al reloj: si lo cortamos a los 2,5 s
// la impresión cae a MOCK y el permiso quedaba a medias.
async function hayQZ() {
  try {
    const qzModule = await import("./qz");
    const mod = qzModule.default;
    await mod.connect();
    return mod;
  } catch (e) {
    console.info("[PRINTER] QZ Tray no disponible:", e?.message || e);
    return null;
  }
}

export async function estadoImpresora() {
  const qzMod = await hayQZ();
  if (qzMod && typeof qzMod.estado === "function") {
    const estado = await qzMod.estado();
    return { ...estado, modo: "QZ-TRAY" };
  }
  return { qzConectado: false, impresora: null, impresoras: [] };
}

export async function getPrinter() {
  if (printerInstance) return printerInstance;

  // Impresión silenciosa vía QZ Tray (spooler del sistema). Sin QZ no hay
  // fallback: el error se muestra en el ticket con el mensaje claro.
  const qzMod = await hayQZ();
  if (qzMod) {
    printerInstance = qzMod;
    console.info("[PRINTER] Modo: QZ Tray (impresión silenciosa)");
    return printerInstance;
  }
  throw new Error(
    "Impresora no conectada: QZ Tray no está corriendo (ícono en la bandeja del sistema)."
  );
}

export async function connectPrinter() {
  const printer = await getPrinter();
  if (typeof printer.connect === "function") {
    return printer.connect();
  }
  return true;
}

export async function printVenta(datos) {
  const printer = await getPrinter();
  if (typeof printer.printVenta === "function") {
    return printer.printVenta(datos);
  }
  throw new Error("Impresora no disponible");
}

export function isPrinterConnected() {
  return printerInstance?.connected || false;
}
