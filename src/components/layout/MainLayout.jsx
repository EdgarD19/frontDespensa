import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import Sidebar from "./Sidebar";
import CargandoPantalla from "../ui/CargandoPantalla";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* El límite de Suspense está AQUÍ (dentro del layout): el sidebar
            permanece montado mientras baja el chunk de la pantalla destino. */}
        <main className="flex-1 p-6 overflow-auto">
          <Suspense fallback={<CargandoPantalla />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
