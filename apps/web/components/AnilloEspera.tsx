// Reloj de la pantalla de espera (diseño aprobado): un anillo que se vacía a
// medida que corre el tiempo que tiene el veterinario para responder, con un
// puntito que gira. Solo presentación: el tiempo restante lo calcula la
// pantalla, igual que antes.
export function AnilloEspera({ restantes, total }: { restantes: number; total: number }) {
  const fraccion = total > 0 ? Math.max(0, Math.min(1, restantes / total)) : 0;
  const CIRC = 540.35;
  const mm = Math.floor(restantes / 60);
  const ss = String(restantes % 60).padStart(2, "0");
  return (
    <svg
      viewBox="0 0 200 200"
      width="220"
      height="220"
      role="img"
      aria-label={`Tiempo restante para que el veterinario responda: ${mm} minutos ${ss} segundos`}
      style={{ display: "block", margin: "0 auto" }}
    >
      <circle cx="100" cy="100" r="86" fill="#fbf8f0" stroke="#ddd3be" strokeWidth="12" />
      <circle
        cx="100"
        cy="100"
        r="86"
        fill="none"
        stroke="#0a6b52"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - fraccion)}
        transform="rotate(-90 100 100)"
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      <g className="va-orbita">
        <circle cx="100" cy="14" r="6" fill="#b4432d" />
      </g>
      <text x="100" y="108" textAnchor="middle" style={{ fontFamily: "Unbounded, Figtree, system-ui, sans-serif", fontWeight: 700, fontSize: 40 }} fill="#14302a">
        {mm}:{ss}
      </text>
      <text x="100" y="134" textAnchor="middle" style={{ fontFamily: "Figtree, system-ui, sans-serif", fontWeight: 600, fontSize: 13 }} fill="#4f625a">
        para que responda
      </text>
    </svg>
  );
}
