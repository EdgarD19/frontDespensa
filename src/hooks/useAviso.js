import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Aviso efímero estándar del proyecto (toast/flash de 4 s).
 * Reemplaza los {aviso, setAviso, avisoTimer, useEffect-cleanup} duplicados
 * en ~8 pantallas. Devuelve el banner fuera de la lógica:
 *
 *   const { aviso, mostrarAviso, limpiarAviso } = useAviso();
 *   mostrarAviso("Guardado ✔");
 *
 * El timer se reinicia con cada aviso nuevo y se limpia al desmontar.
 */
export default function useAviso(margen = 4000) {
  const [aviso, setAviso] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const mostrarAviso = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setAviso(msg);
    timerRef.current = setTimeout(() => setAviso(null), margen);
  }, [margen]);

  const limpiarAviso = useCallback(() => {
    clearTimeout(timerRef.current);
    setAviso(null);
  }, []);

  return { aviso, mostrarAviso, limpiarAviso };
}
