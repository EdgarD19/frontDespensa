let printerInstance = null;

export async function getPrinter() {
  if (printerInstance) return printerInstance;

  if (typeof navigator !== "undefined" && navigator.usb) {
    try {
      const devices = await navigator.usb.getDevices();
      if (devices && devices.length > 0) {
        const mod = await import("./webusb");
        printerInstance = mod.default;
        return printerInstance;
      }
    } catch (e) {
      console.warn("[PRINTER] Error al obtener dispositivos USB:", e);
    }
  }

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
