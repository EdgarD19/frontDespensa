#!/bin/bash
# Equivalente macOS/Linux de install-qz-trust.ps1:
# extrae el certificado QZ_CERT de src/services/printer/qzKeys.js y lo instala
# como override.crt donde QZ Tray lo busca, para que no pida permiso por sitio.
#
# Uso:
#   ./scripts/install-qz-trust.sh            (macOS / Linux)
# Opciones:
#   QZ_KEYS   ruta alternativa de qzKeys.js
#   NO_RESTART=1   no reiniciar QZ Tray

set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
KEYS="${QZ_KEYS:-$ROOT_DIR/src/services/printer/qzKeys.js}"
CERT_TMP="$(mktemp /tmp/qz_cert_XXXXXXX.crt)"

# ── Extraer el certificado de qzKeys.js (o usar override.crt de respaldo) ──
if [ -f "$KEYS" ]; then
  awk '/const QZ_CERT = `/{flag=1;next} flag{if(/END CERTIFICATE-----/){print;exit} print}' "$KEYS" > "$CERT_TMP"
elif [ -f "$SCRIPT_DIR/override.crt" ]; then
  cp "$SCRIPT_DIR/override.crt" "$CERT_TMP"
else
  echo "ERROR: no se encontro qzKeys.js ($KEYS) ni override.crt en scripts/." >&2
  exit 1
fi

if ! grep -q "BEGIN CERTIFICATE" "$CERT_TMP"; then
  echo "ERROR: no se pudo extraer un certificado valido." >&2
  exit 1
fi
echo "Certificado extraido: $(wc -l < "$CERT_TMP") lineas."

install_cert() {
  local destino="$1"
  if [ ! -e "$(dirname "$destino")" ]; then
    echo "omitido (no existe): $destino"
    return 1
  fi
  if cp "$CERT_TMP" "$destino" 2>/dev/null; then
    echo "instalado: $destino"
    return 0
  fi
  if sudo cp "$CERT_TMP" "$destino"; then
    echo "instalado (con sudo): $destino"
    return 0
  fi
  echo "ERROR al escribir: $destino (proba con sudo)" >&2
  return 1
}

instalo=0
case "$(uname)" in
  Darwin)
    # QZ Tray.app: junto a qz-tray.jar (equivalente del directorio de
    # instalación de Windows). Requiere sudo: el bundle es de root.
    install_cert "/Applications/QZ Tray.app/Contents/Resources/override.crt" && instalo=1
    # Data dir del usuario en macOS ("~/Library/Application Support/qz").
    install_cert "$HOME/Library/Application Support/qz/override.crt" && instalo=1
    ;;
  Linux)
    for d in "$HOME/.local/share/qz-tray" "/etc/qz-tray"; do
      [ -d "$d" ] || continue
      install_cert "$d/override.crt" && instalo=1
    done
    ;;
esac

if [ "$instalo" -eq 0 ]; then
  echo
  echo "No se encontro ninguna instalacion de QZ Tray en esta maquina."
  echo "Instala QZ Tray primero (https://qztray.com) y vuelve a correr el script."
  rm -f "$CERT_TMP"
  exit 1
fi

rm -f "$CERT_TMP"

# ── Reiniciar QZ Tray para que relea el certificado ──
if [ "${NO_RESTART:-0}" = "1" ]; then
  echo "NO_RESTART=1: recorda reiniciar QZ Tray a mano."
  exit 0
fi

echo "Reiniciando QZ Tray..."
pkill -f qz-tray 2>/dev/null || true
sleep 2
open -a "QZ Tray" 2>/dev/null || echo "Abrí QZ Tray manualmente."

echo "Listo. Recargá la página del POS: el permiso debería quedar aceptado sin preguntar."
