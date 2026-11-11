let printerInstance = null;

async function hayWebUSB() {
  if (typeof navigator === "undefined" || !navigator.usb) return false;
  try {
    const devices = await navigator.usb.getDevices();
    return devices && devices.length > 0;
  } catch (e) {
    console.warn("[PRINTER] Error al obtener dispositivos USB:", e);
    return false;
  }
}

// ¿QZ Tray corriendo y respondiendo en :8182? — intento corto para no frenar
// el arranque si no está instalado. qz-tray se importa SOLO acá (lazy).
async function hayQZ() {
  try {
    const qzModule = await import("./qz");
    const mod = qzModule.default;
    const intento = (async () => {
      await mod.connect();
      return mod;
    })();
    const conTimeout = Promise.race([
      intento,
      new Promise((_, rej) => setTimeout(() => rej(new Error("QZ timeout")), 2500)),
    ]);
    const modConectado = await conTimeout;
    return modConectado;
  } catch (e) {
    console.info("[PRINTER] QZ Tray no disponible:", e?.message || e);
    return null;
  }
}

export async function getPrinter() {
  if (printerInstance) return printerInstance;

  // 1) QZ Tray (impresión silenciosa vía spooler del sistema). Va primero
  // porque en Windows el driver USB (usbprint) es dueño del dispositivo y
  // WebUSB no puede reclamarlo; además QZ ya está instalado y configurado.
  const qzMod = await hayQZ();
  if (qzMod) {
    printerInstance = qzMod;
    console.info("[PRINTER] Modo: QZ Tray (impresión silenciosa)");
    return printerInstance;
  }

  // 2) Impresora USB ya aparejada en el navegador (TDR por cable / WebUSB)
  if (await hayWebUSB()) {
    const mod = await import("./webusb");
    printerInstance = mod.default;
    console.info("[PRINTER] Modo: WebUSB (impresora aparejada)");
    return printerInstance;
  }

  // 3) Sin nada disponible: emulador — console muestra "Texto legible"
  console.info("[PRINTER] Modo: MOCK (emulador de ticket en consola)");
  const mod = await import("./mock");
  printerInstance = mod.default;
  return printerInstance;
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
