// Aviso de derechos, en todas las pantallas (Sergio, 2026-09-29).
//
// Marca (Sergio, 2026-11-05): todavía sin registro concedido en el INPI, así
// que el pie lleva el nombre con ™ y NO la leyenda "marcas registradas de …".
// Todo depende de MARCA_REGISTRADA (packages/types, reexportada por
// lib/datos-legales.ts): al conceder el INPI la marca se pone en true y
// aparecen ® y la leyenda de titularidad.
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
