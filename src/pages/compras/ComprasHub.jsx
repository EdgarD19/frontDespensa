import { Link } from "react-router-dom";
import { Truck, ShoppingCart, ClipboardList, FileText, BarChart3, RotateCcw } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass as iconClass } from "../../components/ui/hubStyles";

const MODULOS = [
  {
    to: "/compras/factura",
    label: "Nueva compra",
    descripcion: "Carga productos con la factura del proveedor y actualiza el stock.",
    icon: ShoppingCart,
  },
  {
    to: "/compras/pedidos",
    label: "Pedidos",
    descripcion: "Crea pedidos al proveedor y recepciona lo que llega.",
    icon: ClipboardList,
  },
  {
    to: "/compras/proveedores",
    label: "Proveedores",
    descripcion: "Agrega y actualiza los proveedores y sus datos de contacto.",
    icon: Truck,
  },
  {
    to: "/compras/consultas/facturas",
    label: "Historial de compras",
    descripcion: "Consulta las facturas de compra emitidas.",
    icon: FileText,
  },
  {
    to: "/compras/consultas/reportes",
    label: "Reportes de compras",
    descripcion: "Consulta el resumen de compras por proveedor y período.",
    icon: BarChart3,
  },
  {
    to: "/compras/devoluciones-intercambios",
    label: "Devoluciones e intercambios",
    descripcion: "Devuelve o intercambia productos con tus proveedores.",
    icon: RotateCcw,
  },
];

export default function ComprasHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Compras</h1>
          <p className="text-sm text-white/40">Selecciona un módulo para continuar</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULOS.map((m) => {
            const { to, label, descripcion, icon: Icon } = m;
            return (
              <Link key={label} to={to} className={cardClass}>
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={iconClass}>
                    <Icon className="w-8 h-8" aria-hidden />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-base font-semibold text-white leading-tight">{label}</p>
                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{descripcion}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
    </div>
  );
}
