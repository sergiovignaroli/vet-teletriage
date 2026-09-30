"use client";

// Pantalla de videollamada real (Sergio, 2026-09-29: eligió Agora tras el
// comparativo de proveedores — ver el PDF de flujo). Reemplaza al link
// externo "target=_blank" que hoy usan /panel y /panel-veterinario: acá
// mismo, DENTRO de la app, se arma la llamada con el SDK de Agora.
//
// Por qué el import del SDK está adentro de useEffect y no arriba del
// archivo: agora-rtc-sdk-ng toca `window`/`navigator` apenas se carga, y
// Next.js pre-renderiza este componente en el servidor al buildear aunque
// tenga "use client" arriba — importarlo a nivel de módulo rompería el
// build. Adentro de useEffect corre solo en el navegador, nunca en build.
//
// Por qué esta única pantalla sirve para cliente Y veterinario: la misma
// salaVideoUrl (armada en AgoraVideoProvider) se guarda una sola vez en el
// caso y las dos pantallas de panel la muestran tal cual — no hay forma de
// que el backend sepa de antemano quién la va a abrir. Acá se prueba
// primero con la sesión de veterinario si existe (es la más común para
// quien llega desde /panel-veterinario) y, si el backend dice que esa
// persona no pertenece al caso, se reintenta con la sesión de cliente —
// cubre el caso real (documentado en lib/sesion-veterinario.ts) de alguien
// con las dos sesiones abiertas en el mismo navegador.
import { useEffect, useRef, useState } from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { useParams, useRouter } from "next/navigation";
import { apiGet, ApiError } from "../../../lib/api";
import { useSesionCliente } from "../../../lib/sesion";
import { useSesionVeterinario } from "../../../lib/sesion-veterinario";
import { Logo } from "../../../components/Logo";

// El componente <Logo> está pensado para pantallas centradas sobre fondo
// crema (dibuja el ícono y el texto en marrón oscuro, fijo) — en la barra
// superior oscura de la llamada en vivo eso quedaría invisible. Por eso
// acá arriba se usa solo el nombre en blanco, no el componente completo;
// <Logo> sigue usándose tal cual en las pantallas de aviso de más abajo,
// que sí son de fondo claro.
function MarcaEnOscuro() {
  return <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Videollamada Animal</span>;
}

// Forma de la respuesta de GET /video/:casoId/token — deliberadamente NO
// está en packages/types: es un detalle de implementación de Agora, no un
// concepto de dominio compartido. Si el día de mañana se cambia de
// proveedor, este tipo se borra con el resto de este archivo.
interface TokenVideo {
  appId: string;
  channel: string;
  token: string;
  uid: number;
}

type Estado =
  | "cargando"
  | "sin-sesion"
  | "no-configurado" // faltan credenciales de Agora en Render
  | "no-disponible" // no pertenece al caso, o el caso no está EN_SESION
  | "conectando"
  | "en-llamada"
  | "error-medios"; // el navegador no dio permiso de cámara/mic, o falló el join

export default function ConsultaVideoPage() {
  const router = useRouter();
  const params = useParams<{ casoId: string }>();
  const casoId = params.casoId;

  const { sesion: sesionCliente } = useSesionCliente();
  const { sesion: sesionVeterinario } = useSesionVeterinario();

  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [volverA, setVolverA] = useState("/panel");
  const [micActivo, setMicActivo] = useState(true);
  const [camaraActiva, setCamaraActiva] = useState(true);
  const [otroConectado, setOtroConectado] = useState(false);

  const videoLocalRef = useRef<HTMLDivElement>(null);
  const videoRemotoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);

  // Paso 1: todavía no sabemos qué sesiones hay (ambos hooks arrancan en
  // `undefined` mientras leen localStorage) — esperar antes de decidir.
  useEffect(() => {
    if (sesionCliente === undefined || sesionVeterinario === undefined) return;
    if (!sesionCliente && !sesionVeterinario) {
      setEstado("sin-sesion");
      router.replace("/ingresar");
      return;
    }

    let cancelado = false;

    async function pedirToken() {
      // Se prueba primero con veterinario (si hay) porque, en el uso real,
      // quien llega desde /panel-veterinario es la mayoría de los casos.
      const intentos: Array<{ token: string; volverA: string }> = [];
      if (sesionVeterinario) intentos.push({ token: sesionVeterinario.accessToken, volverA: "/panel-veterinario" });
      if (sesionCliente) intentos.push({ token: sesionCliente.accessToken, volverA: "/panel" });

      for (const intento of intentos) {
        try {
          const datos = await apiGet<TokenVideo>(`/video/${casoId}/token`, intento.token);
          if (cancelado) return;
          setVolverA(intento.volverA);
          await conectar(datos);
          return;
        } catch (e) {
          if (cancelado) return;
          if (e instanceof ApiError && e.status === 503) {
            setEstado("no-configurado");
            return;
          }
          if (e instanceof ApiError && (e.status === 403 || e.status === 400)) {
            // Sigue probando con la otra sesión, si hay una — recién si se
            // agotan los intentos se muestra el mensaje del backend.
            if (intento === intentos[intentos.length - 1]) {
              setMensajeError(e.message);
              setEstado("no-disponible");
            }
            continue;
          }
          setMensajeError("No pudimos conectar la videollamada. Probá de nuevo en un momento.");
          setEstado("no-disponible");
          return;
        }
      }
    }

    pedirToken();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionCliente, sesionVeterinario, casoId]);

  async function conectar(datos: TokenVideo) {
    setEstado("conectando");
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
        if (mediaType === "video" || mediaType === "audio") {
          await client.subscribe(user, mediaType);
          if (mediaType === "video" && user.videoTrack && videoRemotoRef.current) {
            user.videoTrack.play(videoRemotoRef.current);
          }
          if (mediaType === "audio" && user.audioTrack) {
            user.audioTrack.play();
          }
          setOtroConectado(true);
        }
      });
      client.on("user-unpublished", () => setOtroConectado(false));
      client.on("user-left", () => setOtroConectado(false));

      await client.join(datos.appId, datos.channel, datos.token, datos.uid || null);

      const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      micTrackRef.current = micTrack;
      camTrackRef.current = camTrack;
      if (videoLocalRef.current) camTrack.play(videoLocalRef.current);
      await client.publish([micTrack, camTrack]);

      setEstado("en-llamada");
    } catch {
      setMensajeError("No pudimos acceder a tu cámara o micrófono — revisá los permisos del navegador para este sitio.");
      setEstado("error-medios");
    }
  }

  async function salir() {
    try {
      micTrackRef.current?.close();
      camTrackRef.current?.close();
      await clientRef.current?.leave();
    } catch {
      // best-effort — igual navegamos afuera
    }
    router.push(volverA);
  }

  async function alternarMic() {
    if (!micTrackRef.current) return;
    const nuevoEstado = !micActivo;
    await micTrackRef.current.setEnabled(nuevoEstado);
    setMicActivo(nuevoEstado);
  }

  async function alternarCamara() {
    if (!camTrackRef.current) return;
    const nuevoEstado = !camaraActiva;
    await camTrackRef.current.setEnabled(nuevoEstado);
    setCamaraActiva(nuevoEstado);
  }

  // Se corta todo si la persona cierra la pestaña sin apretar "Salir".
  useEffect(() => {
    return () => {
      micTrackRef.current?.close();
      camTrackRef.current?.close();
      clientRef.current?.leave().catch(() => {});
    };
  }, []);

  if (estado === "cargando" || estado === "sin-sesion") return null;

  if (estado === "no-configurado") {
    return (
      <PantallaAviso
        titulo="La videollamada todavía no está lista"
        mensaje="Coordiná la consulta por WhatsApp mientras tanto, como hasta ahora."
        volverA={volverA}
      />
    );
  }

  if (estado === "no-disponible") {
    return <PantallaAviso titulo="No pudimos abrir esta videollamada" mensaje={mensajeError ?? undefined} volverA={volverA} />;
  }

  if (estado === "error-medios") {
    return <PantallaAviso titulo="No pudimos conectar" mensaje={mensajeError ?? undefined} volverA={volverA} />;
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#1a1a1a" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
        <MarcaEnOscuro />
        <span style={{ color: "#fff", fontSize: 13, opacity: 0.8 }}>
          {estado === "conectando" ? "Conectando…" : otroConectado ? "En videollamada" : "Esperando a que se conecte la otra persona…"}
        </span>
      </header>

      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={videoRemotoRef}
          style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {!otroConectado && (
            <p style={{ color: "#fff", opacity: 0.5, fontSize: 14 }}>Esperando a que se conecte la otra persona…</p>
          )}
        </div>
        <div
          ref={videoLocalRef}
          style={{
            position: "absolute",
            bottom: 90,
            right: 16,
            width: 130,
            height: 174,
            background: "#000",
            borderRadius: 10,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.25)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 14, padding: "18px 0 26px" }}>
        <BotonRedondo activo={micActivo} onClick={alternarMic} etiqueta={micActivo ? "Silenciar micrófono" : "Activar micrófono"}>
          {micActivo ? "🎤" : "🔇"}
        </BotonRedondo>
        <BotonRedondo activo={camaraActiva} onClick={alternarCamara} etiqueta={camaraActiva ? "Apagar cámara" : "Prender cámara"}>
          {camaraActiva ? "📹" : "📷"}
        </BotonRedondo>
        <BotonRedondo activo={false} colorFondo="#c0392b" onClick={salir} etiqueta="Salir de la videollamada">
          ✕
        </BotonRedondo>
      </div>
    </main>
  );
}

function BotonRedondo({
  children,
  activo,
  onClick,
  etiqueta,
  colorFondo,
}: {
  children: React.ReactNode;
  activo: boolean;
  onClick: () => void;
  etiqueta: string;
  colorFondo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        fontSize: 20,
        background: colorFondo ?? (activo ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.35)"),
      }}
    >
      {children}
    </button>
  );
}

function PantallaAviso({ titulo, mensaje, volverA }: { titulo: string; mensaje?: string; volverA: string }) {
  return (
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
      <h1 className="va-titular" style={{ fontSize: 20, marginBottom: 8 }}>
        {titulo}
      </h1>
      {mensaje && <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 24 }}>{mensaje}</p>}
      <a href={volverA} className="va-boton" style={{ textDecoration: "none" }}>
        Volver
      </a>
    </main>
  );
}
