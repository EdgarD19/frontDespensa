import { buildVentaEscPos } from "./escpos";
import qz from "qz-tray";
import { QZ_CERT, firmarPeticion } from "./qzKeys";

/**
 * Impresor por QZ Tray (Windows/macOS/Linux) — impresión SILENCIOSA.
 *
 * Requisitos en la máquina de cobro:
 *   1. QZ Tray instalado y corriendo (icono en bandeja).
 *   2. La TDR058BT visible para el sistema (Windows: driver "POS-Printer"
 *      del manual, USB o BT-SPP; macOS: por cable USB en CUPS).
 *   3. Primer uso: QZ Tray pide "Confiar" en el cert DespensaPOS — botón
 *      "Siempre permitir esta página".
 *
 * Selección de impresora: localStorage "despensa_qz_printer".
 * Si no hay elección guardada, busca la que matchee /TDR|POS|thermal|58/i;
 * si hay una sola impresora instalada, la usa directamente.
 */

let conectado = false;

const PRINTER_MATCH = /tdr|pos|thermal|termica|t[eé]rmica|58|receipt/i;

function bytesABase64(bytes) {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

async function elegirImpresora() {
  const guardada = localStorage.getItem("despensa_qz_printer");
  if (guardada) return guardada;

  const impresoras = await qz.printers.find();
  const lista = Array.isArray(impresoras) ? impresoras : [impresoras].filter(Boolean);

  const match = lista.find((p) => PRINTER_MATCH.test(String(p)));
  if (match) {
    localStorage.setItem("despensa_qz_printer", match);
    return match;
  }
  if (lista.length === 1) {
    localStorage.setItem("despensa_qz_printer", lista[0]);
    return lista[0];
  }
  throw new Error(
    "No se pudo elegir la impresora automática. Opciones instaladas: " + lista.join(" | ")
  );
}

export default {
  name: "QZ-TRAY",
  connected: false,

  async connect() {
    // qz-tray: configurar la firma con nuestro par de llaves ANTES de conectar.
    qz.security.setCertificatePromise((resolve) => resolve(QZ_CERT));
    qz.security.setSignaturePromise((toSign) => (resolve) => resolve(firmarPeticion(toSign)));

    await qz.websocket.connect({ keepAlive: true });
    conectado = true;
  },

  async printVenta(datos) {
    if (!conectado) {
      await this.connect();
    }
    const impresora = await elegirImpresora();
    const base64 = bytesABase64(buildVentaEscPos(datos));
    const config = qz.config.create(impresora);
    await qz.print(config, [{ type: "raw", format: "base64", data: base64 }]);
    return { success: true };
  },
};
