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
