import PageHeader from "../../../components/ui/PageHeader";
import CompraEspontanea from "./CompraEspontanea";

export default function RegistroFactura() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <PageHeader backTo="/compras" title="Nueva compra" />
      <CompraEspontanea />
    </div>
  );
}
