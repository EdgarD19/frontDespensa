import { useEffect, useRef, useState } from "react";

const separador = (t) =>
  t.indexOf(",") !== -1 ? "," : t.indexOf(".") !== -1 ? "." : null;

export default function CantidadInput({
  unidadMedida = "UN",
  value,
  onChange,
  maxDecimales = 3,
  disabled = false,
  placeholder,
  id,
  name,
  ariaLabel,
  className = "",
}) {
  const esKG = unidadMedida === "KG";
  const maxDec = esKG ? Math.max(0, maxDecimales | 0) : 0;

  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const textRef = useRef("");
  const focusedRef = useRef(false);

  const toText = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    return String(v).replace(".", esKG ? "." : "").replace(",", ".");
  };

  useEffect(() => {
    if (!focusedRef.current) {
      const v = toText(value);
      if (v !== textRef.current) {
        textRef.current = v;
        setText(v);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (txt) => {
    const t = txt.trim();
    setText(txt);
    textRef.current = txt;

    if (esKG) {
      const norm = t.replace(",", ".").replace(/\s/g, "");
      if (norm === "" || isNaN(Number(norm))) {
        onChange(norm === "" ? "" : undefined);
        return;
      }
      onChange(norm);
    } else {
      if (t === "") {
        onChange("");
        return;
      }
      onChange(t);
    }
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    const isMod = e.ctrlKey || e.metaKey || e.altKey;
    if (isMod) return;
    const k = e.key;

    // navegación y edición permitidas
    if (
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab", "Enter"].includes(k)
    ) {
      if (k === "Enter") handleCommit();
      return;
    }

    if (!/^[\d.,]$/.test(k)) {
      e.preventDefault();
      return;
    }

    if (!esKG) {
      // UN: solo dígitos
      if (!/^\d$/.test(k)) {
        e.preventDefault();
      }
      return;
    }

    // KG
    if (/^\d$/.test(k)) {
      // bloquear decimales extra mientras se escribe
      const cur = textRef.current;
      const sel = e.target.selectionStart;
      const before = cur.slice(0, sel);
      const sep = separador(before + (before.includes(".") || before.includes(",") ? "" : ""));
      const decCount = before.includes(".") || before.includes(",")
        ? before.split(/[.,]/).pop().length
        : 0;
      if (decCount >= maxDec && maxDec > 0 && (before.includes(".") || before.includes(","))) {
        e.preventDefault();
      }
      return;
    }

    if (k === "-") { e.preventDefault(); return; }
    if (k === "," || k === ".") {
      if (separador(textRef.current) !== null) {
        e.preventDefault();
      }
    }
  };

  const resolveCommit = (txt) => {
    const t = (txt ?? "").toString().trim();
    if (t === "") return { error: null, emit: false };

    if (esKG) {
      const norm = t.replace(",", ".");
      const num = Number(norm);
      if (isNaN(num)) {
        return { error: "Ingrese una cantidad válida.", emit: false };
      }
      if (num <= 0) {
        return { error: "La cantidad debe ser mayor que 0.", emit: false };
      }
      const dec = norm.split(".")[1] ? norm.split(".")[1].length : 0;
      if (maxDec > 0 && dec > maxDec) {
        return {
          error: `La cantidad no puede tener más de ${maxDecimales} decimales.`,
          emit: false,
        };
      }
      const redondeado = Number(num.toFixed(maxDec));
      return { error: null, emit: redondeado.toString() };
    }

    if (!/^\d+$/.test(t)) {
      return { error: "La cantidad debe ser un número entero.", emit: false };
    }
    const n = parseInt(t, 10);
    if (n <= 0) {
      return { error: "La cantidad debe ser mayor que 0.", emit: false };
    }
    return { error: null, emit: n.toString() };
  };

  const handleCommit = () => {
    const res = resolveCommit(textRef.current);
    setError(res.error);
    if (res.emit !== false) {
      const formatted = esKG ? res.emit : res.emit;
      onChange(esKG ? formatted : parseInt(formatted, 10));
      textRef.current = formatted;
      setText(formatted);
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="relative">
        <input
          type="text"
          inputMode={esKG ? "decimal" : "numeric"}
          autoComplete="off"
          id={id}
          name={name}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onFocus={() => (focusedRef.current = true)}
          onBlur={() => {
            focusedRef.current = false;
            handleCommit();
          }}
          onChange={(e) => {
            if (!focusedRef.current) focusedRef.current = true;
            emit(e.target.value);
          }}
          onKeyDown={onKeyDown}
          className={`w-full bg-white/5 border rounded px-2 py-1 text-right text-sm font-mono text-white placeholder:text-white/25 outline-none transition-colors focus:border-[#22c55e]/50 ${
            error ? "border-red-500/60" : "border-white/10"
          }`}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
