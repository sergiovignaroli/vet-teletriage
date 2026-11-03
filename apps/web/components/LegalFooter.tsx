// Aviso de derechos, en todas las pantallas (Sergio, 2026-09-29).
//
// Marca (Sergio, 2026-11-03): "Videollamada Animal" y su logo son marca
// registrada. El pie lleva siempre el logo junto al nombre, el símbolo ® y la
// leyenda de titularidad. Todo depende de MARCA_REGISTRADA en
// lib/datos-legales.ts: si el registro del INPI no estuviera otorgado, usar ®
// o "marca registrada" es objetable — ahí se cambia a false y todo pasa a ™.
// Links a Términos, Privacidad y Contacto (Sergio, 2026-09-30) agregados
// acá porque este componente ya se renderiza en todas las pantallas — es
// el único lugar que garantiza que las tres páginas sean encontrables
// desde cualquier parte de la app, sin duplicar el link pantalla por
// pantalla.
import Link from "next/link";
import { RedesFooter } from "./RedesFooter";
import { NombreMarca } from "./Marca";
import { MARCA_REGISTRADA, TITULAR } from "../lib/datos-legales";

export function LegalFooter() {
  const anio = new Date().getFullYear();
  return (
    <div>
    <p
      style={{
        fontSize: 12,
        color: "var(--muted)",
        textAlign: "center",
        marginTop: 40,
        lineHeight: 1.6,
      }}
    >
      <Link href="/terminos" style={{ color: "inherit" }}>
        Términos y Condiciones
      </Link>
      {" · "}
      <Link href="/privacidad" style={{ color: "inherit" }}>
        Privacidad
      </Link>
      {" · "}
      <Link href="/contacto" style={{ color: "inherit" }}>
        Contacto
      </Link>
      {" · "}
      <Link href="/datos-legales" style={{ color: "inherit" }}>
        Datos legales
      </Link>
      <br />
      © {anio} <NombreMarca />. Todos los derechos reservados.
      {MARCA_REGISTRADA && (
        <>
          <br />
          <NombreMarca /> y su logo son marcas registradas de {TITULAR}.
        </>
      )}
      <br />
      Prohibida su reproducción total o parcial sin autorización expresa.
    </p>
    <RedesFooter />
    </div>
  );
}
