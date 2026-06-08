import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
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
  UserCircle,
  AlertTriangle,
} from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isAuthenticated } = useAuth();

  const grupos = [
    {
      label: "Ventas",
      icon: ShoppingCart,
      to: "/ventas",
      items: [
        { to: "/ventas/registro", label: "Nueva Venta", icon: Plus },
        { to: "/ventas/clientes", label: "Clientes", icon: Users },
        { to: "/ventas/historial", label: "Comprobantes", icon: FileText },
        { to: "/ventas/ingresos", label: "Ingresos", icon: BarChart3 },
        { to: "/ventas/mas-vendidos", label: "M\u00e1s vendidos", icon: TrendingUp },
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
        { to: "/caja/movimientos", label: "Ingresos y egresos", icon: LogOut },
        { to: "/caja/estado", label: "Estado de caja", icon: BarChart3, pronto: true },
        ...(isAdmin ? [{ to: "/caja/dashboard-financiero", label: "Dashboard Financiero", icon: BarChart3 }] : []),
    ],
  },
];

  const configGrupo = {
    label: "Configuracion",
    icon: Settings,
    to: "#",
    items: [
      { to: "/usuarios", label: "Usuarios", icon: Users },
    ],
  };

  const grupoActivoBase = (g) => location.pathname.startsWith(g.to);

  const [openGroups, setOpenGroups] = useState(() =>
    grupos.filter((g) => grupoActivoBase(g)).map((g) => g.label)
  );

  const [configOpen, setConfigOpen] = useState(() => grupoActivoBase(configGrupo));

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
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-[#22c55e]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#f1f1f3] whitespace-nowrap leading-tight">Despensa</p>
              <p className="text-[10px] text-[#4a4a5a] whitespace-nowrap leading-tight">Panel de control</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setShowLogoutConfirm(true)}
            title="Cerrar sesion"
            className="p-1.5 rounded-md text-[#3a3a4a] hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {isAuthenticated && !collapsed && (
        <div className="px-4 py-3 border-b border-[#1e1e24] flex items-center gap-2.5">
          <UserCircle className="w-8 h-8 text-[#5a5a6e]" />
          <div className="overflow-hidden min-w-0">
            <p className="text-sm text-white truncate">{user?.nombre || user?.username}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
              isAdmin ? "bg-yellow-500/10 text-yellow-400" : "bg-[#22c55e]/10 text-[#22c55e]"
            }`}>
              {user?.rol || "CAJERO"}
            </span>
          </div>
        </div>
      )}

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

      {isAdmin && !collapsed && (
        <div className="p-2 border-t border-[#1e1e24]">
          <div>
            <div className="flex items-center rounded-lg">
              <button onClick={() => setConfigOpen(!configOpen)}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 overflow-hidden text-[#5a5a6e] hover:bg-[#15151a] hover:text-[#b0b0c0]">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">Configuracion</span>
              </button>
              <button onClick={() => setConfigOpen(!configOpen)}
                className="p-2 text-[#3a3a4a] hover:text-[#8a8a9a] transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${configOpen ? "" : "-rotate-90"}`} />
              </button>
            </div>
            {configOpen && (
              <div className="ml-3 mt-0.5 mb-1 border-l border-[#1e1e24] pl-2 flex flex-col gap-0.5">
                <NavLink to="/usuarios" end
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-all",
                      isActive
                        ? "bg-[#22c55e]/8 text-[#22c55e]"
                        : "text-[#5a5a6e] hover:bg-[#15151a] hover:text-[#b0b0c0]",
                    ].join(" ")
                  }>
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Usuarios</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}

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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-[#1a1f2e] rounded-xl border border-white/10 w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Cerrar sesion</h3>
                <p className="text-sm text-white/40">Seguro de que quieres cerrar sesion?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-all text-sm">
                Cancelar
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); navigate("/login"); }}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-medium">
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
