import { Link } from "react-router-dom";
import { Truck, ShoppingCart, ClipboardList } from "lucide-react";

const MODULOS = [
  {
    to: "/compras/factura",
    label: "Registro de Compra",
    descripcion: "Ingreso inmediato de productos con factura del proveedor.",
    icon: ShoppingCart,
  },
  {
    to: "/compras/pedidos",
    label: "Gestión de Pedidos",
    descripcion: "Crear solicitudes de compra y recepcionar pedidos pendientes.",
    icon: ClipboardList,
  },
  {
    to: "/compras/proveedores",
    label: "Gestión de Proveedores",
    descripcion: "Registro de distribuidores, rubros de productos y datos de contacto.",
    icon: Truck,
  },
];

const cardClass =
  "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 transition-all duration-200 hover:border-[#22c55e]/40 hover:bg-[#13131a] aspect-[4/3]";

export default function ComprasHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Compras</h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona un módulo para continuar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS.map((m) => {
          const { to, label, descripcion, icon: Icon } = m;
          return (
            <Link key={label} to={to} className={cardClass}>
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <Icon className="w-8 h-8" aria-hidden />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-semibold text-white leading-tight">{label}</p>
                  <p className="text-xs text-[#5a5a6e] leading-relaxed line-clamp-2">{descripcion}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
