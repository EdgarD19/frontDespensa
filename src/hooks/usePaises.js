import { useCallback, useEffect, useState } from "react";
import { getPaises } from "../api/maestrosApi";

/**
 * Lista de países compartida para los selects de los ABMs que la necesitan
 * (Clientes, Proveedores). Cache de módulo con TTL: evita que cada pantalla
 * baje el catálogo de países al montar cuando los datos ya están calientes.
 *
 * IMPORTANT: si se crea/edita un país (Configuración → Países y Ciudades),
 * llamar invalidarPaises() para quettlá TTL no muestre datos viejos 10 min.
 */
let _paises = null;
let _paisesTs = 0;
const PAISES_TTL_MS = 10 * 60 * 1000;

export function invalidarPaises() {
  _paises = null;
}

export default function usePaises() {
  const [paises, setPaises] = useState(_paises || []);
  const [cargando, setCargando] = useState(!_paises);

  const refrescarSiVencido = useCallback(async () => {
    if (_paises && Date.now() - _paisesTs < PAISES_TTL_MS) {
      setPaises(_paises);
      return _paises;
    }
    setCargando(true);
    try {
      const res = await getPaises();
      _paises = res;
      _paisesTs = Date.now();
      setPaises(res);
      return res;
    } catch {
      return _paises || [];
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { refrescarSiVencido(); }, [refrescarSiVencido]);

  return { paises, cargando, refrescarSiVencido };
}
