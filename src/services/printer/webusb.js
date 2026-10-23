import { buildVentaEscPos } from "./escpos";

const webusbPrinter = {
  name: "WEBUSB-THERMAL",
  device: null,
  interfaceNumber: null,
  endpointIn: null,
  endpointOut: null,
  connected: false,

  async connect() {
    if (!navigator.usb) {
      throw new Error("WebUSB no soportado en este navegador");
    }
    try {
      this.device = await navigator.usb.requestDevice({ filters: [] });
      await this.device.open();
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }
      const iface = this.device.configuration.interfaces[0];
      this.interfaceNumber = iface.interfaceNumber;
      await this.device.claimInterface(this.interfaceNumber);
      for (const endpoint of iface.alternate.endpoints) {
        if (endpoint.direction === "in") this.endpointIn = endpoint.endpointNumber;
        if (endpoint.direction === "out") this.endpointOut = endpoint.endpointNumber;
      }
      this.connected = true;
      return true;
    } catch (e) {
      console.error("[PRINTER][WEBUSB] Error al conectar:", e);
      throw e;
    }
  },

  async printVenta(datos) {
    if (!this.connected || !this.device) throw new Error("Impresora no conectada");
    const bytes = buildVentaEscPos(datos);
    try {
      await this.device.transferOut(this.endpointOut, bytes);
      return { success: true };
    } catch (e) {
      console.error("[PRINTER][WEBUSB] Error al imprimir:", e);
      throw e;
    }
  },
};

export default webusbPrinter;
