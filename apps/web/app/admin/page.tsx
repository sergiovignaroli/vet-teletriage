"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, ApiError } from "../../lib/api";
import { useSesionAdmin } from "../../lib/sesion-admin";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface VeterinarioPendiente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  matriculaNumero: string;
  matriculaColegio: string;
  matriculaVenceEl: string;
  seguroAseguradora: string;
  seguroVenceEl: string;
  creadoEl: string;
}

interface DisputaIdentidadAbierta {
  id: string;
  motivo: string;
  abiertaEl: string;
  veterinario: { id: string; nombre: string; apellido: string; email: string };
}

interface DisputaCalidadAbierta {
  id: string;
  motivo: string;
  abiertaEl: string;
  caso: {
    id: string;
    intake: { especie: string; motivoConsulta: string } | null;
  };
}

// Tarjeta base — mismo look en las tres secciones, para no repetir estilos.
function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(64,53,47,0.15)",
        borderRadius: 14,
        padding: 16,
        background: "#fff",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function VencimientoLinea({ etiqueta, fecha }: { etiqueta: string; fecha: string }) {
  const vencido = new Date(fecha) < new Date();
  return (
    <div style={{ fontSize: 12, color: vencido ? "var(--terracota)" : "inherit", opacity: vencido ? 1 : 0.65 }}>
      {etiqueta}: {FORMATO_FECHA.format(new Date(fecha))} {vencido && "— VENCIDO"}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { sesion, cerrarSesion } = useSesionAdmin();

  const [pendientes, setPendientes] = useState<VeterinarioPendiente[] | null>(null);
  const [disputasIdentidad, setDisputasIdentidad] = useState<DisputaIdentidadAbierta[] | null>(null);
  const [disputasCalidad, setDisputasCalidad] = useState<DisputaCalidadAbierta[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sesion === null) router.replace("/admin/ingresar");
  }, [sesion, router]);

  const cargarTodo = useCallback(async () => {
    if (!sesion) return;
    setCargando(true);
    setError(null);
    try {
      const [pend, dispIdentidad, dispCalidad] = await Promise.all([
        apiGet<VeterinarioPendiente[]>("/veterinarios/pendientes", sesion.accessToken),
        apiGet<DisputaIdentidadAbierta[]>("/disputas/identidad/abiertas", sesion.accessToken),
        apiGet<DisputaCalidadAbierta[]>("/disputas/calidad/abiertas", sesion.accessToken),
      ]);
      setPendientes(pend);
      setDisputasIdentidad(dispIdentidad);
      setDisputasCalidad(dispCalidad);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar el panel. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [sesion]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  async function habilitar(id: string) {
    if (!sesion) return;
    await apiPatch(`/veterinarios/${id}/habilitar`, sesion.accessToken);
    setPendientes((prev) => prev?.filter((v) => v.id !== id) ?? prev);
  }

  async function resolverIdentidad(id: string, resolucion: string, restituirHabilitacion: boolean) {
    if (!sesion) return;
    await apiPatch(`/disputas/identidad/${id}/resolver`, sesion.accessToken, { resolucion, restituirHabilitacion });
    setDisputasIdentidad((prev) => prev?.filter((d) => d.id !== id) ?? prev);
  }

  async function resolverCalidad(id: string, resolucion: string, hacerLugar: boolean) {
    if (!sesion) return;
    await apiPatch(`/disputas/calidad/${id}/resolver`, sesion.accessToken, { resolucion, hacerLugar });
    setDisputasCalidad((prev) => prev?.filter((d) => d.id !== id) ?? prev);
  }

  if (!sesion) return null;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px 60px" }}>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <button
          type="button"
          onClick={cerrarSesion}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "none",
            border: "none",
            opacity: 0.5,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
        <Logo size="sm" marginBottom={0} />
      </div>

      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4, textAlign: "center" }}>
        Panel de administración
      </h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginTop: 0, marginBottom: 24, textAlign: "center" }}>
        Solo excepciones — lo que no se resolvió solo.
      </p>

      {cargando && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginBottom: 10 }}>
        Veterinarios pendientes de habilitar {pendientes && `(${pendientes.length})`}
      </h2>
      {pendientes && pendientes.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 20 }}>
          Ninguno — la verificación automática por Truora se está haciendo cargo sola.
        </p>
      )}
      {pendientes?.map((v) => (
        <PendienteItem key={v.id} veterinario={v} onHabilitar={habilitar} />
      ))}

      <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>
        Disputas de identidad abiertas {disputasIdentidad && `(${disputasIdentidad.length})`}
      </h2>
      {disputasIdentidad && disputasIdentidad.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 20 }}>Ninguna abierta.</p>
      )}
      {disputasIdentidad?.map((d) => (
        <DisputaIdentidadItem key={d.id} disputa={d} onResolver={resolverIdentidad} />
      ))}

      <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 28, marginBottom: 10 }}>
        Disputas de calidad abiertas {disputasCalidad && `(${disputasCalidad.length})`}
      </h2>
      {disputasCalidad && disputasCalidad.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 20 }}>Ninguna abierta.</p>
      )}
      {disputasCalidad?.map((d) => (
        <DisputaCalidadItem key={d.id} disputa={d} onResolver={resolverCalidad} />
      ))}

      <LegalFooter />
    </main>
  );
}

// Antes usaba `alert()` para el error — la única pantalla de todo `apps/web`
// que lo hacía (situación probable, encontrada al revisar esta pantalla,
// 2026-09-29): un diálogo nativo del navegador no tiene nada que ver con la
// identidad visual del resto de la app, y encima bloquea la pestaña hasta
// que el admin lo cierra. Se reemplaza por el mismo patrón inline +
// botón-deshabilitado-mientras-envía que ya usan DisputaIdentidadItem y
// DisputaCalidadItem, acá abajo.
function PendienteItem({
  veterinario: v,
  onHabilitar,
}: {
  veterinario: VeterinarioPendiente;
  onHabilitar: (id: string) => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function habilitar() {
    setEnviando(true);
    setError(null);
    try {
      await onHabilitar(v.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos habilitarlo. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        {v.nombre} {v.apellido}
      </div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>{v.email}</div>
      <VencimientoLinea etiqueta={`Matrícula ${v.matriculaNumero} (${v.matriculaColegio})`} fecha={v.matriculaVenceEl} />
      <VencimientoLinea etiqueta={`Seguro (${v.seguroAseguradora})`} fecha={v.seguroVenceEl} />
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 12, marginTop: 8, marginBottom: 0 }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="va-boton"
        style={{ width: "auto", padding: "0 16px", marginTop: 10 }}
        onClick={habilitar}
        disabled={enviando}
      >
        {enviando ? "…" : "Habilitar"}
      </button>
    </Tarjeta>
  );
}

function DisputaIdentidadItem({
  disputa,
  onResolver,
}: {
  disputa: DisputaIdentidadAbierta;
  onResolver: (id: string, resolucion: string, restituirHabilitacion: boolean) => Promise<void>;
}) {
  const [resolucion, setResolucion] = useState("");
  const [restituir, setRestituir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await onResolver(disputa.id, resolucion, restituir);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos resolver la disputa. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        {disputa.veterinario.nombre} {disputa.veterinario.apellido}
      </div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
        Abierta el {FORMATO_FECHA.format(new Date(disputa.abiertaEl))} · {disputa.veterinario.email}
      </div>
      <p style={{ fontSize: 13, margin: "0 0 10px" }}>{disputa.motivo}</p>
      <textarea
        className="va-input"
        placeholder="Resolución (qué se decidió y por qué)"
        value={resolucion}
        onChange={(e) => setResolucion(e.target.value)}
        rows={2}
        style={{ marginBottom: 8, resize: "vertical" }}
      />
      <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={restituir} onChange={(e) => setRestituir(e.target.checked)} style={{ marginRight: 8 }} />
        Restituir habilitación (revalida matrícula y seguro vigentes antes de reactivar)
      </label>
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 12, marginBottom: 8 }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="va-boton"
        style={{ width: "auto", padding: "0 16px" }}
        onClick={enviar}
        disabled={enviando || !resolucion}
      >
        {enviando ? "…" : "Resolver"}
      </button>
    </Tarjeta>
  );
}

function DisputaCalidadItem({
  disputa,
  onResolver,
}: {
  disputa: DisputaCalidadAbierta;
  onResolver: (id: string, resolucion: string, hacerLugar: boolean) => Promise<void>;
}) {
  const [resolucion, setResolucion] = useState("");
  const [hacerLugar, setHacerLugar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await onResolver(disputa.id, resolucion, hacerLugar);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos resolver la disputa. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        {disputa.caso.intake?.especie ?? "Caso"} · {disputa.caso.id.slice(0, 8)}
      </div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
        Abierta el {FORMATO_FECHA.format(new Date(disputa.abiertaEl))}
      </div>
      {disputa.caso.intake?.motivoConsulta && (
        <p style={{ fontSize: 12, opacity: 0.65, margin: "0 0 8px" }}>{disputa.caso.intake.motivoConsulta}</p>
      )}
      <p style={{ fontSize: 13, margin: "0 0 10px" }}>{disputa.motivo}</p>
      <textarea
        className="va-input"
        placeholder="Resolución (qué se decidió y por qué)"
        value={resolucion}
        onChange={(e) => setResolucion(e.target.value)}
        rows={2}
        style={{ marginBottom: 8, resize: "vertical" }}
      />
      <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={hacerLugar} onChange={(e) => setHacerLugar(e.target.checked)} style={{ marginRight: 8 }} />
        Hacer lugar (reembolsa el cargo de plataforma — nunca el honorario del veterinario)
      </label>
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 12, marginBottom: 8 }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="va-boton"
        style={{ width: "auto", padding: "0 16px" }}
        onClick={enviar}
        disabled={enviando || !resolucion}
      >
        {enviando ? "…" : "Resolver"}
      </button>
    </Tarjeta>
  );
}
