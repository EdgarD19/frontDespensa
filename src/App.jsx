/*
  BrowserRouter: activa el sistema de rutas (activa el enrutamiento)
  Routes: Contenedor de rutas
  Route: Define una ruta
  Navigate: Redirecciona
*/
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';

import InventarioHub from './pages/inventario/InventarioHub'
import InventarioABM from './pages/inventario/abm/Inventario'
import ConsultaInventario from './pages/inventario/consulta/ConsultaInventario'
import AjusteInventario from './pages/inventario/ajuste/AjusteInventario'

import VentasHub from './pages/ventas/VentasHub'
import ClientesABM from './pages/ventas/clientes/abm/ClientesABM'

import Compras from './pages/compras/Compras'

import Caja from './pages/caja/Caja'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}> 
          <Route index element={<Navigate to="/inventario" replace />} />

          <Route path="ventas"> 
            <Route index element={<VentasHub />} />
            <Route path="clientes" element={<ClientesABM />} />
          </Route>
    
          <Route path="inventario">
            <Route index element={<InventarioHub />} />
            <Route path="abm"      element={<InventarioABM />} />
            <Route path="consulta" element={<ConsultaInventario />} />
            <Route path="ajuste" element={<AjusteInventario />} />
          </Route>

          <Route path="compras"    element={<Compras />} />

          <Route path="caja"       element={<Caja />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
