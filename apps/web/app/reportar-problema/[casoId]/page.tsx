"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CasoParaCliente } from "@vet-teletriage/types";
import { apiGet, apiPostAuth, ApiError } from "../../../lib/api";
import { useSesionCliente } from "../../../lib/sesion";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

// "Disputa de calidad" es el nombre interno (Sección 10 del contrato) — de
// cara al cliente esto es "reportar un problema", nunca esa jerga. Como
// mucho resuelve en reembolso del cargo de plataforma (Sergio, 2026-09-29:
// esto no toca el honorario ya liquidado al veterinario ni su habilitación,
// esos son otro circuito — identidad, no calidad).
//
// Mismo criterio que /calificar: no hay GET /casos/:id para cliente, así
// que se reutiliza /casos/mios-cliente y se busca el caso puntual acá en
// vez de sumar un endpoint nuevo solo para esta pantalla.
export default function ReportarProblemaPage() {
  const router = useRouter();
  const params = useParams<{ casoId: string }>();
  const casoId = params.casoId;
  const { sesion } = useSesionCliente();

  const [caso, setCaso] = useState<CasoParaCliente | null | undefined>(undefined);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion || !casoId) return;
    let cancelado = false;
    apiGet<CasoParaCliente[]>("/casos/mios-cliente", sesion.accessToken)
      .then((casos) => {
        if (cancelado) return;
        setCaso(casos.find((c) => c.id === casoId) ?? null);
      })
      .catch((e) => {
        if (cancelado) return;
        setError(e instanceof ApiError ? e.message : "No pudimos cargar la consulta. Probá de nuevo.");
        setCaso(null);
      });
    return () => {
      cancelado = true;
    };
  }, [sesion, casoId]);

  async function enviar() {
    if (!sesion || !caso || !motivo.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await apiPostAuth("/disputas/calidad", sesion.accessToken, { casoId: caso.id, motivo: motivo.trim() });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos registrar el reporte. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const envoltorio = (contenido: React.ReactNode) => (
    <main
      style={{
        maxWidth: 380,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 22px",
        textAlign: "center",
      }}
    >
      <Logo size="md" marginBottom={28} />
      {contenido}
      <LegalFooter />
    </main>
  );

  if (!sesion || caso === undefined) return null;

  if (enviado) {
    return envoltorio(
      <>
        <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }}>
          Listo, lo recibimos
        </h1>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
          Alguien del equipo va a revisar tu caso. Si corresponde un reembolso del cargo de plataforma, te
          va a llegar una notificación.
        </p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none" }}>
          Volver al inicio
        </a>
      </>,
    );
  }

  if (!caso) {
    return envoltorio(
      <>
        <p style={{ fontSize: 14, opacity: 0.7 }}>No encontramos esa consulta.</p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none", marginTop: 20 }}>
          Volver al inicio
        </a>
      </>,
    );
  }

  if (caso.disputaCalidad) {
    const { estado, resolucion } = caso.disputaCalidad;
    return envoltorio(
      <>
        <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }}>
          Ya reportaste esta consulta
        </h1>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
          {estado === "RESUELTA"
            ? resolucion ?? "Tu reporte ya fue resuelto."
            : "Todavía lo estamos revisando — te avisamos apenas haya una resolución."}
        </p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none" }}>
          Volver al inicio
        </a>
      </>,
    );
  }

  return envoltorio(
    <>
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        ¿Qué pasó?
      </h1>
      <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 20 }}>
        Contanos qué salió mal con la consulta sobre {caso.intake.especie.toLowerCase()}. Como mucho, esto
        puede resolver en el reembolso del cargo de plataforma — nunca afecta al veterinario que te atendió
        más allá de la revisión.
      </p>

      <textarea
        className="va-input"
        placeholder="Contanos qué pasó"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={5}
        style={{ marginBottom: 14, resize: "vertical", textAlign: "left" }}
      />

      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 8 }} role="alert">
          {error}
        </p>
      )}

      <button type="button" className="va-boton" onClick={enviar} disabled={enviando || !motivo.trim()}>
        {enviando ? "Enviando…" : "Enviar reporte"}
      </button>
    </>,
  );
}
