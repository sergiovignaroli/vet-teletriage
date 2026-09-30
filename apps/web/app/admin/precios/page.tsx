"use client";

// Panel para editar lo que antes eran constantes fijas en el código
// (Sergio, 2026-09-30: "debo tener en la plataforma administrador un botón
// o un panel para modificar editar los precios"). Todo lo que se guarda acá
// sale en vivo: el próximo caso que se cree, la próxima vez que alguien
// elija veterinario, ya usa los valores nuevos — sin deploy.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { apiGet, apiPatch, ApiError } from "../../../lib/api";
import { useSesionAdmin } from "../../../lib/sesion-admin";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

type FormState = {
  [K in keyof ConfiguracionPlataforma]: string;
};

function configAFormulario(config: ConfiguracionPlataforma): FormState {
  return {
    cargoPlataformaDiurna: String(config.cargoPlataformaDiurna),
    cargoPlataformaNocturna: String(config.cargoPlataformaNocturna),
    honorarioBaseNormal: String(config.honorarioBaseNormal),
    honorarioBaseUrgencia: String(config.honorarioBaseUrgencia),
    umbralSesionesVeterano: String(config.umbralSesionesVeterano),
    bonusVeteranoPorcentaje: String(config.bonusVeteranoPorcentaje),
    emailContacto: config.emailContacto ?? "",
    instagramUrl: config.instagramUrl ?? "",
    facebookUrl: config.facebookUrl ?? "",
    tiktokUrl: config.tiktokUrl ?? "",
  };
}

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", margin: "12px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{etiqueta}</div>
      {ayuda && <div style={{ fontSize: 11.5, opacity: 0.55, marginBottom: 6 }}>{ayuda}</div>}
      {children}
    </label>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(64,53,47,0.15)",
        borderRadius: 14,
        padding: 16,
        background: "#fff",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{titulo}</div>
      {children}
    </div>
  );
}

export default function AdminPreciosPage() {
  const router = useRouter();
  const { sesion } = useSesionAdmin();

  const [form, setForm] = useState<FormState | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (sesion === null) router.replace("/admin/ingresar");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion) return;
    let cancelado = false;
    apiGet<ConfiguracionPlataforma>("/configuracion")
      .then((config) => {
        if (!cancelado) setForm(configAFormulario(config));
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof ApiError ? e.message : "No pudimos cargar la configuración.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [sesion]);

  function actualizarCampo(campo: keyof FormState, valor: string) {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    setGuardado(false);
  }

  async function guardar() {
    if (!sesion || !form) return;
    setGuardando(true);
    setError(null);
    setGuardado(false);
    try {
      const cuerpo = {
        cargoPlataformaDiurna: Number(form.cargoPlataformaDiurna),
        cargoPlataformaNocturna: Number(form.cargoPlataformaNocturna),
        honorarioBaseNormal: Number(form.honorarioBaseNormal),
        honorarioBaseUrgencia: Number(form.honorarioBaseUrgencia),
        umbralSesionesVeterano: Number(form.umbralSesionesVeterano),
        bonusVeteranoPorcentaje: Number(form.bonusVeteranoPorcentaje),
        emailContacto: form.emailContacto,
        instagramUrl: form.instagramUrl,
        facebookUrl: form.facebookUrl,
        tiktokUrl: form.tiktokUrl,
      };
      const actualizada = await apiPatch<ConfiguracionPlataforma>("/configuracion", sesion.accessToken, cuerpo);
      setForm(configAFormulario(actualizada));
      setGuardado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los cambios. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (!sesion) return null;

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "32px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <Link href="/admin" style={{ fontSize: 12, opacity: 0.55, display: "inline-block", marginBottom: 14 }}>
        ← Volver al panel
      </Link>
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Precios y configuración
      </h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginTop: 0, marginBottom: 20 }}>
        Se aplica en vivo, sin deploy — al próximo caso que se cree o al próximo veterinario que se elija.
      </p>

      {cargando && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      {form && (
        <>
          <Seccion titulo="Cargo de plataforma">
            <Campo etiqueta="Horario diurno ($)" ayuda="08:30 a 20:00">
              <input
                className="va-input"
                type="number"
                value={form.cargoPlataformaDiurna}
                onChange={(e) => actualizarCampo("cargoPlataformaDiurna", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Horario nocturno ($)" ayuda="20:01 a 08:29">
              <input
                className="va-input"
                type="number"
                value={form.cargoPlataformaNocturna}
                onChange={(e) => actualizarCampo("cargoPlataformaNocturna", e.target.value)}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Honorario base del veterinario">
            <Campo etiqueta="Consulta normal ($)">
              <input
                className="va-input"
                type="number"
                value={form.honorarioBaseNormal}
                onChange={(e) => actualizarCampo("honorarioBaseNormal", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Consulta de urgencia ($)" ayuda="Cuando el intake disparó alguna bandera roja">
              <input
                className="va-input"
                type="number"
                value={form.honorarioBaseUrgencia}
                onChange={(e) => actualizarCampo("honorarioBaseUrgencia", e.target.value)}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Premio por volumen">
            <Campo etiqueta="Sesiones cerradas para calificar" ayuda="A partir de superar este número">
              <input
                className="va-input"
                type="number"
                value={form.umbralSesionesVeterano}
                onChange={(e) => actualizarCampo("umbralSesionesVeterano", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Premio (%)" ayuda="Se suma arriba del margen propio del veterinario — lo paga el cliente, automático">
              <input
                className="va-input"
                type="number"
                value={form.bonusVeteranoPorcentaje}
                onChange={(e) => actualizarCampo("bonusVeteranoPorcentaje", e.target.value)}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Contacto y redes">
            <Campo etiqueta="Email de contacto" ayuda="Se muestra en la pantalla de Contacto">
              <input
                className="va-input"
                type="email"
                value={form.emailContacto}
                onChange={(e) => actualizarCampo("emailContacto", e.target.value)}
                placeholder="contacto@tudominio.com"
              />
            </Campo>
            <Campo etiqueta="Instagram" ayuda="Link completo, con https://">
              <input
                className="va-input"
                type="url"
                value={form.instagramUrl}
                onChange={(e) => actualizarCampo("instagramUrl", e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </Campo>
            <Campo etiqueta="Facebook" ayuda="Link completo, con https://">
              <input
                className="va-input"
                type="url"
                value={form.facebookUrl}
                onChange={(e) => actualizarCampo("facebookUrl", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </Campo>
            <Campo etiqueta="TikTok" ayuda="Link completo, con https://">
              <input
                className="va-input"
                type="url"
                value={form.tiktokUrl}
                onChange={(e) => actualizarCampo("tiktokUrl", e.target.value)}
                placeholder="https://tiktok.com/@..."
              />
            </Campo>
          </Seccion>

          {guardado && (
            <p style={{ fontSize: 13, color: "var(--oliva)", marginBottom: 12 }} role="status">
              Guardado — ya está en vivo.
            </p>
          )}

          <button type="button" className="va-boton" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </>
      )}

      <LegalFooter />
    </main>
  );
}
