/*
  BrowserRouter: activa el sistema de rutas (activa el enrutamiento)
  Routes: Contenedor de rutas
  Route: Define una ruta
  Navigate: Redirecciona
*/
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';

import InventarioABM from './pages/inventario/abm/Inventario'
import ConsultaInventario from './pages/inventario/consulta/ConsultaInventario'
import Ventas from './pages/ventas/Ventas'
import Compras from './pages/compras/Compras'
import Caja from './pages/caja/Caja'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}> 
          <Route index element={<Navigate to="/inventario/abm" replace />} />
          <Route path="ventas"     element={<Ventas />} />
          <Route path="inventario">
            <Route index element={<Navigate to="/inventario/abm" replace />} />
            <Route path="abm"      element={<InventarioABM />} />
            <Route path="consulta" element={<ConsultaInventario />} />
          </Route>
          <Route path="compras"    element={<Compras />} />
          <Route path="caja"       element={<Caja />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
