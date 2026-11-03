// La marca en el texto (Sergio, 2026-11-03): cada vez que el nombre aparece en
// un texto, va el logo chico adelante y el símbolo de marca registrada atrás,
// siempre juntos. En encabezados y pies se usa el mismo criterio.
import { LogoIcon } from "./Logo";
import { NOMBRE_COMERCIAL } from "../lib/datos-legales";
import { Sello } from "./Sello";

export function NombreMarca({ tono = "oscuro" }: { tono?: "oscuro" | "claro" }) {
  return (
    <span className="va-nm">
      <LogoIcon size="1.25em" tono={tono} />
      <span>{NOMBRE_COMERCIAL}</span>
      <Sello />
    </span>
  );
}
