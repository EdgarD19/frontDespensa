/**
 * Fallback estándar mientras baja el chunk de una pantalla (React.lazy).
 * Se renderiza dentro del layout: el sidebar no desaparece al navegar.
 */
export default function CargandoPantalla() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-white/50">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]"
        role="status"
        aria-label="Cargando"
      />
      Cargando…
    </div>
  );
}
