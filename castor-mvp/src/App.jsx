import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardContable from './views/DashboardContable';
import LibroDiario from './views/LibroDiario';
import BalancePrueba from './views/BalancePrueba';
import PlanPUC from './views/PlanPUC';
import ConfiguracionNomina from './views/ConfiguracionNomina';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [search, setSearch] = useState('');

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg text-white">
      <Sidebar view={view} setView={setView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header view={view} search={search} setSearch={setSearch} />
        <main className="flex-1 overflow-y-auto p-8">
          {view === 'dashboard' && <DashboardContable onNavigate={setView} />}
          {view === 'libro-diario' && <LibroDiario search={search} />}
          {view === 'balance-prueba' && <BalancePrueba />}
          {view === 'plan-puc' && <PlanPUC />}
          {view === 'config-nomina' && <ConfiguracionNomina />}
        </main>
      </div>
    </div>
  );
}
