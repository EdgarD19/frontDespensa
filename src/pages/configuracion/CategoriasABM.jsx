import { SeccionCategorias } from "../inventario/maestros/MaestrosABM";

export default function CategoriasABM() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">
          Categorías y Subcategorías
        </h1>
        <p className="text-sm text-[#5a5a6e]">
          Gestión de categorías y subcategorías de productos
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 sm:p-5">
        <SeccionCategorias />
      </div>
    </div>
  );
}