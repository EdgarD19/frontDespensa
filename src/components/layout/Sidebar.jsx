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
  Settings,
} from "lucide-react";

const links = [
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/compras", label: "Compras", icon: TrendingUp },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      style={{ width: collapsed ? "92px" : "220px" }}
      className="sticky top-0 h-screen overflow-hidden flex-shrink-0 flex flex-col bg-white/[0.03] text-white/50 border-r border-white/10 transition-all duration-300 ease-in-out"
    >
      {/* Logo */}
      <div className="h-16 flex items-center border-b border-white/10 flex-shrink-0 px-4 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-none bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-[var(--accent)]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-white whitespace-nowrap leading-tight">
                Despensa
              </p>
              <p className="text-[10px] text-white/30 whitespace-nowrap leading-tight">
                Panel de control
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav: siempre visible, sin scroll */}
      <nav className="flex flex-col gap-2 p-3 flex-1">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-1">
            Menu
          </p>
        )}
        {links.map((link) => {
          const Icon = link.icon;
          const isActiveInventario =
            link.to === "/inventario" && location.pathname.startsWith("/inventario");
          const isActiveConfiguracion =
            link.to === "/configuracion" && location.pathname.startsWith("/configuracion");
          return (
            <NavLink
              key={link.to}
              to={link.to}
              title={collapsed ? link.label : undefined}
              className={({ isActive }) => {
                const active = isActive || isActiveInventario || isActiveConfiguracion;
                return [
                  "relative flex items-center rounded-none transition-all duration-200 overflow-hidden group",
                  // Colapsado: iconos grandes y MÁS SEPARADOS (más padding vertical)
                  collapsed
                    ? "justify-center px-0 py-4"
                    : "gap-3.5 px-3 py-3",
                  active
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-white/40 hover:bg-[#15151a] hover:text-[#b0b0c0]",
                ].join(" ");
              }}
            >
              {({ isActive }) => {
                const active = isActive || isActiveInventario || isActiveConfiguracion;
                return (
                  <>
                    {active && (
                      <span aria-hidden="true" className="absolute left-0 top-0 h-full w-[3px] bg-[var(--accent)]" />
                    )}
                    {/* Iconos grandes en ambos estados */}
                    <Icon className={collapsed ? "w-6 h-6 flex-shrink-0" : "w-5 h-5 flex-shrink-0"} />
                    {!collapsed && (
                      <span className="text-[15px] font-medium whitespace-nowrap">{link.label}</span>
                    )}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse button: siempre a la vista (sticky h-screen del aside lo garantiza) */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Colapsar"}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={[
            "w-full flex items-center rounded-none text-white/50 hover:bg-[#15151a] hover:text-white transition-all duration-200 overflow-hidden",
            collapsed ? "justify-center px-0 py-4" : "gap-3.5 px-3 py-3",
          ].join(" ")}
        >
          {collapsed
            ? <PanelLeftOpen className="w-6 h-6 flex-shrink-0" />
            : (
              <>
                <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
                <span className="text-[15px] font-medium whitespace-nowrap">Colapsar</span>
              </>
            )}
        </button>
      </div>
    </aside>
  );
}
