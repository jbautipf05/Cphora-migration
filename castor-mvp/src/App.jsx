import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
// Contabilidad
import DashboardContable from './views/DashboardContable';
import LibroDiario from './views/LibroDiario';
import LibroMayor from './views/LibroMayor';
import BalancePrueba from './views/BalancePrueba';
import BalanceGeneral from './views/BalanceGeneral';
import EstadoResultados from './views/EstadoResultados';
import Cartera from './views/Cartera';
import CxP from './views/CxP';
import AuxIVA from './views/AuxIVA';
import AuxRetenciones from './views/AuxRetenciones';
import PlanPUC from './views/PlanPUC';
import AsientosManuales from './views/AsientosManuales';
import Cierres from './views/Cierres';
import CentrosCosto from './views/CentrosCosto';
import ConfigPerfilTributario from './views/ConfigPerfilTributario';
import ConfiguracionNomina from './views/ConfiguracionNomina';
import MapeosCuentas from './views/MapeosCuentas';
import ReglasTributarias from './views/ReglasTributarias';
// Inicio
import Inicio from './views/Inicio';
// Comercial
import Leads from './views/Leads';
import Clientes from './views/Clientes';
import Cotizaciones from './views/Cotizaciones';
import ListaPrecios from './views/ListaPrecios';
import Ventas from './views/Ventas';
import Postventa from './views/Postventa';
import Marketing from './views/Marketing';
// Operación
import Produccion from './views/Produccion';
import InventarioTerminado from './views/InventarioTerminado';
import Despacho from './views/Despacho';
import AlmacenMP from './views/AlmacenMP';
import Garantias from './views/Garantias';
// Finanzas
import Tesoreria from './views/Tesoreria';
// Admin
import Auditoria from './views/Auditoria';
import Innovacion from './views/Innovacion';
import RRHH from './views/RRHH';

const VIEWS = {
  inicio: (nav) => <Inicio onNavigate={nav} />,
  leads: (nav) => <Leads onNavigate={nav} />,
  clientes: () => <Clientes />,
  cotizaciones: (nav) => <Cotizaciones onNavigate={nav} />,
  'lista-precios': () => <ListaPrecios />,
  ventas: () => <Ventas />,
  postventa: () => <Postventa />,
  marketing: () => <Marketing />,
  produccion: () => <Produccion />,
  inventario: () => <InventarioTerminado />,
  despacho: () => <Despacho />,
  almacen: () => <AlmacenMP />,
  garantias: () => <Garantias />,
  tesoreria: () => <Tesoreria />,
  auditoria: () => <Auditoria />,
  innovacion: () => <Innovacion />,
  rrhh: () => <RRHH />,
  // Contabilidad
  dashboard: (nav) => <DashboardContable onNavigate={nav} />,
  'libro-diario': (_, search) => <LibroDiario search={search} />,
  'libro-mayor': () => <LibroMayor />,
  'balance-prueba': () => <BalancePrueba />,
  'balance-general': () => <BalanceGeneral />,
  'estado-resultados': () => <EstadoResultados />,
  cartera: () => <Cartera />,
  cxp: () => <CxP />,
  'aux-iva': () => <AuxIVA />,
  'aux-retenciones': () => <AuxRetenciones />,
  'plan-puc': () => <PlanPUC />,
  'asientos-manuales': () => <AsientosManuales />,
  cierres: () => <Cierres />,
  'centros-costo': () => <CentrosCosto />,
  'config-perfil': () => <ConfigPerfilTributario />,
  'config-nomina': () => <ConfiguracionNomina />,
  'mapeos-cuentas': () => <MapeosCuentas />,
  'reglas-tributarias': () => <ReglasTributarias />,
};

export default function App() {
  const [view, setView] = useState('inicio');
  const [search, setSearch] = useState('');

  const render = VIEWS[view] || VIEWS.inicio;

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg text-white">
      <Sidebar view={view} setView={setView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header view={view} search={search} setSearch={setSearch} setView={setView} />
        <main key={view} className="page flex-1 overflow-y-auto p-8">
          {render(setView, search)}
        </main>
      </div>
    </div>
  );
}
