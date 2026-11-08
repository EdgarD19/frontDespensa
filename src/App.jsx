/*
  BrowserRouter: activa el sistema de rutas
  Routes: Contenedor de rutas
  Route: Define una ruta
  Navigate: Redireccion

  Code-splitting: cada página carga bajo demanda con React.lazy()
  (build inicial ~solo MainLayout + la pantalla abierta; el resto baja al navegar).
*/
import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';

/*
  lazy() por módulo: agrupa las pantallas de cada sección, así navegar de
  Ventas → Inventario baja solo el chunk de Inventario. El fallback es un
  panel fijo de la misma altura que usa el layout (evita el "brinco").
*/
const VentasHub = lazy(() => import('./pages/ventas/VentasHub'));
const IntercambioVentas = lazy(() => import('./pages/ventas/devoluciones/IntercambioVentas'));
const AnulacionVentas = lazy(() => import('./pages/ventas/devoluciones/AnulacionVentas'));
const ClientesABM = lazy(() => import('./pages/ventas/clientes/abm/ClientesABM'));
const RegistroVenta = lazy(() => import('./pages/ventas/registro-venta/RegistroVenta'));
const HistorialVentas = lazy(() => import('./pages/ventas/consultas/HistorialVentas'));
const DashboardVentas = lazy(() => import('./pages/ventas/DashboardVentas'));

const InventarioHub = lazy(() => import('./pages/inventario/InventarioHub'));
const InventarioABM = lazy(() => import('./pages/inventario/abm/Inventario'));
const ConsultaInventario = lazy(() => import('./pages/inventario/consulta/ConsultaInventario'));
const AjusteInventario = lazy(() => import('./pages/inventario/ajuste/AjusteInventario'));
const MaestrosABM = lazy(() => import('./pages/inventario/maestros/MaestrosABM'));

const ComprasHub = lazy(() => import('./pages/compras/ComprasHub'));
const RegistroFactura = lazy(() => import('./pages/compras/factura/RegistroFactura'));
const PedidosABM = lazy(() => import('./pages/compras/pedidos/abm/PedidosABM'));
const ProveedoresABM = lazy(() => import('./pages/compras/proveedores/abm/ProveedoresABM'));
const ListaFacturas = lazy(() => import('./pages/compras/consultas/ListaFacturas'));
const ReportesCompras = lazy(() => import('./pages/compras/consultas/ReportesCompras'));
const OperacionesTipo = lazy(() => import('./pages/compras/devoluciones/OperacionesTipo'));
const DevolucionesIntercambiosHub = lazy(() => import('./pages/compras/devoluciones/DevolucionesIntercambiosHub'));

const Caja = lazy(() => import('./pages/caja/Caja'));

const ConfiguracionHub = lazy(() => import('./pages/configuracion/ConfiguracionHub'));
const CategoriasABM = lazy(() => import('./pages/configuracion/CategoriasABM'));
const PaisesCiudadesABM = lazy(() => import('./pages/configuracion/PaisesCiudadesABM'));
const ComprobantesConfig = lazy(() => import('./pages/configuracion/ComprobantesConfig'));
const EmpresaConfig = lazy(() => import('./pages/configuracion/EmpresaConfig'));

/* Mientras baja el chunk de una pantalla — el fallback vive en MainLayout */

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/ventas" replace />} />

            <Route path="ventas">
              <Route index element={<VentasHub />} />
              <Route path="registro" element={<RegistroVenta />} />
              <Route path="consultas/historial" element={<HistorialVentas />} />
              <Route path="dashboard" element={<DashboardVentas />} />
              <Route path="clientes" element={<ClientesABM />} />
              <Route path="devoluciones" element={<Navigate to="/ventas" replace />} />
              <Route path="devoluciones/intercambios" element={<IntercambioVentas />} />
              {/* Anulación parcial / refacturación rápida */}
              <Route path="devoluciones/anulaciones" element={<AnulacionVentas />} />
            </Route>

            <Route path="inventario">
              <Route index element={<InventarioHub />} />
              <Route path="abm"      element={<InventarioABM />} />
              <Route path="consulta" element={<ConsultaInventario />} />
              <Route path="ajuste" element={<AjusteInventario />} />
              <Route path="maestros" element={<MaestrosABM />} />
            </Route>

            <Route path="compras">
              <Route index element={<ComprasHub />} />
              <Route path="factura" element={<RegistroFactura />} />
              <Route path="pedidos" element={<PedidosABM />} />
              <Route path="proveedores" element={<ProveedoresABM />} />
              <Route path="consultas/facturas" element={<ListaFacturas />} />
              <Route path="consultas/reportes" element={<ReportesCompras />} />
              <Route path="devoluciones-intercambios" element={<DevolucionesIntercambiosHub />} />
              <Route path="devoluciones-intercambios/devoluciones" element={<OperacionesTipo tipo="DEVOLUCION" />} />
              <Route path="devoluciones-intercambios/intercambios" element={<OperacionesTipo tipo="INTERCAMBIO" />} />
              <Route path="devoluciones-intercambios/anulaciones" element={<OperacionesTipo tipo="ANULACION" />} />
            </Route>

            <Route path="caja"       element={<Caja />} />

            <Route path="configuracion">
              <Route index element={<ConfiguracionHub />} />
              <Route path="categorias" element={<CategoriasABM />} />
              <Route path="paises" element={<PaisesCiudadesABM />} />
              <Route path="comprobantes" element={<ComprobantesConfig />} />
              <Route path="empresa" element={<EmpresaConfig />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
  )
}
