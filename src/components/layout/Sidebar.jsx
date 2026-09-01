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
} from "lucide-react";

const links = [
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/compras", label: "Compras", icon: TrendingUp },
  { to: "/caja", label: "Caja", icon: Wallet },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      style={{ width: collapsed ? "64px" : "220px" }}
      className="min-h-screen bg-[#0d0d0f] text-[#7a7a8c] flex flex-col border-r border-[#1e1e24] transition-all duration-300 ease-in-out flex-shrink-0"
    >
      {/* Logo */}
      <div className="h-16 flex items-center border-b border-[#1e1e24] flex-shrink-0 px-4 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-[#22c55e]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-[#f1f1f3] whitespace-nowrap leading-tight">
                Despensa
              </p>
              <p className="text-[10px] text-[#4a4a5a] whitespace-nowrap leading-tight">
                Panel de control
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-[#3a3a4a] uppercase tracking-widest px-3 mb-2 mt-1">
            Menu
          </p>
        )}
        {links.map((link) => {
          const Icon = link.icon;
          const isActiveInventario =
            link.to === "/inventario" && location.pathname.startsWith("/inventario");
          return (
            <NavLink
              key={link.to}
              to={link.to}
              title={collapsed ? link.label : undefined}
              className={({ isActive }) => {
                const active = isActive || isActiveInventario;
                return [
                  "relative flex items-center rounded-lg transition-all duration-200 overflow-hidden group",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-[#22c55e]/10 text-[#22c55e]"
                    : "text-[#5a5a6e] hover:bg-[#15151a] hover:text-[#b0b0c0]",
                ].join(" ");
              }}
            >
              {({ isActive }) => {
                const active = isActive || isActiveInventario;
                return (
                  <>
                    {active && (
                      <span className="" />
                    )}
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>
                    )}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-[#1e1e24]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Colapsar"}
          className={[
            "w-full flex items-center rounded-lg text-[#3a3a4a] hover:bg-[#15151a] hover:text-[#8a8a9a] transition-all duration-200 overflow-hidden",
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          ].join(" ")}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
