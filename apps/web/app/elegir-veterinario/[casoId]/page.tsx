"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SolicitudParaCliente, VeterinarioParaElegir } from "@vet-teletriage/types";
import Link from "next/link";
import { apiGet, apiPostAuth, ApiError } from "../../../lib/api";
import { useSesionCliente } from "../../../lib/sesion";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";
import { EstadoVacio } from "../../../components/EstadoVacio";
import { Avatar, Calificacion } from "../../../components/Veterinario";

// Pantalla que reemplaza al viejo "te vamos a contactar por WhatsApp"
// (2026-09-28): ahora el cliente ve el costo total de cada veterinario
// conectado ANTES de contratar, y elige — el precio que ve acá es
// exactamente el que va a pagar, no una estimación (Sergio, 2026-09-29).
export default function ElegirVeterinarioPage() {
  const router = useRouter();
  const params = useParams<{ casoId: string }>();
  const casoId = params.casoId;
  const { sesion } = useSesionCliente();

  const [veterinarios, setVeterinarios] = useState<VeterinarioParaElegir[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  // Ya NO es "listo, esperá que te contacten" — ahora hay un paso más antes
  // de terminar: pagar. "redirigiendo" cubre el instante entre que se creó
  // la preferencia de Mercado Pago y que el navegador efectivamente navega
  // a init_point (Sergio, 2026-09-29: cobro inmediato, no al cerrar el
  // caso — ver pagos.service.ts).
  const [redirigiendo, setRedirigiendo] = useState(false);

  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion || !casoId) return;
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await apiGet<VeterinarioParaElegir[]>(`/casos/${casoId}/para-elegir`, sesion!.accessToken);
        if (!cancelado) setVeterinarios(datos);
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No pudimos cargar la lista de veterinarios. Probá de nuevo.",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [sesion, casoId]);

  // Caso ya tiene veterinario asignado, pero todavía no se completó el pago
  // (Sergio, 2026-09-29: cobro inmediato acá, no al cerrar el caso). Estado
  // separado de "eligiendo" porque una falla accá NO debe obligar a volver a
  // elegir veterinario — el caso ya lo tiene asignado, solo falta pagar.
  const [casoAsignado, setCasoAsignado] = useState(false);
  const [errorCheckout, setErrorCheckout] = useState<string | null>(null);
  // Precio fijo de PayPal del veterinario elegido — null si ese
  // veterinario no tiene PayPal conectado, en cuyo caso ni se ofrece la
  // opción (Sergio, 2026-09-30: PayPal es la alternativa, Mercado Pago
  // sigue siendo siempre la opción principal que se intenta primero).
  const [paypalUsdElegido, setPaypalUsdElegido] = useState<number | null>(null);
  const [redirigiendoPaypal, setRedirigiendoPaypal] = useState(false);

  // ---- Solicitud de atención (Sergio, 2026-10-27) ----
  // El cliente ya no asigna directo: pide la atención y el veterinario la
  // acepta (o no). Recién cuando acepta se sigue a pagar — si rechaza, no
  // responde o el cliente cancela, no se cobra nada.
  const [acepto, setAcepto] = useState(false);
  const [solicitud, setSolicitud] = useState<SolicitudParaCliente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [cancelando, setCancelando] = useState(false);
  const pagoIniciado = useRef(false);
  const claveStorage = `va_paypal_${casoId}`;

  const recargarLista = useCallback(() => {
    if (!sesion) return;
    apiGet<VeterinarioParaElegir[]>(`/casos/${casoId}/para-elegir`, sesion.accessToken)
      .then(setVeterinarios)
      .catch(() => {});
  }, [sesion, casoId]);

  async function elegir(veterinarioId: string) {
    if (!sesion || !acepto) return;
    setError(null);
    setAviso(null);
    setEligiendo(veterinarioId);
    try {
      const creada = await apiPostAuth<SolicitudParaCliente>(`/solicitudes/caso/${casoId}`, sesion.accessToken, {
        veterinarioId,
        aceptoTerminos: true,
      });
      const usd = veterinarios?.find((v) => v.id === veterinarioId)?.costoTotalPaypalUsd ?? null;
      setPaypalUsdElegido(usd);
      try {
        sessionStorage.setItem(claveStorage, usd == null ? "" : String(usd));
      } catch {}
      setSolicitud(creada);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos enviar la solicitud. Puede que se haya desconectado — probá con otro.",
      );
      // Puede haberse desconectado justo ahora — refrescamos la lista para
      // no dejar al cliente eligiendo a alguien que ya no está.
      recargarLista();
    } finally {
      setEligiendo(null);
    }
  }

  // Al abrir (o recargar) la pantalla: si ya hay una solicitud en curso o
  // aceptada, se retoma donde estaba en vez de mostrar la lista de nuevo.
  useEffect(() => {
    if (!sesion || !casoId) return;
    let cancelado = false;
    apiGet<SolicitudParaCliente | null>(`/solicitudes/caso/${casoId}/actual`, sesion.accessToken)
      .then((actual) => {
        if (cancelado || !actual) return;
        if (actual.estado === "PENDIENTE" || actual.estado === "ACEPTADA") {
          try {
            const guardado = sessionStorage.getItem(claveStorage);
            if (guardado) setPaypalUsdElegido(Number(guardado));
          } catch {}
          setSolicitud(actual);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [sesion, casoId, claveStorage]);

  // Mientras la solicitud está pendiente: se consulta cada 2 s.
  const idPendiente = solicitud?.estado === "PENDIENTE" ? solicitud.id : null;
  useEffect(() => {
    if (!idPendiente || !sesion) return;
    let cancelado = false;
    const consultar = async () => {
      try {
        const actual = await apiGet<SolicitudParaCliente | null>(
          `/solicitudes/caso/${casoId}/actual`,
          sesion.accessToken,
        );
        if (cancelado || !actual || actual.id !== idPendiente) return;
        if (actual.estado !== "PENDIENTE") setSolicitud(actual);
      } catch {
        // un corte momentáneo de red no cierra la espera: se reintenta solo
      }
    };
    const t = setInterval(consultar, 2000);
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, [idPendiente, sesion, casoId]);

  // Cuenta regresiva (solo visual: quien decide el vencimiento es el servidor).
  useEffect(() => {
    if (!solicitud || solicitud.estado !== "PENDIENTE") return;
    const calcular = () =>
      setSegundosRestantes(Math.max(0, Math.ceil((new Date(solicitud.venceEl).getTime() - Date.now()) / 1000)));
    calcular();
    const t = setInterval(calcular, 500);
    return () => clearInterval(t);
  }, [solicitud]);

  // Resultado de la solicitud.
  useEffect(() => {
    if (!solicitud) return;
    if (solicitud.estado === "ACEPTADA") {
      if (pagoIniciado.current) return;
      pagoIniciado.current = true;
      setCasoAsignado(true);
      irAPagar();
    } else if (solicitud.estado !== "PENDIENTE") {
      const nombre = `${solicitud.veterinario.nombre} ${solicitud.veterinario.apellido}`;
      setAviso(
        solicitud.estado === "RECHAZADA"
          ? `${nombre} no pudo tomar tu consulta ahora. No se te cobró nada — elegí a otro veterinario.`
          : solicitud.estado === "VENCIDA"
            ? `${nombre} no alcanzó a responder. No se te cobró nada — elegí a otro veterinario.`
            : null,
      );
      setSolicitud(null);
      recargarLista();
    }
    // irAPagar y recargarLista se recrean en cada render; solo importa el cambio de solicitud
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitud]);

  async function cancelarSolicitud() {
    if (!sesion || !solicitud) return;
    setCancelando(true);
    try {
      await apiPostAuth(`/solicitudes/${solicitud.id}/cancelar`, sesion.accessToken);
    } catch {
      // si ya estaba resuelta, la próxima consulta lo refleja
    }
    setSolicitud(null);
    setCancelando(false);
    setAviso(null);
    recargarLista();
  }

  // medioPago default MERCADO_PAGO — el medio PRINCIPAL, siempre (Sergio,
  // 2026-09-30) — se llama así automáticamente apenas se asigna veterinario
  // (ver elegir() arriba). PayPal solo se dispara si el cliente lo elige a
  // mano en el botón secundario de abajo.
  async function irAPagar(medioPago: "MERCADO_PAGO" | "PAYPAL" = "MERCADO_PAGO") {
    if (!sesion) return;
    setErrorCheckout(null);
    if (medioPago === "PAYPAL") setRedirigiendoPaypal(true);
    else setRedirigiendo(true);
    try {
      const { initPoint } = await apiPostAuth<{ initPoint: string }>(`/pagos/${casoId}/checkout`, sesion.accessToken, {
        medioPago,
      });
      window.location.href = initPoint;
      // No hay "finally" que baje redirigiendo: el navegador está a punto de
      // salir de esta página. Si algo interrumpe la navegación, se queda
      // mostrando "Redirigiendo…" — aceptable, es un caso raro.
    } catch (e) {
      setErrorCheckout(e instanceof ApiError ? e.message : "No pudimos iniciar el pago. Probá de nuevo.");
      setRedirigiendo(false);
      setRedirigiendoPaypal(false);
    }
  }

  if (!sesion) return null;

  if (casoAsignado) {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 22px", textAlign: "center" }}>
        <Logo size="md" marginBottom={28} />
        <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }}>
          {errorCheckout ? "Falta un paso más" : "Te llevamos a pagar…"}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
          {errorCheckout
            ? "Ya elegiste veterinario — solo falta completar el pago para confirmar el asesoramiento."
            : "Ya elegiste veterinario. Te estamos redirigiendo a Mercado Pago para completar el pago."}
        </p>
        {errorCheckout && (
          <>
            <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 16 }} role="alert">
              {errorCheckout}
            </p>
            <button
              type="button"
              className="va-boton"
              onClick={() => irAPagar("MERCADO_PAGO")}
              disabled={redirigiendo || redirigiendoPaypal}
            >
              {redirigiendo ? "Un momento…" : "Reintentar pago"}
            </button>
          </>
        )}

        {/* PayPal — alternativa, no el medio principal (Sergio, 2026-09-30).
            Solo se ofrece si el veterinario elegido tiene PayPal conectado;
            cobra en USD, precio fijo, no una conversión del monto en pesos
            (PayPal no soporta ARS). */}
        {paypalUsdElegido != null && (
          <div style={{ marginTop: errorCheckout ? 16 : 8 }}>
            <button
              type="button"
              className="va-boton va-boton-ghost"
              onClick={() => irAPagar("PAYPAL")}
              disabled={redirigiendo || redirigiendoPaypal}
            >
              {redirigiendoPaypal ? "Un momento…" : `Pagar con PayPal (US$${paypalUsdElegido})`}
            </button>
          </div>
        )}

        <LegalFooter />
      </main>
    );
  }

  if (solicitud && solicitud.estado === "PENDIENTE") {
    const mm = Math.floor(segundosRestantes / 60);
    const ss = String(segundosRestantes % 60).padStart(2, "0");
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 22px", textAlign: "center" }}>
        <Logo size="md" marginBottom={28} />
        <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }} aria-live="polite">
          Esperando a {solicitud.veterinario.nombre} {solicitud.veterinario.apellido}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 6 }}>
          Le avisamos que querés una consulta. Cuando acepte, seguís directo al pago.
        </p>
        {solicitud.vetEnConsulta && (
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 6 }}>
            Está atendiendo a otra persona en este momento, así que puede demorar un poco más en responder.
          </p>
        )}
        <div className="va-titular" style={{ fontSize: 34, margin: "18px 0 6px" }} aria-label="Tiempo restante">
          {mm}:{ss}
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          No se te cobra nada hasta que acepte. Si no responde a tiempo o no puede, te lo avisamos y elegís a otro.
        </p>
        <button type="button" className="va-boton va-boton-ghost" onClick={cancelarSolicitud} disabled={cancelando}>
          {cancelando ? "Un momento…" : "Cancelar y elegir a otro"}
        </button>
        <LegalFooter />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Elegí con quién hablar
      </h1>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 0, marginBottom: 20 }}>
        Están conectados ahora. El precio que ves es el total que vas a pagar — ya incluye el cargo de plataforma.
      </p>

      {aviso && (
        <p
          style={{
            background: "rgba(180, 67, 45, 0.08)",
            border: "1px solid var(--borde)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13.5,
            marginBottom: 14,
          }}
          role="status"
        >
          {aviso}
        </p>
      )}
      {cargando && <p style={{ fontSize: 14, opacity: 0.75 }}>Buscando veterinarios conectados…</p>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      {!cargando && veterinarios && veterinarios.length === 0 && (
        <div
          style={{
            background: "rgba(var(--esmeralda-rgb), 0.1)",
            borderRadius: 14,
          }}
        >
          <EstadoVacio>
            No hay ningún veterinario disponible en este momento. Probá de nuevo en unos minutos.
          </EstadoVacio>
        </div>
      )}

      {veterinarios && veterinarios.length > 0 && (
        <label
          style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.45, marginBottom: 16 }}
        >
          <input
            type="checkbox"
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" style={{ textDecoration: "underline" }}>
              Términos y Condiciones
            </Link>
            . Al elegir un veterinario le enviamos tu solicitud; no se te cobra hasta que la acepte.
          </span>
        </label>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {veterinarios?.map((v) => (
          <div key={v.id} className="va-tarjeta" style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar nombre={v.nombre} apellido={v.apellido} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {v.nombre} {v.apellido}
                </div>
                <div style={{ marginTop: 4 }}>
                  <Calificacion promedio={v.ratingPromedio ?? null} cantidad={v.cantidadCalificaciones} />
                </div>
                {(v.enConsulta || v.enStandBy) && (
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--muted)" }}>
                    {v.enConsulta ? "En consulta, puede demorar" : "Puede tardar un poco más en responder"}
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--borde)",
              }}
            >
              <div>
                <div className="va-etiqueta" style={{ color: "var(--muted)", letterSpacing: "0.1em" }}>
                  Costo total
                </div>
                <div className="va-titular" style={{ fontSize: 20, marginTop: 2 }}>
                  ${v.costoTotal.toLocaleString("es-AR")}
                </div>
              </div>
              <button
                type="button"
                className="va-boton"
                style={{ width: "auto", minHeight: 46, padding: "0 28px" }}
                onClick={() => elegir(v.id)}
                disabled={eligiendo !== null || !acepto}
                title={acepto ? undefined : "Aceptá los Términos y Condiciones para continuar"}
              >
                {eligiendo === v.id ? "…" : "Elegir"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <LegalFooter />
    </main>
  );
}
