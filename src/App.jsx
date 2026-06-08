import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import InventarioHub from './pages/inventario/InventarioHub'
import InventarioABM from './pages/inventario/abm/Inventario'
import ConsultaInventario from './pages/inventario/consulta/ConsultaInventario'
import AjusteInventario from './pages/inventario/ajuste/AjusteInventario'
import MaestrosABM from './pages/inventario/maestros/MaestrosABM'

import VentasHub from './pages/ventas/VentasHub'
import ClientesABM from './pages/ventas/clientes/abm/ClientesABM'
import RegistroVenta from './pages/ventas/registro-venta/RegistroVenta'
import HistorialVentas from './pages/ventas/historial/HistorialVentas'
import IngresosDashboard from './pages/ventas/ingresos/IngresosDashboard'
import ProductosMasVendidosDashboard from './pages/ventas/ingresos/ProductosMasVendidosDashboard'

import ComprasHub from './pages/compras/ComprasHub'
import ProveedoresABM from './pages/compras/proveedores/abm/ProveedoresABM'
import NuevaCompra from './pages/compras/nueva/NuevaCompra'
import HistorialCompras from './pages/compras/historial/HistorialCompras'

import Caja from './pages/caja/Caja'
import AperturaCaja from './pages/caja/apertura/AperturaCaja'
import MovimientosCaja from './pages/caja/movimientos/MovimientosCaja'
import DashboardFinanciero from './pages/caja/dashboard/DashboardFinanciero'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/usuarios" element={<ProtectedRoute adminOnly><MainLayout /></ProtectedRoute>}>
            <Route index element={<RegisterPage />} />
          </Route>

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/inventario" replace />} />

            <Route path="ventas">
              <Route index element={<VentasHub />} />
              <Route path="registro" element={<RegistroVenta />} />
              <Route path="clientes" element={<ClientesABM />} />
              <Route path="historial" element={<HistorialVentas />} />
              <Route path="ingresos" element={<IngresosDashboard />} />
              <Route path="mas-vendidos" element={<ProductosMasVendidosDashboard />} />
            </Route>

            <Route path="inventario">
              <Route index element={<InventarioHub />} />
              <Route path="abm" element={<InventarioABM />} />
              <Route path="consulta" element={<ConsultaInventario />} />
              <Route path="ajuste" element={<AjusteInventario />} />
              <Route path="maestros" element={<MaestrosABM />} />
            </Route>

            <Route path="compras">
              <Route index element={<ComprasHub />} />
              <Route path="nueva" element={<NuevaCompra />} />
              <Route path="proveedores" element={<ProveedoresABM />} />
              <Route path="historial" element={<HistorialCompras />} />
            </Route>

            <Route path="caja">
              <Route index element={<Caja />} />
              <Route path="apertura" element={<AperturaCaja />} />
              <Route path="movimientos" element={<MovimientosCaja />} />
              <Route path="dashboard-financiero" element={<ProtectedRoute adminOnly><DashboardFinanciero /></ProtectedRoute>} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
