import { CentroAyuda } from "../../../components/CentroAyuda";
import { NOMBRE_CON_MARCA } from "../../../lib/datos-legales";

export const metadata = { title: `Ayuda para veterinarios · ${NOMBRE_CON_MARCA}` };

export default function AyudaVeterinarioPage() {
  return <CentroAyuda rol="veterinario" />;
}
