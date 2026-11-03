import { SIMBOLO_MARCA } from "../lib/datos-legales";

// Símbolo de marca (® o ™ según lib/datos-legales.ts), chico y elevado,
// siempre pegado al nombre.
export function Sello() {
  return (
    <sup className="va-sello" aria-label={SIMBOLO_MARCA === "®" ? "marca registrada" : "marca"}>
      {SIMBOLO_MARCA}
    </sup>
  );
}
