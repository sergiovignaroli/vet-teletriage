"use client";

// Preguntas nuevas del Centro de ayuda (Sergio, 2026-11-03): las que dejan los
// tutores y veterinarios desde el botón "Ayuda". El administrador las contesta
// acá y la respuesta le aparece a quien preguntó dentro de la plataforma.
// También puede marcarlas como atendidas sin escribir respuesta.
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, ApiError } from "../lib/api";

interface PreguntaAdmin {
  id: string;
  rol: "CLIENTE" | "VETERINARIO";
  autor: string;
  texto: string;
  respuesta: string | null;
  atendida: boolean;
  creadaEl: string;
}

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Item({ p, token, onListo }: { p: PreguntaAdmin; token: string; onListo: () => void }) {
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await apiPatch(`/ayuda/preguntas/${p.id}`, token, { respuesta });
      onListo();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--borde)", borderRadius: 14, padding: 16, background: "var(--card)", marginBottom: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        {p.rol === "VETERINARIO" ? "Veterinario" : "Tutor"} · {p.autor} · {FECHA.format(new Date(p.creadaEl))}
      </div>
      <p style={{ fontSize: 14, margin: "0 0 10px", lineHeight: 1.5 }}>{p.texto}</p>
      {p.atendida ? (
        <p style={{ fontSize: 13, margin: 0, color: "var(--muted)" }}>
          {p.respuesta ? <><b>Respondida:</b> {p.respuesta}</> : "Marcada como atendida (sin respuesta escrita)."}
        </p>
      ) : (
        <>
          <textarea
            className="va-input"
            placeholder="Respuesta (la ve quien preguntó dentro de la plataforma). Podés dejarla vacía y marcarla como atendida."
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            rows={3}
            maxLength={2000}
            style={{ marginBottom: 8, resize: "vertical" }}
          />
          {error && (
            <p style={{ color: "var(--terracota)", fontSize: 12, marginBottom: 8 }} role="alert">
              {error}
            </p>
          )}
          <button type="button" className="va-boton" style={{ width: "auto", padding: "0 16px" }} onClick={enviar} disabled={enviando}>
            {enviando ? "…" : respuesta.trim() ? "Responder" : "Marcar como atendida"}
          </button>
        </>
      )}
    </div>
  );
}

export function PreguntasAyudaAdmin({ token }: { token: string }) {
  const [lista, setLista] = useState<PreguntaAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await apiGet<PreguntaAdmin[]>("/ayuda/preguntas", token));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar las preguntas de ayuda.");
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sinAtender = lista?.filter((p) => !p.atendida).length ?? 0;
  return (
    <>
      <h2 className="va-etiqueta" style={{ marginTop: 28, marginBottom: 10 }}>
        Preguntas de ayuda {lista && `(${sinAtender} sin atender)`}
      </h2>
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      {lista && lista.length === 0 && <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 20 }}>Todavía no hay preguntas.</p>}
      {lista?.map((p) => (
        <Item key={p.id} p={p} token={token} onListo={cargar} />
      ))}
    </>
  );
}
