import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { CITIES_CO } from '../data/cities';

// Normaliza un string para comparar: sin tildes, lowercase, trim.
// Permite que "san josé" coincida con "San José" y con "san jose" (paste sin tildes).
const norm = (s) => (s || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Title case por palabra: "barranquilla" → "Barranquilla", "santa marta" → "Santa Marta".
// Caso "san josé del guaviare" → "San José Del Guaviare", pero si después matchea con
// el catálogo case-insensitive el casing canónico ("San José del Guaviare", con "del"
// minúscula) lo reemplaza en handleBlur.
const titleCase = (s) =>
  (s || '')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');

// Combobox — autocomplete híbrido para campos de "Ciudad".
//
// Drop-in para reemplazar <Input> en campos de Ciudad. Misma API value/onChange:
// el onChange recibe un event con target.value (string), compatible con el patrón
// onChange={(e) => set('city', e.target.value)} de los call sites.
//
// Catálogo dinámico = unión de CITIES_CO + ciudades de customers, deduplicado
// case+tilde-insensitive. CITIES_CO gana (canonical con tildes); las del state
// se title-casean al agregarse.
//
// Filtro por prefijo case+tilde-insensitive (top 8). Selección con click setea
// el casing del catálogo. Valor libre permitido (no se bloquea).
//
// Capitalize on-blur: title case por palabra y, si coincide con catálogo, casing
// canónico exacto. Resuelve también el "barranquilla minúscula → Barranquilla"
// que estaba en el sweep B.
export function Combobox({ value, onChange, className = '', ...rest }) {
  const { customers } = useApp();
  const [open, setOpen] = useState(false);

  // Catálogo unificado: CITIES_CO + ciudades únicas de customers. Mapa keyed por
  // forma normalizada (sin tildes/case), valor = casing canónico para mostrar.
  const catalog = useMemo(() => {
    const map = new Map();
    for (const c of CITIES_CO) map.set(norm(c), c);
    for (const cu of customers || []) {
      const city = (cu.city || '').trim();
      if (!city) continue;
      const key = norm(city);
      if (!map.has(key)) map.set(key, titleCase(city));
    }
    return Array.from(map.values());
  }, [customers]);

  // Filtrado por prefijo case+tilde-insensitive. Si value vacío, primeras 8 del
  // catálogo (orientativas al abrir por focus).
  const filtered = useMemo(() => {
    const q = norm(value);
    const matches = q ? catalog.filter((c) => norm(c).startsWith(q)) : catalog;
    return matches.slice(0, 8);
  }, [catalog, value]);

  // Sintetiza event compatible con onChange={(e) => set(...e.target.value)}.
  const emitChange = (newValue) => {
    onChange?.({ target: { value: newValue } });
  };

  const handleSelect = (item) => {
    emitChange(item);
    setOpen(false);
  };

  const handleBlur = () => {
    // Delay 150ms para permitir que el onMouseDown del item dispare ANTES de
    // cerrar el dropdown (mismo patrón que ProductPicker en Leads.jsx).
    setTimeout(() => setOpen(false), 150);
    // Capitalize on-blur: normalizar al casing canónico del catálogo si matchea,
    // o aplicar title case por palabra si no.
    const v = (value || '').trim();
    if (!v) return;
    const key = norm(v);
    const canonical = catalog.find((c) => norm(c) === key);
    const normalized = canonical || titleCase(v);
    if (normalized !== value) emitChange(normalized);
  };

  return (
    <div className="relative">
      <input
        value={value || ''}
        onChange={(e) => {
          emitChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        className={`input-field ${className}`}
        autoComplete="off"
        {...rest}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto scrollbar-thin rounded-lg border border-brand-border bg-brand-panel shadow-2xl">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="block w-full px-3 py-1.5 text-left text-sm text-brand-muted transition hover:bg-white/5 hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
