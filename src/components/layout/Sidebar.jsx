import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Wallet,
  ChevronLeft,
  ChevronDown,
  DollarSign,
} from "lucide-react";

const links = [
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  {
    label: "Inventario",
    icon: Package,
    children: [
      { to: "/inventario/abm", label: "Gestión de productos" },
      { to: "/inventario/consulta", label: "Consulta" },
    ],
  },
  { to: "/compras", label: "Compras", icon: DollarSign },
  { to: "/caja", label: "Caja", icon: Wallet },
];


/* Estilo del .txt: fondo #171717, campos con sombra inset, botones #252525 */
const navItemClass =
  "flex items-center gap-3 px-4 py-2.5 rounded-[25px] mb-1.5 transition-all duration-300 shadow-[inset_2px_5px_10px_rgb(5,5,5)]";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const inventarioExpanded = location.pathname.startsWith("/inventario");

  return (
    <aside
      className={`min-h-screen bg-[#171717] text-[#d3d3d3] flex flex-col rounded-r-[25px] transition-all duration-300 hover:border-l hover:border-black ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="p-4 flex items-center gap-3 rounded-br-[25px] shadow-[inset_2px_5px_10px_rgb(5,5,5)] bg-[#171717]">
        <div className="w-9 h-9 rounded-full bg-[#252525] flex items-center justify-center flex-shrink-0 text-white">
          <DollarSign className="w-4 h-4" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-base font-bold text-white">Despensa</h1>
          </div>
        )}
      </div>

      <nav className="flex flex-col p-3 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          if (link.children) {
            return (
              <div key={link.label}>
                <div
                  className={`${navItemClass} bg-[#171717] text-[#d3d3d3] ${
                    inventarioExpanded ? "bg-[#252525]" : ""
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{link.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          inventarioExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </div>
                {!collapsed && (
                  <div className="ml-4 pl-3 mt-0.5 mb-2 border-l border-[#30363d]/50">
                    {link.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 text-sm transition-all ${
                            isActive
                              ? "bg-black text-white"
                              : "text-[#8b949e] hover:text-[#d3d3d3] hover:bg-[#252525]/50"
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${navItemClass} ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-[#171717] text-[#d3d3d3] hover:bg-[#252525] hover:text-white"
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center gap-2 px-4 py-2.5 mx-3 mb-3 bg-[#252525] hover:bg-black text-white rounded-[25px] text-sm transition-all duration-300"
      >
        <ChevronLeft
          className={`w-4 h-4 flex-shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
        />
        {!collapsed && <span>Colapsar</span>}
      </button>
    </aside>
  );
}
