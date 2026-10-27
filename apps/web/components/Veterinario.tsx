// Piezas visuales compartidas por el directorio público y la pantalla de
// elegir veterinario (dirección G). Solo presentación: no piden ni muestran
// ningún dato que las pantallas no tuvieran ya.

// Círculo con las iniciales — se reemplaza por la foto del veterinario cuando
// el perfil tenga una (mismo tamaño, así no cambia el layout).
export function Avatar({ nombre, apellido, size = 52 }: { nombre: string; apellido: string; size?: number }) {
  const iniciales = `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="va-titular"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--card2)",
        border: "1px solid var(--borde)",
        color: "var(--esmeralda)",
        fontSize: Math.round(size * 0.31),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {iniciales}
    </div>
  );
}

function Estrella({ llena }: { llena: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z"
        fill={llena ? "var(--esmeralda)" : "none"}
        stroke="var(--esmeralda)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Calificación con estrellas + número + cantidad. El número va con coma
// (4,9) como se escribe en Argentina.
export function Calificacion({ promedio, cantidad }: { promedio: number | null; cantidad: number }) {
  if (promedio == null) {
    return <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Sin calificaciones todavía</span>;
  }
  const redondeado = Math.round(promedio);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
      aria-label={`Calificación ${promedio.toFixed(1).replace(".", ",")} de 5, ${cantidad} calificaciones`}
    >
      <span style={{ display: "inline-flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Estrella key={n} llena={n <= redondeado} />
        ))}
      </span>
      <b>{promedio.toFixed(1).replace(".", ",")}</b>
      <span style={{ color: "var(--muted)" }}>({cantidad})</span>
    </span>
  );
}
