import { CentroAyuda } from "../../components/CentroAyuda";
import { NOMBRE_CON_MARCA } from "../../lib/datos-legales";

export const metadata = { title: `Ayuda · ${NOMBRE_CON_MARCA}` };

export default function AyudaTutorPage() {
  return <CentroAyuda rol="tutor" />;
}
