export default function Pagination({
  page = 0,
  totalPages = 1,
  onPageChange,
  pageSize = 10,
  totalItems,
  className = "",
}) {
  if (totalPages < 1) return null;

  const last = Math.max(1, totalPages);
  const showRange = totalItems != null && totalItems > 0;
  const from = showRange ? page * pageSize + 1 : 0;
  const to = showRange ? Math.min((page + 1) * pageSize, totalItems) : 0;

  const pageBtn =
    "flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm";

  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap ${className}`}>
      {showRange ? (
        <span className="text-xs text-[#5a5a6e] tabular-nums">
          Mostrando {from}–{to} de {totalItems}
        </span>
      ) : (
        <span />
      )}
      <div className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-1.5 text-sm select-none shadow-sm">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(0)}
          className={pageBtn}
          title="Primera página"
          aria-label="Primera página"
        >
          &laquo;
        </button>
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className={pageBtn}
          title="Página anterior"
          aria-label="Página anterior"
        >
          &lsaquo;
        </button>

        <span className="px-2 font-medium text-white/75 tabular-nums">
          Página {page + 1} de {last}
        </span>

        <button
          type="button"
          disabled={page >= last - 1}
          onClick={() => onPageChange(page + 1)}
          className={pageBtn}
          title="Página siguiente"
          aria-label="Página siguiente"
        >
          &rsaquo;
        </button>
        <button
          type="button"
          disabled={page >= last - 1}
          onClick={() => onPageChange(last - 1)}
          className={pageBtn}
          title="Última página"
          aria-label="Última página"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}