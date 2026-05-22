import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP, fmtDate, today, daysBetween } from '../lib/format';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge } from '../components/widgets';
import { IconUsers, IconBank, IconBox, IconCheck } from '../components/icons';
import Modal from '../components/Modal';
import { Field, Input, Select, FormGrid } from '../components/form';
import { useToast } from '../components/Toast';

const AREAS = ['Comercial', 'Ebanistería', 'Administrativo', 'Almacén', 'Logística', 'Producción'];
const ESTADOS = ['activo', 'Vacaciones', 'Suspendido', 'retirado'];
const CONTRATOS = ['Indefinido', 'Obra labor', 'Termino fijo', 'Prestación de servicios'];

const empty = () => ({
  name: '', role: '', area: 'Comercial', email: '', hiredAt: today(),
  salario: 1423500, estado: 'activo', tipoContrato: 'Indefinido', cc: '', celular: '',
});

export default function RRHH() {
  const { employees, add, nextId } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [form, setForm] = useState(null);

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
    if (!form.name.trim()) return toast('El nombre es obligatorio', 'warn');
    const id = nextId('E', 'emp', 3);
    add('employees', { id, ...form, salario: Number(form.salario) || 0 });
    toast(`Empleado ${id} creado`, 'ok');
    setForm(null);
  }

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-brand-gold">{r.id}</span> },
    { key: 'name', label: 'Nombre', render: (r) => <span className="text-white">{r.name}</span> },
    { key: 'role', label: 'Cargo', render: (r) => <span className="text-brand-muted">{r.role}</span> },
    { key: 'area', label: 'Área', render: (r) => <span className="text-brand-muted">{r.area}</span> },
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
        footer={
          <>
            <button className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-gold" onClick={save}>Guardar</button>
          </>
        }
      >
        {form && (
          <FormGrid cols={2}>
            <Field label="Nombre" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setF('name', e.target.value)} /></Field>
            <Field label="Cédula"><Input value={form.cc} onChange={(e) => setF('cc', e.target.value)} /></Field>
            <Field label="Cargo"><Input value={form.role} onChange={(e) => setF('role', e.target.value)} /></Field>
            <Field label="Área">
              <Select value={form.area} onChange={(e) => setF('area', e.target.value)}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="Celular"><Input value={form.celular} onChange={(e) => setF('celular', e.target.value)} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setF('email', e.target.value)} /></Field>
            <Field label="Contratación"><Input type="date" value={form.hiredAt} onChange={(e) => setF('hiredAt', e.target.value)} /></Field>
            <Field label="Tipo de contrato">
              <Select value={form.tipoContrato} onChange={(e) => setF('tipoContrato', e.target.value)}>
                {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.estado} onChange={(e) => setF('estado', e.target.value)}>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Salario (COP)"><Input type="number" value={form.salario} onChange={(e) => setF('salario', e.target.value)} /></Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  );
}
