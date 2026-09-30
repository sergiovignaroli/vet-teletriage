"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CasoParaCliente } from "@vet-teletriage/types";
import { apiGet, apiPostAuth, ApiError } from "../../../lib/api";
import { useSesionCliente } from "../../../lib/sesion";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

// Cierra el circuito de calificación (Sergio, 2026-09-29): sin esta
// pantalla, POST /calificaciones existía en el backend pero nada en la app
// lo llamaba nunca — el sistema de estrellitas que sostiene el piso de
// calidad y los puntos-premio no tenía forma de alimentarse.
//
// No hay GET /casos/:id para cliente todavía, así que en vez de agregar un
// endpoint nuevo solo para esto, se reutiliza /casos/mios-cliente (que ya
// hay que pedir para la pantalla anterior) y se busca el caso puntual acá
// — mismo criterio de no multiplicar endpoints por pantalla que ya se usa
// en el resto de la app.
export default function CalificarPage() {
  const router = useRouter();
  const params = useParams<{ casoId: string }>();
  const casoId = params.casoId;
  const { sesion } = useSesionCliente();

  const [caso, setCaso] = useState<CasoParaCliente | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [estrellasHover, setEstrellasHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

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
        setError(e instanceof ApiError ? e.message : "No pudimos cargar el asesoramiento. Probá de nuevo.");
        setCaso(null);
      });
    return () => {
      cancelado = true;
    };
  }, [sesion, casoId]);

  async function enviar() {
    if (!sesion || !caso?.veterinario || estrellas < 1) return;
    setEnviando(true);
    setError(null);
    try {
      await apiPostAuth("/calificaciones", sesion.accessToken, {
        veterinarioId: caso.veterinario.id,
        casoId: caso.id,
        estrellas,
        comentario: comentario.trim() || undefined,
      });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar tu calificación. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!sesion || caso === undefined) return null;

  if (enviado) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", textAlign: "center" }}>
        <Logo size="md" marginBottom={28} />
        <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }}>
          Gracias por calificar
        </h1>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
          Tu opinión ayuda a que otros dueños elijan mejor.
        </p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none" }}>
          Volver al inicio
        </a>
        <LegalFooter />
      </main>
    );
  }

  if (!caso || !caso.veterinario) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", textAlign: "center" }}>
        <Logo size="md" marginBottom={28} />
        <p style={{ fontSize: 14, opacity: 0.7 }}>No encontramos ese asesoramiento.</p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none", marginTop: 20 }}>
          Volver al inicio
        </a>
        <LegalFooter />
      </main>
    );
  }

  if (caso.yaCalificado) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", textAlign: "center" }}>
        <Logo size="md" marginBottom={28} />
        <p style={{ fontSize: 14, opacity: 0.7 }}>Ya calificaste este asesoramiento — gracias.</p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none", marginTop: 20 }}>
          Volver al inicio
        </a>
        <LegalFooter />
      </main>
    );
  }

  const estrellasAMostrar = estrellasHover || estrellas;

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", textAlign: "center" }}>
      <Logo size="md" marginBottom={28} />

      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        ¿Cómo te fue con {caso.veterinario.nombre}?
      </h1>
      <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 20 }}>
        Asesoramiento sobre {caso.intake.especie.toLowerCase()} · {caso.intake.motivoConsulta}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }} role="radiogroup" aria-label="Calificación en estrellas">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setEstrellas(n)}
            onMouseEnter={() => setEstrellasHover(n)}
            onMouseLeave={() => setEstrellasHover(0)}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            aria-pressed={estrellas === n}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 34,
              lineHeight: 1,
              padding: 2,
              color: n <= estrellasAMostrar ? "var(--terracota)" : "rgba(64,53,47,0.2)",
            }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="va-input"
        placeholder="Contanos algo más (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
        style={{ marginBottom: 14, resize: "vertical", textAlign: "left" }}
      />

      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 8 }} role="alert">
          {error}
        </p>
      )}

      <button type="button" className="va-boton" onClick={enviar} disabled={enviando || estrellas < 1}>
        {enviando ? "Enviando…" : "Enviar calificación"}
      </button>

      <LegalFooter />
    </main>
  );
}
