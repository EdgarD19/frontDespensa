import { buildVentaEscPos, escPosToText } from "./escpos";

const mockPrinter = {
  name: "MOCK-THERMAL-PRINTER",
  connected: false,

  async connect() {
    console.log("[PRINTER][MOCK] Conectando impresora térmica (simulada)...");
    await new Promise((r) => setTimeout(r, 300));
    this.connected = true;
    console.log("[PRINTER][MOCK] Conectado exitosamente");
    return true;
  },

  async printVenta(datos) {
    console.log("[PRINTER][MOCK] Iniciando impresión...");
    const bytes = buildVentaEscPos(datos);
    console.log(`[PRINTER][MOCK] Bytes generados: ${bytes.length}`);
    console.log("[PRINTER][MOCK] ESC/POS HEX:", Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" "));
    console.log("[PRINTER][MOCK] Texto legible:\n" + escPosToText(bytes));
    await new Promise((r) => setTimeout(r, 500));
    console.log("[PRINTER][MOCK] Impresión completada");
    return { success: true, bytes };
  },
};

export default mockPrinter;
