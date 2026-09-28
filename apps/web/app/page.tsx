import Link from "next/link";
import { franjaHorariaDe, CARGO_PLATAFORMA } from "@vet-teletriage/types";

export default function HomePage() {
  const franja = franjaHorariaDe(new Date());

  return (
    <main style={{ maxWidth: 480, margin: "48px auto", fontFamily: "sans-serif" }}>
      <h1>Teletriage Veterinario</h1>
      <p>Orientación y evaluación de urgencia online. No reemplaza un examen físico ni constituye diagnóstico.</p>
      <p>
        Cargo de plataforma en este momento ({franja === "DIURNA" ? "horario diurno" : "horario nocturno"}):{" "}
        <strong>${CARGO_PLATAFORMA[franja]}</strong> + el honorario que fije el veterinario que te atienda.
      </p>
      <Link href="/intake">Empezar una consulta</Link>
    </main>
  );
}
