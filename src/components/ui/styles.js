/**
 * Clases canónicas de tabla y botones (token único del proyecto).
 * Importar y reutilizar; no hardcodear variantes locales.
 */

/** Fila entera del thead: fondo verde tenue + texto verde + uppercase espaciado. */
export const THEAD_ROW =
  "border-b border-white/10 bg-[var(--accent-dim)] text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]";

/** <th> base (agregar w-/px- al uso). */
export const THEAD_TH = "px-4 py-3 font-medium";

/** Panel contenedor estándar de tablas. */
export const TABLE_SHELL = "overflow-hidden rounded-none border border-white/10 bg-[#0c0c0e]";

/** Card contenedora estándar del proyecto. */
export const CARD =
  "rounded-none border border-white/10 bg-white/[0.02]";

/** Etiqueta de campo / overline. */
export const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";

/** Botones */
export const BTN_PRIMARIO =
  "flex items-center gap-2 rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40";

export const BTN_SECUNDARIO =
  "rounded-none border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition-colors hover:text-white";

export const BTN_PELIGROSO =
  "rounded-none bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-40";
