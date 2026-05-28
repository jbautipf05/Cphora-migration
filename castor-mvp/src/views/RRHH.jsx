import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, today, daysBetween } from '../lib/format';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge } from '../components/widgets';
import { IconUsers, IconBank, IconBox, IconCheck } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

// RRHH-01: 13 áreas de contratación (espejo de RRHH_AREAS de Demo6), con ortografía
// CURADA y consistente con el resto de la app: "Almacén" (con tilde) y
// "Pintura electrostática" (Demo6 traía "Almacen" y "Pintura electroestatica").
const AREAS = [
  'Administrativo', 'Comercial', 'Ebanistería', 'Pintura', 'Preparación',
  'Pintura electrostática', 'Costura', 'Tapicería', 'Ensamble', 'Soldadura',
  'Logística', 'Supernumerarios', 'Almacén',
];
const ESTADOS = ['activo', 'Vacaciones', 'Suspendido', 'retirado'];
const CONTRATOS = ['Indefinido', 'Obra labor', 'Termino fijo', 'Prestación de servicios'];
// Sexo CURADO: Demo6 traía ['Hombre','Mujer','Therian'] (placeholder jocoso) → se reemplaza
// el tercero por 'Otro' (decisión de curación documentada).
const SEXOS = ['Hombre', 'Mujer', 'Otro'];
// Paleta para el badge de área en la tabla (color por área).
const AREA_COLORS = {
  Administrativo: '#C9A961', Comercial: '#3b82f6', Ebanistería: '#a16207', Pintura: '#db2777',
  'Preparación': '#0891b2', 'Pintura electrostática': '#7c3aed', Costura: '#e11d48',
  'Tapicería': '#9333ea', Ensamble: '#10b981', Soldadura: '#ef4444', 'Logística': '#0ea5e9',
  Supernumerarios: '#64748b', 'Almacén': '#059669',
};

const empty = () => ({
  name: '', cc: '', role: '', area: 'Administrativo', sexo: 'Hombre',
  celular: '', direccion: '', ciudad: '', fechaNacimiento: '',
  hiredAt: today(), fechaRetiro: '', tipoContrato: 'Indefinido',
  arl: '', fondoPension: '', salud: '', cajaCompensacion: '',
  estado: 'activo', salario: 1423500, bono: 0, lugarTrabajo: '', email: '',
});

export default function RRHH() {
  const { employees, add, nextId, pendingForm, setPendingForm } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [form, setForm] = useState(null);

  // Intent del header "+ Nuevo" → abrir el form de nuevo empleado (H-001).
  useEffect(() => {
    if (pendingForm?.type === 'empleado') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(empty());
      setPendingForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingForm]);

  const areas = useMemo(() => [...new Set(employees.map((e) => e.area))], [employees]);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return employees.filter((e) => {
      if (area && e.area !== area) return false;
      if (t && !`${e.name} ${e.role} ${e.email}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [employees, q, area]);

  const kpis = useMemo(() => {
    const activos = employees.filter((e) => e.estado === 'activo');
    const nomina = activos.reduce((a, e) => a + e.salario, 0);
    // Antigüedad promedio en años, igual que el demo: días entre ingreso y hoy / 365.
    const antig = Math.round(
      activos.reduce((a, e) => a + daysBetween(e.hiredAt, today()), 0) / (activos.length || 1) / 365 * 10,
    ) / 10;
    return {
      activos: activos.length,
      nomina,
      areas: [...new Set(activos.map((e) => e.area))].length,
      antig: antig.toFixed(1),
    };
  }, [employees]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    // Gate de obligatorios (*) — patrón usado en los otros modales.
    const req = [
      ['name', 'Nombre'], ['cc', 'CC'], ['role', 'Cargo'], ['area', 'Área'], ['sexo', 'Sexo'],
      ['celular', 'Celular'], ['hiredAt', 'Fecha de ingreso'], ['tipoContrato', 'Tipo de contrato'],
      ['estado', 'Estado'],
    ];
    for (const [k, label] of req) if (!String(form[k] ?? '').trim()) return toast(`${label} es obligatorio`, 'warn');
    if (form.salario === '' || Number.isNaN(Number(form.salario))) return toast('Salario es obligatorio', 'warn');
    const id = nextId('E', 'emp', 3);
    // `...form` persiste TODOS los campos (empty() los inicializa); se normalizan los numéricos.
    add('employees', { id, ...form, salario: Number(form.salario) || 0, bono: Number(form.bono) || 0 });
    toast(`Empleado ${id} creado`, 'ok');
    setForm(null);
  }

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-brand-gold">{r.id}</span> },
    { key: 'name', label: 'Nombre', render: (r) => <span className="text-white">{r.name}</span> },
    { key: 'role', label: 'Rol', render: (r) => <span className="text-brand-muted">{r.role}</span> },
    {
      key: 'area',
      label: 'Área',
      render: (r) => {
        const c = AREA_COLORS[r.area] || '#64748b';
        return <span className="rounded px-2 py-0.5 text-[11px]" style={{ background: `${c}22`, border: `1px solid ${c}55`, color: c }}>{r.area}</span>;
      },
    },
    { key: 'email', label: 'Email', render: (r) => <span className="text-brand-muted">{r.email}</span> },
    { key: 'hired', label: 'Contratación', render: (r) => <span className="text-brand-muted">{fmtDate(r.hiredAt)}</span> },
    { key: 'salario', label: 'Salario', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.salario)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  return (
    <div className="page space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Activos" value={kpis.activos} hint={`${employees.length} histórico`} accent="#C9A961" icon={<IconUsers width={18} height={18} />} />
        <KpiCard label="Nómina mensual" value={fmtCOP(kpis.nomina)} hint="Mensual" accent="#10b981" icon={<IconBank width={18} height={18} />} />
        <KpiCard label="Áreas" value={kpis.areas} hint="Depts" accent="#3b82f6" icon={<IconBox width={18} height={18} />} />
        <KpiCard label="Antigüedad prom." value={`${kpis.antig} años`} hint="Promedio" accent="#A88D4B" icon={<IconCheck width={18} height={18} />} />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar empleado…" />
        <SelectFilter value={area} onChange={setArea} options={areas} allLabel="Todas las áreas" />
        <span className="ml-auto text-sm text-brand-muted">{rows.length} empleados</span>
        <button className="btn-gold" onClick={() => setForm(empty())}>+ Nuevo empleado</button>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} />

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Nuevo empleado"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={save}>Crear</button>
          </>
        }
      >
        {form && (
          <FormGrid cols={3}>
            <Field label="Nombre *" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setF('name', e.target.value)} /></Field>
            <Field label="CC *"><Input value={form.cc} onChange={(e) => setF('cc', e.target.value)} placeholder="Nº cédula" /></Field>
            <Field label="Cargo *"><Input value={form.role} onChange={(e) => setF('role', e.target.value)} placeholder="Ej: Operario, Asesor…" /></Field>
            <Field label="Área *">
              <Select value={form.area} onChange={(e) => setF('area', e.target.value)}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="Sexo *">
              <Select value={form.sexo} onChange={(e) => setF('sexo', e.target.value)}>
                {SEXOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Celular *"><Input value={form.celular} onChange={(e) => setF('celular', e.target.value)} /></Field>
            <Field label="Dirección" className="sm:col-span-2"><Input value={form.direccion} onChange={(e) => setF('direccion', e.target.value)} /></Field>
            <Field label="Ciudad"><Input value={form.ciudad} onChange={(e) => setF('ciudad', e.target.value)} /></Field>
            <Field label="Fecha de nacimiento"><Input type="date" value={form.fechaNacimiento} onChange={(e) => setF('fechaNacimiento', e.target.value)} /></Field>
            <Field label="Fecha de ingreso *"><Input type="date" value={form.hiredAt} onChange={(e) => setF('hiredAt', e.target.value)} /></Field>
            <Field label="Fecha de retiro"><Input type="date" value={form.fechaRetiro} onChange={(e) => setF('fechaRetiro', e.target.value)} /></Field>
            <Field label="Tipo de contrato *">
              <Select value={form.tipoContrato} onChange={(e) => setF('tipoContrato', e.target.value)}>
                {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="ARL"><Input value={form.arl} onChange={(e) => setF('arl', e.target.value)} placeholder="Ej: Sura, Positiva…" /></Field>
            <Field label="Fondo de pensión"><Input value={form.fondoPension} onChange={(e) => setF('fondoPension', e.target.value)} placeholder="Ej: Colpensiones, Porvenir…" /></Field>
            <Field label="EPS (Salud)"><Input value={form.salud} onChange={(e) => setF('salud', e.target.value)} placeholder="Ej: Sura, Sanitas…" /></Field>
            <Field label="Caja de compensación"><Input value={form.cajaCompensacion} onChange={(e) => setF('cajaCompensacion', e.target.value)} placeholder="Ej: Compensar, Cafam…" /></Field>
            <Field label="Estado *">
              <Select value={form.estado} onChange={(e) => setF('estado', e.target.value)}>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Salario *"><Input type="number" value={form.salario} onChange={(e) => setF('salario', e.target.value)} /></Field>
            <Field label="Bono"><Input type="number" value={form.bono} onChange={(e) => setF('bono', e.target.value)} /></Field>
            <Field label="Lugar de trabajo"><Input value={form.lugarTrabajo} onChange={(e) => setF('lugarTrabajo', e.target.value)} placeholder="Ej: Bogotá · Calle 43" /></Field>
            <Field label="Email" className="sm:col-span-3"><Input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} /></Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
