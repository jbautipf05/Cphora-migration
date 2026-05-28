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
  const num = value === '' || value == null || Number.isNaN(Number(value)) ? '' : Number(value);
  const display = num === '' ? '' : num.toLocaleString('es-CO');
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    // Sintetiza el event que esperan los call sites: target.value en string de dígitos puros.
    onChange?.({ ...e, target: { ...e.target, value: digits } });
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      className={`input-field ${className}`}
      {...rest}
    />
  );
}
