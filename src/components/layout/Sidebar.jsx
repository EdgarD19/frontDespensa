import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  TrendingUp,
  Plus,
  Users,
  History,
  ClipboardList,
  Search,
  Settings,
  Truck,
  LogIn,
  LogOut,
  BarChart3,
  ChevronDown,
  FileText,
} from "lucide-react";

const grupos = [
  {
    label: "Ventas",
    icon: ShoppingCart,
    to: "/ventas",
    items: [
      { to: "/ventas/registro", label: "Nueva Venta", icon: Plus },
      { to: "/ventas/clientes", label: "Clientes", icon: Users },
      { to: "/ventas/historial", label: "Comprobantes", icon: FileText },
    ],
  },
  {
    label: "Compras",
    icon: TrendingUp,
    to: "/compras",
    items: [
      { to: "/compras/nueva", label: "Nueva Compra", icon: Plus },
      { to: "/compras/proveedores", label: "Proveedores", icon: Truck },
      { to: "/compras/historial", label: "Compras", icon: History },
    ],
  },
  {
    label: "Inventario",
    icon: Package,
    to: "/inventario",
    items: [
      { to: "/inventario/abm", label: "Productos", icon: Package },
      { to: "/inventario/consulta", label: "Stock", icon: Search },
      { to: "/inventario/ajuste", label: "Movimientos", icon: ClipboardList },
      { to: "/inventario/maestros", label: "Maestros", icon: Settings },
    ],
  },
  {
    label: "Caja",
    icon: Wallet,
    to: "/caja",
    items: [
      { to: "/caja/apertura", label: "Apertura y cierre", icon: LogIn },
      { to: "/caja/ingresos", label: "Ingresos y egresos", icon: LogOut, pronto: true },
      { to: "/caja/estado", label: "Estado de caja", icon: BarChart3, pronto: true },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const grupoActivoBase = (g) => location.pathname.startsWith(g.to);

  const [openGroups, setOpenGroups] = useState(() =>
    grupos.filter((g) => grupoActivoBase(g)).map((g) => g.label)
  );

  const toggleGroup = (label) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <aside
      style={{ width: collapsed ? "64px" : "240px" }}
      className="min-h-screen bg-[#0d0d0f] text-[#7a7a8c] flex flex-col border-r border-[#1e1e24] transition-all duration-300 ease-in-out flex-shrink-0"
    >
      <div className="h-16 flex items-center border-b border-[#1e1e24] flex-shrink-0 px-4 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-[#22c55e]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-[#f1f1f3] whitespace-nowrap leading-tight">Despensa</p>
              <p className="text-[10px] text-[#4a4a5a] whitespace-nowrap leading-tight">Panel de control</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {grupos.map((grupo) => {
          const GroupIcon = grupo.icon;
          const isActive = grupoActivoBase(grupo);
          const isOpen = openGroups.includes(grupo.label);

          return (
            <div key={grupo.label}>
              <div className={`flex items-center rounded-lg transition-all ${collapsed ? "justify-center" : ""}`}>
                <NavLink
                  to={grupo.to}
                  end
                  title={collapsed ? grupo.label : undefined}
                  className={[
                    "flex-1 flex items-center rounded-lg transition-all duration-200 overflow-hidden",
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-[#22c55e]/10 text-[#22c55e]"
                      : "text-[#5a5a6e] hover:bg-[#15151a] hover:text-[#b0b0c0]",
                  ].join(" ")}
                >
                  <GroupIcon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{grupo.label}</span>}
                </NavLink>
                {!collapsed && (
                  <button onClick={() => toggleGroup(grupo.label)}
                    className="p-2 text-[#3a3a4a] hover:text-[#8a8a9a] transition-colors">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  </button>
                )}
              </div>

              {!collapsed && isOpen && grupo.items?.length > 0 && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-[#1e1e24] pl-2 flex flex-col gap-0.5">
                  {grupo.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink key={item.to} to={item.to} end
                        className={({ isActive }) =>
                          [
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-all",
                            isActive
                              ? "bg-[#22c55e]/8 text-[#22c55e]"
                              : "text-[#5a5a6e] hover:bg-[#15151a] hover:text-[#b0b0c0]",
                            item.pronto ? "opacity-40 pointer-events-none" : "",
                          ].join(" ")
                        }>
                        <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-[#1e1e24]">
        <button onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Colapsar"}
          className={[
            "w-full flex items-center rounded-lg text-[#3a3a4a] hover:bg-[#15151a] hover:text-[#8a8a9a] transition-all duration-200 overflow-hidden",
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          ].join(" ")}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 flex-shrink-0" /> : <><PanelLeftClose className="w-4 h-4 flex-shrink-0" /><span className="text-sm font-medium whitespace-nowrap">Colapsar</span></>}
        </button>
      </div>
    </aside>
  );
}
