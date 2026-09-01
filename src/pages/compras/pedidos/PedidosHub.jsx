import { ClipboardList, PackageCheck } from "lucide-react";

const SUB_MODULOS = [
  {
    label: "Generar Pedido",
    icon: ClipboardList,
  },
  {
    label: "Recibir Pedido",
    icon: PackageCheck,
  },
];

const cardClass =
  "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 transition-all duration-200 hover:border-[#22c55e]/40 hover:bg-[#13131a] aspect-[4/3]";

export default function PedidosHub() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Gestión de Pedidos</h1>
        <p className="text-sm text-[#5a5a6e]">Planificar y recibir pedidos a proveedores</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SUB_MODULOS.map((m) => {
          const { label, icon: Icon } = m;
          return (
            <div key={label} className={`${cardClass} cursor-default`} aria-disabled="true">
              <div className="flex flex-col items-center justify-center gap-3 opacity-40">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <Icon className="w-8 h-8" aria-hidden />
                </div>
                <p className="text-base font-semibold text-white leading-tight">{label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}