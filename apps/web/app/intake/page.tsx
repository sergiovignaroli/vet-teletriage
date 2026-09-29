"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BanderasRojasIntake, CasoResumen } from "@vet-teletriage/types";
import { hayBanderaRoja } from "@vet-teletriage/types";
import { apiPostAuth, ApiError } from "../../lib/api";
import { useSesionCliente } from "../../lib/sesion";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

// Sección 9 del contrato: Capa 1 = screening automático de banderas rojas.
// Etiquetas en lenguaje simple para el dueño de la mascota, no jerga clínica.
const BANDERAS: Array<{ campo: keyof BanderasRojasIntake; etiqueta: string }> = [
  { campo: "dificultadRespiratoria", etiqueta: "¿Le cuesta mucho respirar o jadea sin parar?" },
  { campo: "inconsciente", etiqueta: "¿Está inconsciente o no responde cuando lo llamás?" },
  { campo: "sangradoActivo", etiqueta: "¿Tiene un sangrado activo que no para?" },
  { campo: "sospechaIngestaToxico", etiqueta: "¿Sospechás que comió algo tóxico (veneno, medicación, planta)?" },
  { campo: "convulsionEnCurso", etiqueta: "¿Está convulsionando ahora o convulsionó hace muy poco?" },
  { campo: "noPuedeParseCaminar", etiqueta: "¿No puede pararse o caminar?" },
  { campo: "distensionAbdominal", etiqueta: "¿Tiene la panza muy hinchada y hace arcadas sin vomitar nada?" },
  { campo: "traumatismoMayor", etiqueta: "¿Tuvo un golpe fuerte (atropello, caída de altura)?" },
];

const BANDERAS_INICIALES: BanderasRojasIntake = {
  dificultadRespiratoria: false,
  inconsciente: false,
  sangradoActivo: false,
  sospechaIngestaToxico: false,
  convulsionEnCurso: false,
  noPuedeParseCaminar: false,
  distensionAbdominal: false,
  traumatismoMayor: false,
};

export default function IntakePage() {
  const router = useRouter();
  const { sesion } = useSesionCliente();

  const [banderas, setBanderas] = useState<BanderasRojasIntake>(BANDERAS_INICIALES);
  const [motivoConsulta, setMotivoConsulta] = useState("");
  const [especie, setEspecie] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // sesion === undefined: todavía no se leyó localStorage (primer render).
  // sesion === null: se leyó y no hay nadie logueado -> a /ingresar.
  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

  // El aviso se calcula en el cliente, en tiempo real, apenas se marca una
  // bandera — no espera a que el veterinario lo detecte (esa es la garantía
  // de la Sección 9: red de seguridad independiente del criterio individual).
  const mostrarAvisoEmergencia = useMemo(() => hayBanderaRoja(banderas), [banderas]);

  async function buscarVeterinario() {
    if (!sesion) return;
    setError(null);
    setEnviando(true);
    try {
      // honorarioDeclarado no va acá: lo declara el veterinario, libremente,
      // cuando toma el caso (ver PATCH /casos/:id/iniciar) — a esta altura
      // todavía no hay veterinario asignado.
      const caso = await apiPostAuth<CasoResumen>("/casos", sesion.accessToken, {
        banderas,
        contexto: { especie, motivoConsulta },
      });
      // Ya no hay un "te contactamos por WhatsApp" genérico: el cliente
      // pasa directo a elegir veterinario con el costo total a la vista
      // (Sergio, 2026-09-29).
      router.push(`/elegir-veterinario/${caso.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos registrar la consulta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!sesion) {
    // undefined (cargando) o null (ya redirigiendo) — no hay nada útil que mostrar.
    return null;
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Contanos qué pasa
      </h1>

      <section>
        <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>
          Primero, algunas preguntas rápidas
        </h2>
        {BANDERAS.map(({ campo, etiqueta }) => (
          <label key={campo} style={{ display: "block", margin: "10px 0", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={banderas[campo]}
              onChange={(e) => setBanderas((prev) => ({ ...prev, [campo]: e.target.checked }))}
              style={{ marginRight: 8 }}
            />
            {etiqueta}
          </label>
        ))}
      </section>

      {mostrarAvisoEmergencia && (
        // Banner NO removible: se muestra pero no bloquea que el usuario
        // siga completando el formulario y agende igual (Sección 9).
        <div
          role="alert"
          style={{
            background: "#fdecea",
            border: "2px solid #c0392b",
            color: "#c0392b",
            padding: "16px",
            margin: "16px 0",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Esto puede ser una emergencia. Te recomendamos ir a una guardia veterinaria presencial ahora.
          Podés igual continuar y agendar una consulta online si querés orientación mientras tanto.
        </div>
      )}

      <section>
        <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>
          Contanos un poco más
        </h2>
        <label style={{ display: "block", margin: "8px 0", fontSize: 14, fontWeight: 600 }}>
          Especie
          <input
            className="va-input"
            value={especie}
            onChange={(e) => setEspecie(e.target.value)}
            style={{ marginTop: 6 }}
          />
        </label>
        <label style={{ display: "block", margin: "16px 0 8px", fontSize: 14, fontWeight: 600 }}>
          ¿Qué está pasando?
          <textarea
            className="va-input"
            value={motivoConsulta}
            onChange={(e) => setMotivoConsulta(e.target.value)}
            rows={4}
            style={{ marginTop: 6, resize: "vertical" }}
          />
        </label>
      </section>

      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginTop: 4 }} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="va-boton"
        onClick={buscarVeterinario}
        disabled={!especie || !motivoConsulta || enviando}
        style={{ marginTop: 20 }}
      >
        {enviando ? "Enviando…" : "Ver veterinarios disponibles"}
      </button>

      <LegalFooter />
    </main>
  );
}
