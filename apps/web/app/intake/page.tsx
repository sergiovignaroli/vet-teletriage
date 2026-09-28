"use client";

import { useMemo, useState } from "react";
import type { BanderasRojasIntake } from "@vet-teletriage/types";
import { hayBanderaRoja } from "@vet-teletriage/types";

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
  const [banderas, setBanderas] = useState<BanderasRojasIntake>(BANDERAS_INICIALES);
  const [motivoConsulta, setMotivoConsulta] = useState("");
  const [especie, setEspecie] = useState("");

  // El aviso se calcula en el cliente, en tiempo real, apenas se marca una
  // bandera — no espera a que el veterinario lo detecte (esa es la garantía
  // de la Sección 9: red de seguridad independiente del criterio individual).
  const mostrarAvisoEmergencia = useMemo(() => hayBanderaRoja(banderas), [banderas]);

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", fontFamily: "sans-serif" }}>
      <h1>Contanos qué pasa</h1>

      <section>
        <h2>Primero, algunas preguntas rápidas</h2>
        {BANDERAS.map(({ campo, etiqueta }) => (
          <label key={campo} style={{ display: "block", margin: "8px 0" }}>
            <input
              type="checkbox"
              checked={banderas[campo]}
              onChange={(e) => setBanderas((prev) => ({ ...prev, [campo]: e.target.checked }))}
            />{" "}
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
            fontWeight: "bold",
          }}
        >
          Esto puede ser una emergencia. Te recomendamos ir a una guardia veterinaria presencial ahora.
          Podés igual continuar y agendar una consulta online si querés orientación mientras tanto.
        </div>
      )}

      <section>
        <h2>Contanos un poco más</h2>
        <label style={{ display: "block", margin: "8px 0" }}>
          Especie
          <input value={especie} onChange={(e) => setEspecie(e.target.value)} style={{ display: "block" }} />
        </label>
        <label style={{ display: "block", margin: "8px 0" }}>
          ¿Qué está pasando?
          <textarea
            value={motivoConsulta}
            onChange={(e) => setMotivoConsulta(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      </section>

      <button type="button" disabled={!especie || !motivoConsulta}>
        Buscar veterinario disponible
      </button>
    </main>
  );
}
