// Aviso de derechos, en todas las pantallas (Sergio, 2026-09-29).
//
// OJO — usa © (derecho de autor), no ® ni la frase "marca registrada": el
// derecho de autor sobre el nombre, el ícono y los textos es automático en
// Argentina (Convenio de Berna) desde que se crean, no hace falta ningún
// trámite. El derecho sobre la MARCA como marca (uso exclusivo en el
// rubro) sí requiere un registro otorgado por el INPI, y ese trámite —
// según el propio README del proyecto — todavía no está confirmado como
// completo (siguen pendientes razón social/CUIT en los documentos
// legales). Poner "marca registrada" o ® sin un registro efectivamente
// otorgado es, como mínimo, inexacto, y en Argentina es objetable ante el
// INPI. Quedó pendiente confirmar con Sergio si ya hay un registro
// otorgado — si lo hay, esta leyenda se actualiza a ® ese mismo día.
// Links a Términos y Contacto (Sergio, 2026-09-30) agregados acá porque
// este componente ya se renderiza en todas las pantallas — es el único
// lugar que garantiza que ambas páginas sean encontrables desde cualquier
// parte de la app, sin duplicar el link pantalla por pantalla.
import Link from "next/link";

export function LegalFooter() {
  const anio = new Date().getFullYear();
  return (
    <p
      style={{
        fontSize: 10.5,
        opacity: 0.45,
        textAlign: "center",
        marginTop: 40,
        lineHeight: 1.6,
      }}
    >
      <Link href="/terminos" style={{ color: "inherit" }}>
        Términos y Condiciones
      </Link>
      {" · "}
      <Link href="/contacto" style={{ color: "inherit" }}>
        Contacto
      </Link>
      <br />
      © {anio} Videollamada Animal. Todos los derechos reservados.
      <br />
      Prohibida su reproducción total o parcial sin autorización expresa.
    </p>
  );
}
