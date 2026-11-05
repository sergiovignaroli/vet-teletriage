import Link from "next/link";
import { Pantalla, MarcaGrande } from "../components/Pantalla";

// Página que se muestra cuando la dirección no existe: con la misma marca y el
// mismo marco que el resto de la plataforma, y un único camino de vuelta.
export default function NoEncontrada() {
  return (
    <Pantalla titulo="No encontramos esa página" variante="menta" ancho={420} centrar volver="/">
      <MarcaGrande />
      <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 0 24px" }}>
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>
      <Link href="/" className="va-boton" style={{ textDecoration: "none" }}>
        Ir al inicio
      </Link>
    </Pantalla>
  );
}
