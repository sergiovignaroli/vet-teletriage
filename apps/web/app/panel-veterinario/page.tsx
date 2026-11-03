"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CasoParaVeterinario, ClasificacionCierre, TurnoPactadoParaVeterinario } from "@vet-teletriage/types";
import { hayBanderaRoja } from "@vet-teletriage/types";
import { MisPrecios } from "../../components/MisPrecios";
import { MisEspecies } from "../../components/MisEspecies";
import { MiFoto } from "../../components/MiFoto";
import { apiGet, apiPatch, apiPostAuth, ApiError } from "../../lib/api";
import { useLatidoVeterinario, useSesionVeterinario } from "../../lib/sesion-veterinario";
import { tocarAviso, useSolicitudesVeterinario, useSonidoActivo } from "../../lib/solicitudes-veterinario";
import { useAvisosPush } from "../../lib/push";
import { VentanaSolicitud } from "../../components/VentanaSolicitud";
import type { Presencia } from "../../lib/sesion-veterinario";
import { Onboarding } from "../../components/Onboarding";
import { Pantalla, MarcaGrande } from "../../components/Pantalla";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const FORMATO_HORA = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Cómo se le cuenta al veterinario el estado de su cuenta (nunca el nombre técnico).
const ETIQUETA_CUENTA: Record<string, string> = {
  PENDIENTE_VERIFICACION: "Pendiente de verificación",
  HABILITADO: "Habilitado",
  SUSPENDIDO_MATRICULA_VENCIDA: "Suspendido: matrícula vencida",
  SUSPENDIDO_SEGURO_VENCIDO: "Suspendido: seguro vencido",
  SUSPENDIDO_DISPUTA_IDENTIDAD: "Suspendido: verificación de identidad en revisión",
  SUSPENDIDO_INCUMPLIMIENTO: "Suspendido",
  DESVINCULADO: "Desvinculado",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  INTAKE: "Nuevo",
  BANDERA_ROJA_MOSTRADA: "Nuevo — posible emergencia",
  ASIGNADO: "Te eligieron — esperando que arranques",
  EN_SESION: "En sesión",
  CERRADO: "Cerrado",
  CANCELADO_FALLA_PLATAFORMA: "Cancelado",
};

// Copy en español de ClasificacionCierre (packages/types) — Sergio,
// 2026-09-29: sin esto no había ninguna pantalla que llamara a
// PATCH /casos/:id/cerrar, así que un caso EN_SESION se quedaba ahí para
// siempre y el circuito de calificación/reporte nunca se activaba.
const ETIQUETAS_CIERRE: Record<ClasificacionCierre, string> = {
  RESUELTO_POR_ORIENTACION: "Resuelto con orientación",
  DERIVADO_A_EMERGENCIA: "Derivé a una guardia de emergencia",
  NO_COMPLETADO: "No se pudo completar el asesoramiento",
};

const OPCIONES_PRESENCIA: { valor: Presencia; etiqueta: string; ayuda: string }[] = [
  { valor: "CONECTADO", etiqueta: "Conectado", ayuda: "Los clientes te ven en la lista y pueden elegirte." },
  {
    valor: "STAND_BY",
    etiqueta: "Stand by",
    ayuda: "Seguís con la sesión abierta y también te pueden elegir, pero los clientes ven que podés tardar más en responder.",
  },
  { valor: "DESCONECTADO", etiqueta: "Desconectado", ayuda: "No aparecés en la lista de los clientes." },
];

export default function PanelVeterinarioPage() {
  const router = useRouter();
  const { sesion, actualizarOnboarding, actualizarPresencia, cerrarSesion, modificar } =
    useSesionVeterinario();
  const [enviandoOnboarding, setEnviandoOnboarding] = useState(false);
  const [cambiandoConexion, setCambiandoConexion] = useState<Presencia | null>(null);
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  const [casos, setCasos] = useState<CasoParaVeterinario[] | null>(null);
  const [cargandoCasos, setCargandoCasos] = useState(false);
  const [errorCasos, setErrorCasos] = useState<string | null>(null);


  // Cobro conectado y convenio aceptado: sin cobro conectado no pueden elegirte;
  // sin convenio vigente hay que aceptarlo antes de recibir consultas.
  const [puedeCobrar, setPuedeCobrar] = useState<boolean | null>(null);
  const [convenio, setConvenio] = useState<{ version: string; aceptado: boolean } | null>(null);
  const [tildeConvenio, setTildeConvenio] = useState(false);
  const [aceptandoConvenio, setAceptandoConvenio] = useState(false);
  const [errorConvenio, setErrorConvenio] = useState<string | null>(null);

  const [iniciando, setIniciando] = useState<string | null>(null);
  const [errorIniciar, setErrorIniciar] = useState<string | null>(null);

  // POST /auth/veterinario/revocar-sesiones existía en el backend desde
  // antes (invalida TODO JWT emitido hasta ahora, incrementando
  // tokenVersion), pero ninguna pantalla lo llamaba — situación probable:
  // un veterinario que pierde el celular o sospecha que alguien más tiene
  // su clave no tenía forma de cerrar sesión en todos lados sin pedírselo a
  // Sergio directamente. Confirmación INLINE, no window.confirm — mismo
  // criterio que el resto de la app (ver por qué se sacó el alert() del
  // panel admin), porque esto invalida también la sesión actual.
  const [confirmandoRevocar, setConfirmandoRevocar] = useState(false);
  const [revocando, setRevocando] = useState(false);
  const [errorRevocar, setErrorRevocar] = useState<string | null>(null);

  // sesion === undefined: todavía no se leyó localStorage (primer render).
  // sesion === null: se leyó y no hay nadie logueado -> a /ingresar-veterinario.
  useEffect(() => {
    if (sesion === null) router.replace("/ingresar-veterinario");
  }, [sesion, router]);

  const cargarCasos = useCallback(async () => {
    if (!sesion) return;
    setCargandoCasos(true);
    setErrorCasos(null);
    try {
      const datos = await apiGet<CasoParaVeterinario[]>("/casos/mios", sesion.accessToken);
      setCasos(datos);
    } catch (e) {
      setErrorCasos(e instanceof ApiError ? e.message : "No pudimos cargar los casos. Probá de nuevo.");
    } finally {
      setCargandoCasos(false);
    }
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !sesion.onboardingCompletado) return;
    cargarCasos();
  }, [sesion, cargarCasos]);

  useEffect(() => {
    if (!sesion || !sesion.onboardingCompletado) return;
    apiGet<{ puedeCobrar: boolean }>("/veterinarios/mi-cobro", sesion.accessToken)
      .then((r) => setPuedeCobrar(r.puedeCobrar))
      .catch(() => {});
    apiGet<{ version: string; aceptado: boolean }>("/veterinarios/convenio", sesion.accessToken)
      .then(setConvenio)
      .catch(() => {});
  }, [sesion]);

  async function aceptarConvenio() {
    if (!sesion || !convenio) return;
    setAceptandoConvenio(true);
    setErrorConvenio(null);
    try {
      const r = await apiPostAuth<{ version: string; aceptado: boolean }>(
        "/veterinarios/convenio/aceptar",
        sesion.accessToken,
        { version: convenio.version },
      );
      setConvenio(r);
    } catch (e) {
      setErrorConvenio(e instanceof ApiError ? e.message : "No pudimos registrar la aceptación. Probá de nuevo.");
    } finally {
      setAceptandoConvenio(false);
    }
  }

  // Solicitudes de atención: ventana emergente con sonido y vibración. Al
  // aceptar, el caso queda asignado y la lista se recarga.
  const [turnos, setTurnos] = useState<TurnoPactadoParaVeterinario[]>([]);
  const cargarTurnos = useCallback(async () => {
    if (!sesion) return;
    try {
      setTurnos(await apiGet<TurnoPactadoParaVeterinario[]>("/solicitudes/turnos", sesion.accessToken));
    } catch {
      // se reintenta en la próxima actualización
    }
  }, [sesion]);
  useEffect(() => {
    if (!sesion || !sesion.onboardingCompletado) return;
    void cargarTurnos();
    const id = window.setInterval(cargarTurnos, 60_000);
    return () => window.clearInterval(id);
  }, [sesion, cargarTurnos]);
  const { solicitud, respondiendo, error: errorSolicitud, responder } = useSolicitudesVeterinario(sesion, () => {
    void cargarCasos();
    void cargarTurnos();
  });
  const push = useAvisosPush(sesion?.accessToken);

  // Otros avisos (WhatsApp y correo): solo se ofrecen los canales que el
  // servidor tiene configurados.
  interface PreferenciasAvisos {
    avisarPorWhatsapp: boolean;
    avisarPorEmail: boolean;
    telefono: string | null;
    whatsappDisponible: boolean;
    emailDisponible: boolean;
  }
  const [prefs, setPrefs] = useState<PreferenciasAvisos | null>(null);
  const [telefonoAvisos, setTelefonoAvisos] = useState("");
  const [guardandoPrefs, setGuardandoPrefs] = useState(false);
  const [mensajePrefs, setMensajePrefs] = useState<{ texto: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!sesion?.accessToken) return;
    apiGet<PreferenciasAvisos>("/notificaciones/preferencias", sesion.accessToken)
      .then((p) => {
        setPrefs(p);
        setTelefonoAvisos(p.telefono ?? "");
      })
      .catch(() => {});
  }, [sesion?.accessToken]);
  async function guardarPrefs(cambios: Partial<Pick<PreferenciasAvisos, "avisarPorWhatsapp" | "avisarPorEmail">> & { telefono?: string }) {
    if (!sesion) return;
    setGuardandoPrefs(true);
    setMensajePrefs(null);
    try {
      const nuevo = await apiPatch<PreferenciasAvisos>("/notificaciones/preferencias", sesion.accessToken, cambios);
      setPrefs(nuevo);
      setTelefonoAvisos(nuevo.telefono ?? "");
      setMensajePrefs({ texto: "Guardado.", error: false });
    } catch (e) {
      setMensajePrefs({ texto: e instanceof ApiError ? e.message : "No pudimos guardar. Probá de nuevo.", error: true });
    } finally {
      setGuardandoPrefs(false);
    }
  }
  const { activo: sonidoActivo, activar: activarSonidoAvisos } = useSonidoActivo();

  // Latido: mientras estés Conectado o en Stand by con el panel abierto, el
  // servidor sabe que seguís ahí. Si el estado real cambió por fuera (por
  // ejemplo, una suspensión de la cuenta), el panel se corrige solo.
  useLatidoVeterinario(sesion, (real) => {
    if (sesion && (real.presencia !== sesion.presencia || real.estado !== sesion.estado)) {
      modificar({ presencia: real.presencia, disponible: real.disponible, estado: real.estado });
    }
  });

  async function cambiarPresencia(presencia: Presencia) {
    if (!sesion || presencia === sesion.presencia) return;
    setErrorConexion(null);
    setCambiandoConexion(presencia);
    try {
      await apiPatch("/veterinarios/presencia", sesion.accessToken, { presencia });
      actualizarPresencia(presencia);
    } catch (e) {
      setErrorConexion(e instanceof ApiError ? e.message : "No pudimos cambiar tu estado. Probá de nuevo.");
    } finally {
      setCambiandoConexion(null);
    }
  }

  async function terminarOnboarding() {
    if (!sesion) return;
    setEnviandoOnboarding(true);
    try {
      await apiPatch("/auth/onboarding-completado", sesion.accessToken);
    } catch (e) {
      // Si falla (red caída, token vencido), no dejamos al veterinario
      // trabado en el onboarding — el flag se reintenta la próxima vez.
      console.error("No se pudo registrar el onboarding en el servidor", e instanceof ApiError ? e.message : e);
    } finally {
      actualizarOnboarding(true);
      setEnviandoOnboarding(false);
    }
  }

  async function iniciarCaso(casoId: string) {
    if (!sesion) return;
    setErrorIniciar(null);
    setIniciando(casoId);
    try {
      await apiPatch(`/casos/${casoId}/iniciar`, sesion.accessToken);
      // Se recarga la lista entera (en vez de parchear el estado a mano)
      // porque acá es donde se crea salaVideoUrl del lado del servidor —
      // parchear localmente dejaría esa URL desactualizada.
      await cargarCasos();
    } catch (e) {
      setErrorIniciar(e instanceof ApiError ? e.message : "No pudimos iniciar el caso. Probá de nuevo.");
    } finally {
      setIniciando(null);
    }
  }

  async function cerrarCaso(casoId: string, clasificacion: ClasificacionCierre, notas: string) {
    if (!sesion) return;
    await apiPatch(`/casos/${casoId}/cerrar`, sesion.accessToken, { clasificacion, notas: notas || undefined });
    await cargarCasos();
  }

  async function revocarSesiones() {
    if (!sesion) return;
    setErrorRevocar(null);
    setRevocando(true);
    try {
      await apiPostAuth("/auth/veterinario/revocar-sesiones", sesion.accessToken);
      // El token que acabamos de usar para esta llamada ya quedó invalidado
      // por la respuesta (tokenVersion incrementado) — no tiene sentido
      // seguir mostrando el panel con una sesión que el backend ya no va a
      // aceptar. cerrarSesion() limpia el storage local y el effect de
      // arriba redirige solo a /ingresar-veterinario.
      cerrarSesion();
    } catch (e) {
      setErrorRevocar(e instanceof ApiError ? e.message : "No pudimos cerrar tus sesiones. Probá de nuevo.");
      setRevocando(false);
    }
  }

  if (!sesion) {
    // undefined (cargando) o null (ya redirigiendo) — no hay nada útil que mostrar.
    return null;
  }

  if (!sesion.onboardingCompletado) {
    return <Onboarding variante="veterinario" onTerminar={terminarOnboarding} enviando={enviandoOnboarding} />;
  }

  return (
    <Pantalla titulo="Mi panel" variante="terracota" ancho={640} salir={cerrarSesion}>
      {solicitud && (
        <VentanaSolicitud
          solicitud={solicitud}
          respondiendo={respondiendo}
          error={errorSolicitud}
          onAceptar={() => responder("aceptar")}
          onRechazar={() => responder("rechazar")}
          onPostergar={(minutos) => responder("postergar", minutos)}
        />
      )}
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4, textAlign: "center" }}>
        Hola, {sesion.nombre}
      </h1>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0, marginBottom: 16, textAlign: "center" }}>
        <span className={`va-punto ${sesion.estado === "HABILITADO" ? "va-punto-ok" : "va-punto-espera"}`} style={{ marginRight: 8 }} />
        Tu cuenta: {ETIQUETA_CUENTA[sesion.estado] ?? sesion.estado}
      </p>

      {convenio && !convenio.aceptado && (
        <div className="va-tarjeta" style={{ padding: 16, marginBottom: 12, borderColor: "var(--alerta-borde)" }}>
          <div className="va-etiqueta" style={{ color: "var(--alerta)" }}>Falta un paso</div>
          <p style={{ fontSize: 14, margin: "6px 0 10px", lineHeight: 1.5 }}>
            Para recibir consultas tenés que aceptar el{" "}
            <Link href="/convenio-veterinario" target="_blank" style={{ color: "var(--esmeralda)", fontWeight: 700 }}>
              Convenio de adhesión para veterinarios
            </Link>
            .
          </p>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={tildeConvenio}
              onChange={(e) => setTildeConvenio(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 1, flex: "none" }}
            />
            Leí y acepto el convenio.
          </label>
          {errorConvenio && (
            <p style={{ color: "var(--alerta)", fontSize: 13, margin: "0 0 10px" }} role="alert">
              {errorConvenio}
            </p>
          )}
          <button type="button" className="va-boton" onClick={aceptarConvenio} disabled={!tildeConvenio || aceptandoConvenio}>
            {aceptandoConvenio ? "Un momento…" : "Aceptar el convenio"}
          </button>
        </div>
      )}

      {sesion.estado === "HABILITADO" && puedeCobrar === false && (
        <div className="va-tarjeta" style={{ padding: 16, marginBottom: 12, borderColor: "var(--alerta-borde)" }}>
          <div className="va-etiqueta" style={{ color: "var(--alerta)" }}>Todavía no te pueden elegir</div>
          <p style={{ fontSize: 14, margin: "6px 0 12px", lineHeight: 1.5 }}>
            Para aparecer en la lista y recibir consultas, primero conectá tu cuenta de cobro (Mercado Pago o PayPal).
          </p>
          <Link href="/veterinario/cobros" className="va-boton" style={{ textDecoration: "none" }}>
            Conectar mi cuenta de cobro
          </Link>
        </div>
      )}

      <div
        style={{
          border: "1px solid var(--borde)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 12,
          background: "var(--card)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Tu estado</div>
        <div role="group" aria-label="Tu estado" className="va-seg">
          {OPCIONES_PRESENCIA.map((o) => {
            const elegida = sesion.presencia === o.valor;
            const bloqueada = o.valor !== "DESCONECTADO" && sesion.estado !== "HABILITADO";
            const punto = o.valor === "CONECTADO" ? "va-punto-ok" : o.valor === "STAND_BY" ? "va-punto-espera" : "";
            return (
              <button
                key={o.valor}
                type="button"
                className="va-seg-op"
                aria-pressed={elegida}
                onClick={() => cambiarPresencia(o.valor)}
                disabled={cambiandoConexion !== null || bloqueada}
              >
                {cambiandoConexion === o.valor ? (
                  "Un momento…"
                ) : (
                  <>
                    <span className={`va-punto ${punto}`} style={elegida ? { background: "#fff" } : undefined} />
                    {o.etiqueta}
                  </>
                )}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--muted)", margin: "10px 0 0" }}>
          {OPCIONES_PRESENCIA.find((o) => o.valor === sesion.presencia)?.ayuda}
        </p>
        {sesion.presencia !== "DESCONECTADO" && (
          <p style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", margin: "8px 0 0" }}>
            {push.estado === "activo"
              ? "Con los avisos activados en este dispositivo, podés cerrar la pestaña: te llega una notificación cuando alguien te elige. Tu sesión sigue abierta hasta que salgas."
              : "Dejá esta pestaña abierta: si la cerrás, dejás de aparecer a los 5 minutos. Activá los avisos de abajo para poder cerrarla. Tu sesión sigue abierta hasta que salgas."}
          </p>
        )}
        {sesion.presencia !== "DESCONECTADO" && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {sonidoActivo ? (
              <>
                <span style={{ fontSize: 12.5, color: "var(--esmeralda)", fontWeight: 600 }}>Sonido de avisos activado</span>
                <button
                  type="button"
                  className="va-boton va-boton-ghost"
                  style={{ width: "auto", minHeight: 34, padding: "0 14px", fontSize: 12 }}
                  onClick={() => tocarAviso()}
                >
                  Probar sonido
                </button>
              </>
            ) : (
              <button
                type="button"
                className="va-boton va-boton-ghost"
                style={{ width: "auto", minHeight: 38, padding: "0 16px", fontSize: 12.5 }}
                onClick={activarSonidoAvisos}
              >
                Activar el sonido de los avisos
              </button>
            )}
          </div>
        )}
        {sesion.presencia !== "DESCONECTADO" && push.estado !== "cargando" && push.estado !== "no-configurado" && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--borde)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Avisos con la app cerrada</div>
            {push.estado === "ios-instalar" && (
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
                En iPhone, los avisos solo funcionan con la app instalada: tocá el botón Compartir del navegador,
                elegí &ldquo;Agregar a pantalla de inicio&rdquo; y abrí la plataforma desde ese ícono.
              </p>
            )}
            {push.estado === "no-soportado" && (
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
                Este navegador no permite avisos con la app cerrada. Probá con Chrome, Edge, Firefox o Safari
                actualizado.
              </p>
            )}
            {push.estado === "bloqueado" && (
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
                Bloqueaste las notificaciones de este sitio. Para activarlas, habilitalas desde los permisos del
                navegador y volvé a esta pantalla.
              </p>
            )}
            {(push.estado === "inactivo" || push.estado === "activo") && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {push.estado === "inactivo" ? (
                  <button
                    type="button"
                    className="va-boton"
                    style={{ width: "auto", minHeight: 40, padding: "0 18px", fontSize: 12.5 }}
                    onClick={push.activar}
                    disabled={push.ocupado}
                  >
                    {push.ocupado ? "Un momento…" : "Activar avisos en este dispositivo"}
                  </button>
                ) : (
                  <>
                    <span style={{ fontSize: 12.5, color: "var(--esmeralda)", fontWeight: 600 }}>
                      Avisos activados en este dispositivo
                    </span>
                    <button
                      type="button"
                      className="va-boton va-boton-ghost"
                      style={{ width: "auto", minHeight: 34, padding: "0 14px", fontSize: 12 }}
                      onClick={push.probar}
                    >
                      Enviar aviso de prueba
                    </button>
                    <button
                      type="button"
                      className="va-boton va-boton-ghost"
                      style={{ width: "auto", minHeight: 34, padding: "0 14px", fontSize: 12 }}
                      onClick={push.desactivar}
                      disabled={push.ocupado}
                    >
                      Desactivar
                    </button>
                  </>
                )}
                {push.puedeInstalar && (
                  <button
                    type="button"
                    className="va-boton va-boton-ghost"
                    style={{ width: "auto", minHeight: 34, padding: "0 14px", fontSize: 12 }}
                    onClick={push.pedirInstalacion}
                  >
                    Instalar la app
                  </button>
                )}
              </div>
            )}
            {push.mensajeProbar && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }} role="status">
                {push.mensajeProbar}
              </p>
            )}
            {push.error && (
              <p style={{ fontSize: 12, color: "var(--terracota)", margin: "8px 0 0" }} role="alert">
                {push.error}
              </p>
            )}
            <p style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--muted)", margin: "8px 0 0" }}>
              El aviso usa el sonido de notificación de tu teléfono o computadora; no suena como una llamada.
            </p>
          </div>
        )}
      </div>
      {turnos.length > 0 && (
        <div
          style={{
            border: "1px solid var(--borde)",
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 12,
            background: "var(--card)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Turnos pactados</div>
          {turnos.map((t) => (
            <div key={t.id} style={{ fontSize: 13.5, padding: "6px 0", borderTop: "1px solid var(--borde)" }}>
              <strong>{FORMATO_HORA.format(new Date(t.propuestaPara))}</strong> · {t.especie} — {t.motivoConsulta}
            </div>
          ))}
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
            A la hora acordada te avisamos y la persona continúa hacia el pago; después iniciás la consulta como siempre.
          </p>
        </div>
      )}
      {prefs && (prefs.whatsappDisponible || prefs.emailDisponible) && (
        <div
          style={{
            border: "1px solid var(--borde)",
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 12,
            background: "var(--card)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Otros avisos de consultas nuevas</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--muted)", margin: "0 0 10px" }}>
            Si pasan unos segundos y no abriste la plataforma, te escribimos. Son solo avisos: la consulta se hace
            siempre dentro de la plataforma y nunca recibís datos de contacto de nadie.
          </p>
          {prefs.emailDisponible && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={prefs.avisarPorEmail}
                disabled={guardandoPrefs}
                onChange={(e) => guardarPrefs({ avisarPorEmail: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              Por correo electrónico
            </label>
          )}
          {prefs.whatsappDisponible && (
            <>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={prefs.avisarPorWhatsapp}
                  disabled={guardandoPrefs}
                  onChange={(e) => guardarPrefs({ avisarPorWhatsapp: e.target.checked, telefono: telefonoAvisos })}
                  style={{ width: 18, height: 18 }}
                />
                Por WhatsApp
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  className="va-input"
                  inputMode="tel"
                  placeholder="Teléfono con código de país (5493411234567)"
                  value={telefonoAvisos}
                  onChange={(e) => setTelefonoAvisos(e.target.value)}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <button
                  type="button"
                  className="va-boton va-boton-ghost"
                  style={{ width: "auto", minHeight: 40, padding: "0 16px", fontSize: 12.5 }}
                  disabled={guardandoPrefs || !telefonoAvisos.trim()}
                  onClick={() => guardarPrefs({ telefono: telefonoAvisos })}
                >
                  Guardar teléfono
                </button>
              </div>
              <p style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--muted)", margin: "6px 0 0" }}>
                Al activar WhatsApp aceptás que la plataforma le escriba a ese número solo para avisarte de consultas
                nuevas.
              </p>
            </>
          )}
          {mensajePrefs && (
            <p
              style={{ fontSize: 12, margin: "8px 0 0", color: mensajePrefs.error ? "var(--terracota)" : "var(--muted)" }}
              role={mensajePrefs.error ? "alert" : "status"}
            >
              {mensajePrefs.texto}
            </p>
          )}
        </div>
      )}
      {sesion.presencia === "DESCONECTADO" && sesion.estado !== "HABILITADO" && (
        <p style={{ fontSize: 12, color: "var(--terracota)", marginTop: -6, marginBottom: 16 }}>
          Todavía no podés conectarte — tu cuenta no está habilitada.
        </p>
      )}
      {errorConexion && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorConexion}
        </p>
      )}

      {/* Precios propios (Sergio, 2026-11-03): cuatro precios — normal y
          urgencia, diurno y nocturno — dentro de la banda que define la
          plataforma. Reemplaza al margen sobre un precio base. */}
      <MiFoto token={sesion.accessToken} nombre={sesion.nombre} apellido={sesion.apellido} />

      <MisEspecies token={sesion.accessToken} />

      {sesion.estado === "HABILITADO" && <MisPrecios token={sesion.accessToken} />}

      <Link
        href="/veterinario/cobros"
        className="va-chip-boton"
        style={{ marginBottom: 24, textDecoration: "none" }}
      >
        Medios de cobro: Mercado Pago o PayPal
      </Link>

      <h2 className="va-etiqueta" style={{ marginBottom: 10 }}>Mis casos</h2>

      {cargandoCasos && <p style={{ fontSize: 14, opacity: 0.75 }}>Cargando…</p>}
      {errorCasos && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorCasos}
        </p>
      )}
      {errorIniciar && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorIniciar}
        </p>
      )}
      {!cargandoCasos && casos && casos.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.75 }}>
          Todavía nadie te eligió. Mientras estés conectado, vas a aparecer en la lista que ve el cliente al
          terminar su asesoramiento.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {casos?.map((caso) => (
          <div
            key={caso.id}
            style={{
              border: "1px solid var(--borde)",
              borderRadius: 14,
              padding: 16,
              background: "var(--card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <strong style={{ fontSize: 15 }}>{caso.intake.especie}</strong>
              <span style={{ fontSize: 12, opacity: 0.75 }}>{FORMATO_FECHA.format(new Date(caso.creadoEl))}</span>
            </div>

            {hayBanderaRoja(caso.intake) && (
              <div
                style={{
                  display: "inline-block",
                  background: "var(--alerta-fondo)",
                  color: "var(--alerta)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                Posible emergencia
              </div>
            )}

            <p style={{ fontSize: 14, margin: "0 0 10px", opacity: 0.85 }}>{caso.intake.motivoConsulta}</p>

            <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 10px" }}>
              {ETIQUETA_ESTADO[caso.estado] ?? caso.estado} · Franja {caso.franjaHoraria.toLowerCase()}
              {caso.honorarioDeclarado != null && <> · Tu honorario: ${caso.honorarioDeclarado.toLocaleString("es-AR")}</>}
            </p>

            {caso.estado === "ASIGNADO" && (
              <button
                type="button"
                className="va-boton"
                style={{ width: "auto", padding: "0 18px" }}
                onClick={() => iniciarCaso(caso.id)}
                disabled={iniciando === caso.id}
              >
                {iniciando === caso.id ? "Iniciando…" : "Iniciar videollamada"}
              </button>
            )}

            {caso.estado === "EN_SESION" && <SesionEnCurso caso={caso} onCerrar={cerrarCaso} />}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 36, textAlign: "center" }}>
        {!confirmandoRevocar ? (
          <button
            type="button"
            onClick={() => setConfirmandoRevocar(true)}
            style={{ background: "none", border: "none", opacity: 0.75, fontSize: 12, cursor: "pointer" }}
          >
            Cerrar sesión en todos mis dispositivos
          </button>
        ) : (
          <div
            style={{
              border: "1px solid rgba(192,57,43,0.3)",
              borderRadius: 14,
              padding: 14,
              background: "var(--alerta-fondo)",
              maxWidth: 340,
              margin: "0 auto",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--alerta)", margin: "0 0 10px" }}>
              Esto va a cerrar tu sesión acá y en cualquier otro celular o computadora donde hayas ingresado —
              vas a tener que volver a loguearte en todos lados.
            </p>
            {errorRevocar && (
              <p style={{ fontSize: 12, color: "var(--alerta)", fontWeight: 700, margin: "0 0 10px" }} role="alert">
                {errorRevocar}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                type="button"
                onClick={revocarSesiones}
                disabled={revocando}
                style={{
                  background: "var(--alerta)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {revocando ? "Cerrando…" : "Sí, cerrar en todos lados"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoRevocar(false)}
                disabled={revocando}
                style={{ background: "none", border: "none", opacity: 0.75, fontSize: 12, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

    </Pantalla>
  );
}

// Sala de video (si hay una conectada) + formulario de cierre — mismo
// bloque porque ambos solo tienen sentido en EN_SESION (Sergio,
// 2026-09-29). Componente aparte para que el estado del formulario
// (clasificación, notas) sea propio de cada tarjeta, no compartido entre
// todos los casos de la lista.
function SesionEnCurso({
  caso,
  onCerrar,
}: {
  caso: CasoParaVeterinario;
  onCerrar: (casoId: string, clasificacion: ClasificacionCierre, notas: string) => Promise<void>;
}) {
  const [clasificacion, setClasificacion] = useState<ClasificacionCierre | "">("");
  const [notas, setNotas] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cerrar() {
    if (!clasificacion) return;
    setCerrando(true);
    setError(null);
    try {
      await onCerrar(caso.id, clasificacion, notas);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cerrar el caso. Probá de nuevo.");
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid rgba(var(--texto-rgb), 0.1)", marginTop: 4, paddingTop: 12 }}>
      {caso.salaVideoUrl ? (
        <a
          href={caso.salaVideoUrl}
          target="_blank"
          rel="noreferrer"
          className="va-boton"
          style={{ width: "auto", padding: "0 18px", textDecoration: "none", display: "inline-block", marginBottom: 12 }}
        >
          Abrir videollamada
        </a>
      ) : (
        <p style={{ fontSize: 12, opacity: 0.75, marginTop: 0, marginBottom: 12 }}>
          Todavía no hay una sala de video conectada — esperá un momento o volvé a abrir el caso.
        </p>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Cerrar asesoramiento</div>
      <select
        className="va-input"
        value={clasificacion}
        onChange={(e) => setClasificacion(e.target.value as ClasificacionCierre)}
        style={{ marginBottom: 8 }}
      >
        <option value="">Elegí cómo terminó</option>
        {(Object.keys(ETIQUETAS_CIERRE) as ClasificacionCierre[]).map((c) => (
          <option key={c} value={c}>
            {ETIQUETAS_CIERRE[c]}
          </option>
        ))}
      </select>
      <textarea
        className="va-input"
        placeholder="Notas (opcional)"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={2}
        style={{ marginBottom: 8, resize: "vertical" }}
      />
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 12, marginBottom: 8 }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="va-boton"
        style={{ width: "auto", padding: "0 18px" }}
        onClick={cerrar}
        disabled={cerrando || !clasificacion}
      >
        {cerrando ? "Cerrando…" : "Cerrar asesoramiento"}
      </button>
    </div>
  );
}
