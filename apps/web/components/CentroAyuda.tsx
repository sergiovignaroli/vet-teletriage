"use client";

// Centro de ayuda (Sergio, 2026-11-03): guía de cada función, preguntas
// frecuentes y un formulario para dejar una pregunta nueva. Una pantalla para el
// tutor (/ayuda) y otra para el veterinario (/veterinario/ayuda), con el mismo
// marco de siempre (Pantalla) y el contenido de lib/ayuda-contenido.ts.
// Las guías y preguntas frecuentes se pueden leer sin sesión; dejar una
// pregunta nueva requiere haber ingresado (así sabemos a quién responder, sin
// pedir ni mostrar datos de contacto).
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPostAuth, ApiError } from "../lib/api";
import { useSesionCliente } from "../lib/sesion";
import { useSesionVeterinario } from "../lib/sesion-veterinario";
import {
  FAQ_TUTOR,
  FAQ_VETERINARIO,
  GUIA_TUTOR,
  GUIA_VETERINARIO,
  type ItemAyuda,
} from "../lib/ayuda-contenido";
import { Pantalla } from "./Pantalla";

const MAX = 600;
const MIN = 8;

interface PreguntaPropia {
  id: string;
  texto: string;
  respuesta: string | null;
  atendida: boolean;
  creadaEl: string;
}

const FECHA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

function Acordeon({ items }: { items: ItemAyuda[] }) {
  return (
    <>
      {items.map((it) => (
        <details key={it.id} className="va-ayuda-item">
          <summary>{it.titulo}</summary>
          <div>
            {it.cuerpo?.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {it.pasos && (
              <ol>
                {it.pasos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            )}
          </div>
        </details>
      ))}
    </>
  );
}

export function CentroAyuda({ rol }: { rol: "tutor" | "veterinario" }) {
  const esVet = rol === "veterinario";
  const { sesion: sesionTutor } = useSesionCliente();
  const { sesion: sesionVet } = useSesionVeterinario();
  const sesion = esVet ? sesionVet : sesionTutor;
  const token = sesion ? sesion.accessToken : null;
  const cargandoSesion = sesion === undefined;

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [mias, setMias] = useState<PreguntaPropia[]>([]);

  const cargarMias = useCallback(async () => {
    if (!token) return;
    try {
      setMias(await apiGet<PreguntaPropia[]>("/ayuda/preguntas/mias", token));
    } catch {
      // Es un extra: si falla, la ayuda sigue funcionando.
    }
  }, [token]);

  useEffect(() => {
    cargarMias();
  }, [cargarMias]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setEnviada(false);
    setEnviando(true);
    try {
      await apiPostAuth("/ayuda/preguntas", token, { texto });
      setTexto("");
      setEnviada(true);
      await cargarMias();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar tu pregunta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const guia = esVet ? GUIA_VETERINARIO : GUIA_TUTOR;
  const faq = esVet ? FAQ_VETERINARIO : FAQ_TUTOR;
  const volver = esVet ? (sesionVet ? "/panel-veterinario" : "/ingresar-veterinario") : sesionTutor ? "/panel" : "/";
  const ingresar = esVet ? "/ingresar-veterinario" : "/ingresar";
  const restantes = MAX - texto.length;
  const puedeEnviar = !enviando && texto.trim().length >= MIN;

  return (
    <Pantalla titulo="Ayuda" variante={esVet ? "terracota" : "menta"} ancho={560} volver={volver}>
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 6 }}>
        {esVet ? "Ayuda para veterinarios" : "¿En qué te ayudamos?"}
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        {esVet
          ? "Cómo registrarte y usar la plataforma, cómo funcionan los cobros y respuestas a lo que más se pregunta."
          : "Cómo usar cada parte de la plataforma y respuestas a lo que más se pregunta."}
      </p>

      <nav className="va-ayuda-atajos" aria-label="Secciones de la ayuda">
        <a className="va-chip-boton" href="#guia">
          Guía paso a paso
        </a>
        <a className="va-chip-boton" href="#preguntas">
          Preguntas frecuentes
        </a>
        <a className="va-chip-boton" href="#nueva">
          Hacer una pregunta
        </a>
      </nav>

      <h2 id="guia" className="va-etiqueta va-ayuda-seccion">
        {esVet ? "Guía para usar la plataforma" : "Guía de cada función"}
      </h2>
      <Acordeon items={guia} />

      <h2 id="preguntas" className="va-etiqueta va-ayuda-seccion">
        Preguntas frecuentes
      </h2>
      <Acordeon items={faq} />

      <h2 id="nueva" className="va-etiqueta va-ayuda-seccion">
        ¿No encontraste lo que buscabas?
      </h2>
      <div className="va-tarjeta" style={{ padding: 16 }}>
        {cargandoSesion ? (
          <p style={{ fontSize: 14, margin: 0, color: "var(--muted)" }}>Cargando…</p>
        ) : !token ? (
          <p style={{ fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>
            Para dejar una pregunta nueva tenés que ingresar, así te podemos responder acá mismo.{" "}
            <Link href={ingresar} style={{ color: "var(--esmeralda)", fontWeight: 700 }}>
              Ingresar
            </Link>
          </p>
        ) : (
          <form onSubmit={enviar}>
            <label htmlFor="pregunta-ayuda" style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Escribí tu pregunta
            </label>
            <textarea
              id="pregunta-ayuda"
              className="va-input"
              rows={4}
              maxLength={MAX}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={esVet ? "Por ejemplo: ¿cómo cambio el email de mi cuenta de PayPal?" : "Por ejemplo: ¿puedo cambiar de veterinario después de pagar?"}
              style={{ resize: "vertical", minHeight: 96 }}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 12px", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>No incluyas datos de contacto: te respondemos acá, dentro de la plataforma.</span>
              <span aria-live="off">{restantes}</span>
            </div>
            {error && (
              <p style={{ color: "var(--terracota)", fontSize: 13, margin: "0 0 10px" }} role="alert">
                {error}
              </p>
            )}
            {enviada && (
              <p style={{ color: "var(--esmeralda)", fontSize: 13.5, fontWeight: 700, margin: "0 0 10px" }} role="status">
                Recibimos tu pregunta. Cuando la respondamos, la vas a ver acá abajo.
              </p>
            )}
            <button type="submit" className="va-boton" disabled={!puedeEnviar}>
              {enviando ? "Enviando…" : "Enviar pregunta"}
            </button>
          </form>
        )}
      </div>

      {mias.length > 0 && (
        <>
          <h2 className="va-etiqueta va-ayuda-seccion">Tus preguntas</h2>
          {mias.map((p) => (
            <div key={p.id} className="va-tarjeta" style={{ padding: "12px 16px", marginBottom: 8, textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{FECHA.format(new Date(p.creadaEl))}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{p.texto}</div>
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px solid var(--borde)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: p.respuesta ? "var(--texto)" : "var(--muted)",
                }}
              >
                {p.respuesta ? (
                  <>
                    <b style={{ color: "var(--esmeralda)" }}>Respuesta: </b>
                    {p.respuesta}
                  </>
                ) : p.atendida ? (
                  "La revisamos y la tendremos en cuenta para mejorar la ayuda."
                ) : (
                  "Esperando respuesta."
                )}
              </div>
            </div>
          ))}
        </>
      )}

      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 22, lineHeight: 1.6 }}>
        También podés ver los{" "}
        <Link href="/terminos" style={{ color: "var(--esmeralda)" }}>
          Términos y Condiciones
        </Link>
        {esVet && (
          <>
            , el{" "}
            <Link href="/convenio-veterinario" style={{ color: "var(--esmeralda)" }}>
              Convenio de adhesión
            </Link>
          </>
        )}{" "}
        y la{" "}
        <Link href="/privacidad" style={{ color: "var(--esmeralda)" }}>
          Política de Privacidad
        </Link>
        , o ir a{" "}
        <Link href="/contacto" style={{ color: "var(--esmeralda)" }}>
          Contacto
        </Link>
        .
      </p>
    </Pantalla>
  );
}
