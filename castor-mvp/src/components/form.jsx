import { useEffect, useRef } from 'react';

// Campos de formulario reutilizables, con el look del demo (.input-field/.label).

export function Field({ label, children, className = '', hint }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-brand-muted">{hint}</span>}
    </label>
  );
}

export function Input(props) {
  return <input {...props} className={`input-field ${props.className || ''}`} />;
}

export function Textarea(props) {
  return <textarea {...props} className={`input-field ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`input-field ${props.className || ''}`}>
      {children}
    </select>
  );
}

// Grid de campos (2 columnas por defecto).
export function FormGrid({ cols = 2, children, className = '' }) {
  const map = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' };
  return <div className={`grid grid-cols-1 gap-4 ${map[cols] || map[2]} ${className}`}>{children}</div>;
}

// Descarta una cola decimal al final del string: separador (. o ,) + 1 ó 2 dígitos,
// con whitespace trailing opcional. Cubre formatos CO ("20.000,50") y US ("20,000.50")
// al pegar valores con centavos. NO matchea decimales de 3+ dígitos (que serían parte
// del separador de miles cuando el usuario tipea keystroke por keystroke, ej. "1.234").
const stripDecimalTail = (s) => s.replace(/[.,]\d{1,2}\s*$/, '');

// MoneyInput — input de dinero con separadores de miles automáticos (estilo CO: punto miles).
// Drop-in para reemplazar <input type="number"> en campos de DINERO (precios, costos, salarios,
// totales, montos, anticipos, débitos/créditos, balances). Visualmente muestra "20.000" mientras
// se tipea, pero al onChange propaga un event con e.target.value = "20000" (solo dígitos), para
// no romper el patrón actual onChange={(e) => setX(e.target.value)} de los call sites.
//
// Decisiones: sin símbolo $ (el fmtCOP del display ya lo pone); solo enteros (coherente con
// fmtCOP del proyecto); todos los no-dígitos del input se strippean (permite pegar "$20.000,50"
// y queda "20000" — los centavos se descartan a propósito).
export function MoneyInput({ value, onChange, className = '', ...rest }) {
  const inputRef = useRef(null);
  // Guarda cuántos dígitos había a la izquierda del cursor en el momento del cambio.
  // Lo usamos en el useEffect para reposicionar el cursor tras el re-render con separadores.
  // null = no hay reposición pendiente (estado inicial / readOnly / cambio externo).
  const pendingDigitsBeforeCursor = useRef(null);

  const num = value === '' || value == null || Number.isNaN(Number(value)) ? '' : Number(value);
  const display = num === '' ? '' : num.toLocaleString('es-CO');

  // Fix de cursor: cuando React re-renderiza el input con un value formateado distinto
  // al raw (ej. raw "12534" → display "12.534"), el browser por defecto coloca el cursor
  // al final. Acá restauramos su posición lógica: tantos dígitos a la izquierda como
  // tenía antes del cambio. Los puntos de miles del display se saltean al iterar.
  useEffect(() => {
    const target = pendingDigitsBeforeCursor.current;
    if (target == null || !inputRef.current) return;
    pendingDigitsBeforeCursor.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < display.length && seen < target) {
      if (/\d/.test(display[pos])) seen += 1;
      pos += 1;
    }
    // setSelectionRange en inputs type=text es seguro; en type=number tira en algunos
    // browsers, pero MoneyInput usa type=text expresamente.
    inputRef.current.setSelectionRange(pos, pos);
  }, [display]);

  const handleChange = (e) => {
    const rawValue = e.target.value;
    // PASO 1: descartar cola decimal ANTES del strip. Sin esto, al pegar "$ 20.000,50"
    // el viejo replace(/\D/g, '') concatenaba los centavos como dígitos de miles y
    // producía "2.000.050" en vez del "20.000" esperado.
    const sanitizedRaw = stripDecimalTail(rawValue);
    // Cursor del input ANTES de strippear los no-dígitos. selectionStart puede ser null
    // en navegadores antiguos o tipos exóticos; fallback al final del string.
    const cursorPos = e.target.selectionStart ?? rawValue.length;
    // PASO 2: clamp del cursor al largo de sanitizedRaw — si cayó dentro de la cola
    // decimal (caso paste), lo movemos al final lógico del valor sin cola.
    const clampedCursor = Math.min(cursorPos, sanitizedRaw.length);
    // Cuenta solo los dígitos en el slice [0, clampedCursor): así "1.2|534" → 2 dígitos.
    pendingDigitsBeforeCursor.current = (sanitizedRaw.slice(0, clampedCursor).match(/\d/g) || []).length;
    const digits = sanitizedRaw.replace(/\D/g, '');
    // Sintetiza el event que esperan los call sites: target.value en string de dígitos puros.
    onChange?.({ ...e, target: { ...e.target, value: digits } });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      className={`input-field ${className}`}
      {...rest}
    />
  );
}
