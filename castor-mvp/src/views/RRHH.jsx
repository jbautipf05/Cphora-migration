import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { KpiCard } from '../components/ui';
import { fmtCOP } from '../lib/accounting';
import { Toolbar, SearchBox, SelectFilter, DataTable, EstadoBadge, fmtDate } from '../components/widgets';

export default function RRHH() {
  const { employees } = useApp();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');

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
    const activos = employees.filter((e) => e.estado === 'activo').length;
    const nomina = employees.reduce((a, e) => a + e.salario, 0);
    const antig = employees.reduce((a, e) => a + (2026 - Number(e.hiredAt.slice(0, 4))), 0) / (employees.length || 1);
    return { activos, nomina, areas: areas.length, antig: antig.toFixed(1) };
  }, [employees, areas]);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs text-gold-accent">{r.id}</span> },
    { key: 'name', label: 'Nombre', render: (r) => <span className="text-white">{r.name}</span> },
    { key: 'role', label: 'Cargo', render: (r) => <span className="text-muted">{r.role}</span> },
    { key: 'area', label: 'Área', render: (r) => <span className="text-muted">{r.area}</span> },
    { key: 'email', label: 'Email', render: (r) => <span className="text-muted">{r.email}</span> },
    { key: 'hired', label: 'Contratación', render: (r) => <span className="text-muted">{fmtDate(r.hiredAt)}</span> },
    { key: 'salario', label: 'Salario', align: 'right', render: (r) => <span className="text-white">{fmtCOP(r.salario)}</span> },
    { key: 'estado', label: 'Estado', render: (r) => <EstadoBadge value={r.estado} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Activos" value={kpis.activos} accent="#34d399" />
        <KpiCard label="Nómina mensual" value={fmtCOP(kpis.nomina)} accent="#C9A961" />
        <KpiCard label="Áreas" value={kpis.areas} accent="#a78bfa" />
        <KpiCard label="Antigüedad prom." value={`${kpis.antig} años`} accent="#38bdf8" />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar empleado…" />
        <SelectFilter value={area} onChange={setArea} options={areas} allLabel="Todas las áreas" />
        <span className="ml-auto text-sm text-muted">{rows.length} empleados</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} />
    </div>
  );
}
