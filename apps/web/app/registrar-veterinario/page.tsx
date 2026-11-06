"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SelectorEspecies } from "../../components/SelectorEspecies";
import { SelectorFoto } from "../../components/SelectorFoto";
import { apiPost, apiPut, ApiError } from "../../lib/api";
import { useSesionVeterinario } from "../../lib/sesion-veterinario";
import { Pantalla, MarcaGrande } from "../../components/Pantalla";
import { Foto } from "../../components/Foto";
import { CampoContrasena } from "../../components/CampoContrasena";
import { SubirDocumento } from "../../components/SubirDocumento";

// Situación probable, la más grande que se encontró en toda la revisión
// pantalla por pantalla del 2026-09-29: POST /auth/veterinario/registrar
// existía en el backend, completo, desde antes — pero NINGUNA pantalla de
// apps/web lo llamaba nunca. Un veterinario podía loguearse (/ingresar-
// veterinario) pero no había ninguna forma de crear la cuenta primero. Es
// el mismo patrón que calificación/disputa/cierre de caso (backend listo,
// pantalla faltante) pero acá es más grave: sin esto, nadie podía sumarse
// como colega — el corazón del negocio ("colegas se registran", según la
// descripción del proyecto).
//
// A propósito NO dispara automáticamente POST /identidad/iniciar acá — esa
// llamada requiere TRUORA_API_KEY/TRUORA_FLOW_ID configurados en el
// backend (ver README, "Credenciales reales de Truora sin configurar") y
// el flujo real de captura de documento/selfie del lado de Truora todavía
// no está confirmado contra su documentación viva (ver nota [Probable] en
// truora.util.ts). Mejor dejar al veterinario recién registrado en
// PENDIENTE_VERIFICACION, visible como excepción en el panel admin, que
// mandarlo a un botón que hoy tira un error 500 sin credenciales reales.
export default function RegistrarVeterinarioPage() {
  const router = useRouter();
  const { guardar } = useSesionVeterinario();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [dniONumero, setDniONumero] = useState("");
  const [matriculaNumero, setMatriculaNumero] = useState("");
  const [matriculaColegio, setMatriculaColegio] = useState("");
  const [matriculaVenceEl, setMatriculaVenceEl] = useState("");
  const [seguroAseguradora, setSeguroAseguradora] = useState("");
  const [seguroPoliza, setSeguroPoliza] = useState("");
  const [seguroVenceEl, setSeguroVenceEl] = useState("");

  const [docFrente, setDocFrente] = useState<string | null>(null);
  const [docDorso, setDocDorso] = useState<string | null>(null);
  const [docTitulo, setDocTitulo] = useState<string | null>(null);
  const [docHabilitacion, setDocHabilitacion] = useState<string | null>(null);

  const [especies, setEspecies] = useState<string[]>([]);
  const [foto, setFoto] = useState<string | null>(null);
  const [aceptoConvenio, setAceptoConvenio] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recién después del primer intento de enviar se marcan en rojo los campos que
  // faltan (antes, el botón estaba apagado sin decir por qué).
  const [intentado, setIntentado] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Qué está mal en cada campo (si falta o es inválido). Vacío = todo bien.
  const errores: Record<string, string> = {};
  const hoyTexto = new Date().toISOString().slice(0, 10);
  if (!nombre.trim()) errores.nombre = "Escribí tu nombre";
  if (!apellido.trim()) errores.apellido = "Escribí tu apellido";
  if (!email.trim()) errores.email = "Escribí tu email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errores.email = "Revisá el email: no parece válido";
  if (!dniONumero.trim()) errores.dni = "Escribí tu DNI o número de documento";
  if (!password) errores.password = "Elegí una contraseña";
  else if (password.length < 8) errores.password = "Tiene que tener al menos 8 caracteres";
  else if (password.length > 72) errores.password = "Es demasiado larga (máximo 72 caracteres)";
  if (!confirmarPassword) errores.confirmar = "Repetí la contraseña";
  else if (password !== confirmarPassword) errores.confirmar = "Las contraseñas no coinciden";
  if (!matriculaNumero.trim()) errores.matricula = "Escribí tu número de matrícula";
  if (!matriculaColegio.trim()) errores.colegio = "Indicá el colegio o jurisdicción";
  if (!matriculaVenceEl) errores.matriculaVence = "Indicá hasta cuándo vale tu matrícula";
  else if (matriculaVenceEl < hoyTexto) errores.matriculaVence = "Esa fecha ya pasó: tu matrícula tiene que estar vigente";
  // Seguro: opcional, pero si empieza a cargarlo tiene que completarlo.
  const seguroEmpezado = !!(seguroAseguradora.trim() || seguroPoliza.trim() || seguroVenceEl);
  if (seguroEmpezado) {
    if (!seguroAseguradora.trim()) errores.aseguradora = "Falta la aseguradora (o dejá el seguro vacío)";
    if (!seguroPoliza.trim()) errores.poliza = "Falta el número de póliza (o dejá el seguro vacío)";
    if (!seguroVenceEl) errores.seguroVence = "Falta el vencimiento (o dejá el seguro vacío)";
    else if (seguroVenceEl < hoyTexto) errores.seguroVence = "Esa fecha ya pasó: el seguro tiene que estar vigente";
  }
  if (!docFrente) errores.docFrente = "Falta la foto de tu documento";
  if (!docTitulo) errores.docTitulo = "Falta la foto de tu título";
  if (!docHabilitacion) errores.docHabilitacion = "Falta la foto de tu carnet o certificado";
  if (especies.length === 0) errores.especies = "Marcá al menos una especie";
  if (!aceptoConvenio) errores.convenio = "Para crear la cuenta tenés que aceptar el convenio, los términos y la política de privacidad";

  const hayErrores = Object.keys(errores).length > 0;
  // Se muestra el error de un campo solo después de intentar enviar (o, para las
  // contraseñas, apenas escribió algo que no coincide).
  const ver = (k: string): string | undefined => {
    if (!errores[k]) return undefined;
    if (intentado) return errores[k];
    if (k === "confirmar" && confirmarPassword.length > 0 && password !== confirmarPassword) return errores[k];
    return undefined;
  };

  interface RespuestaRegistroVeterinario {
    accessToken: string;
    refreshToken: string;
    accesoExpiraEnSegundos: number;
    presencia: "CONECTADO" | "STAND_BY" | "DESCONECTADO";
    veterinarioId: string;
    nombre: string;
    apellido: string;
    estado: string;
    disponible: boolean;
    margenPorcentaje: number;
    onboardingCompletado: boolean;
  }

  async function registrar() {
    setIntentado(true);
    if (hayErrores) {
      setError("Revisá los campos marcados en rojo para poder crear tu cuenta.");
      // Espera a que React pinte los errores y lleva la vista al primero.
      setTimeout(() => {
        const primero = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-campo-error="1"]');
        primero?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (primero && "focus" in primero) primero.focus({ preventScroll: true });
      }, 50);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await apiPost<RespuestaRegistroVeterinario>("/auth/veterinario/registrar", {
        nombre,
        apellido,
        email,
        telefono: telefono || undefined,
        password,
        dniONumero,
        matriculaNumero,
        matriculaColegio,
        matriculaVenceEl,
        seguroAseguradora: seguroAseguradora.trim() || undefined,
        seguroPoliza: seguroPoliza.trim() || undefined,
        seguroVenceEl: seguroVenceEl || undefined,
        especiesAtiende: especies,
        foto: foto ?? undefined,
        aceptoConvenio: true,
      });
      guardar({
        accessToken: respuesta.accessToken,
        refreshToken: respuesta.refreshToken,
        accesoVenceEl: Date.now() + respuesta.accesoExpiraEnSegundos * 1000,
        presencia: respuesta.presencia,
        veterinarioId: respuesta.veterinarioId,
        nombre: respuesta.nombre,
        apellido: respuesta.apellido,
        estado: respuesta.estado,
        disponible: respuesta.disponible,
        margenPorcentaje: respuesta.margenPorcentaje,
        onboardingCompletado: respuesta.onboardingCompletado,
      });
      // La documentación se sube justo después de crear la cuenta (con la sesión
      // recién emitida). Si alguna falla, el panel muestra qué falta subir.
      const documentos: Array<[string, string | null]> = [
        ["DOCUMENTO_FRENTE", docFrente],
        ["DOCUMENTO_DORSO", docDorso],
        ["TITULO", docTitulo],
        ["HABILITACION", docHabilitacion],
      ];
      for (const [tipo, imagen] of documentos) {
        if (!imagen) continue;
        try {
          await apiPut(`/veterinarios/documentos/${tipo}`, respuesta.accessToken, { imagen });
        } catch {
          /* queda como faltante en el panel */
        }
      }
      // panel-veterinario ya sabe mostrar el onboarding de 3 pantallas
      // cuando onboardingCompletado es false (default para una cuenta
      // recién creada) — no hace falta ninguna pantalla intermedia acá.
      router.push("/panel-veterinario");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos crear tu cuenta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla titulo="Sumate como veterinario" ayuda="/veterinario/ayuda" variante="terracota" ancho={480} volver="/ingresar-veterinario">
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Sumate como veterinario
      </h1>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0, marginBottom: 24 }}>
        Con tu matrícula vigente podés empezar a brindar asesoramiento online. Revisamos tus datos y tu documentación antes de habilitarte — mientras tanto tu cuenta queda pendiente de revisión.
      </p>

      <Foto
        src="/fotos/veterinario-escritorio.webp"
        alt="Las manos de un veterinario con guardapolvo, en su escritorio, durante una videollamada en la laptop"
        posicion="40% 50%"
        className="va-banner-ancho"
        style={{ borderRadius: 22, border: "1px solid var(--borde)", marginBottom: 8 }}
      >
        <span
          style={{
            position: "absolute",
            right: 10,
            bottom: 8,
            padding: "3px 9px",
            borderRadius: 999,
            background: "rgba(12,42,36,0.7)",
            color: "var(--video-texto)",
            fontSize: 11,
          }}
        >
          Imagen ilustrativa
        </span>
      </Foto>

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          registrar();
        }}
      >
        <h2 className="va-etiqueta" style={{ marginTop: 20, marginBottom: 10 }}>Tus datos</h2>
        <Campo etiqueta="Nombre" value={nombre} onChange={setNombre} autoComplete="given-name" error={ver("nombre")} />
        <Campo etiqueta="Apellido" value={apellido} onChange={setApellido} autoComplete="family-name" error={ver("apellido")} />
        <Campo etiqueta="Email" value={email} onChange={setEmail} type="email" autoComplete="email" error={ver("email")} />
        <Campo etiqueta="Teléfono (opcional)" value={telefono} onChange={setTelefono} type="tel" autoComplete="tel" />
        <Campo etiqueta="DNI o número de documento" value={dniONumero} onChange={setDniONumero} error={ver("dni")} />
        <Campo
          etiqueta="Contraseña"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres."
          error={ver("password")}
        />
        <Campo
          etiqueta="Confirmar contraseña"
          value={confirmarPassword}
          onChange={setConfirmarPassword}
          type="password"
          autoComplete="new-password"
          error={ver("confirmar")}
        />

        <h2 className="va-etiqueta" style={{ marginTop: 24, marginBottom: 10 }}>
          Matrícula profesional
        </h2>
        <Campo etiqueta="Número de matrícula" value={matriculaNumero} onChange={setMatriculaNumero} error={ver("matricula")} />
        <Campo etiqueta="Colegio / jurisdicción" value={matriculaColegio} onChange={setMatriculaColegio} error={ver("colegio")} />
        <Campo etiqueta="Vencimiento de la matrícula" value={matriculaVenceEl} onChange={setMatriculaVenceEl} type="date" error={ver("matriculaVence")} />

        <h2 className="va-etiqueta" style={{ marginTop: 24, marginBottom: 6 }}>
          Tu documentación
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
          Sacale una foto con el celular o subí una imagen. Solo la ve nuestro equipo, para verificar que sos vos y que estás habilitado para ejercer.
        </p>
        <SubirDocumento
          etiqueta="DNI o pasaporte (frente)"
          ayuda="Que se lea bien y se vea completo."
          valor={docFrente}
          onChange={setDocFrente}
          error={ver("docFrente")}
        />
        <SubirDocumento
          etiqueta="DNI (dorso)"
          ayuda="Solo si es DNI. El pasaporte no lo necesita."
          opcional
          valor={docDorso}
          onChange={setDocDorso}
        />
        <SubirDocumento
          etiqueta="Carnet del Colegio de Médicos Veterinarios o certificado de habilitación"
          ayuda="El que tengas: alcanza con uno."
          valor={docHabilitacion}
          onChange={setDocHabilitacion}
          error={ver("docHabilitacion")}
        />
        <SubirDocumento
          etiqueta="Título habilitante"
          ayuda="Foto del título de Médico Veterinario."
          valor={docTitulo}
          onChange={setDocTitulo}
          error={ver("docTitulo")}
        />

        <h2 className="va-etiqueta" style={{ marginTop: 24, marginBottom: 6 }}>
          Seguro de responsabilidad civil (opcional)
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
          No es obligatorio. Si tenés uno, cargalo y lo tenemos en cuenta; si no, dejá estos tres campos vacíos.
        </p>
        <Campo etiqueta="Aseguradora" value={seguroAseguradora} onChange={setSeguroAseguradora} error={ver("aseguradora")} />
        <Campo etiqueta="Número de póliza" value={seguroPoliza} onChange={setSeguroPoliza} error={ver("poliza")} />
        <Campo etiqueta="Vencimiento del seguro" value={seguroVenceEl} onChange={setSeguroVenceEl} type="date" error={ver("seguroVence")} />

        <h2 className="va-etiqueta" style={{ marginTop: 24, marginBottom: 10 }}>
          Tu foto (opcional)
        </h2>
        <SelectorFoto valor={foto} onChange={setFoto} nombre={nombre} apellido={apellido} idBase="reg-foto" />

        <h2 className="va-etiqueta" style={{ marginTop: 24, marginBottom: 6 }}>
          ¿Qué especies atendés?
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
          Marcá todas las que atendés. Solo te van a llegar consultas de esas especies. Lo podés cambiar después desde tu panel.
        </p>
        <div data-campo-error={ver("especies") ? "1" : undefined} tabIndex={-1} style={{ outline: "none" }}>
          <SelectorEspecies valor={especies} onChange={setEspecies} idBase="reg-esp" />
        </div>
        {ver("especies") && (
          <p role="alert" className="va-error-texto">
            {ver("especies")}
          </p>
        )}

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.5, marginTop: 22 }}>
          <input
            type="checkbox"
            checked={aceptoConvenio}
            onChange={(e) => setAceptoConvenio(e.target.checked)}
            aria-invalid={ver("convenio") ? true : undefined}
            style={{ width: 20, height: 20, marginTop: 1, flex: "none", accentColor: ver("convenio") ? "var(--campo-error)" : undefined }}
          />
          <span>
            Leí y acepto el{" "}
            <Link href="/convenio-veterinario" target="_blank" style={{ color: "var(--esmeralda)", fontWeight: 700 }}>
              Convenio de adhesión
            </Link>
            , los{" "}
            <Link href="/terminos" target="_blank" style={{ color: "var(--esmeralda)", fontWeight: 700 }}>
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" target="_blank" style={{ color: "var(--esmeralda)", fontWeight: 700 }}>
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

        {ver("convenio") && (
          <p role="alert" className="va-error-texto">
            {ver("convenio")}
          </p>
        )}

        {error && (
          <p className="va-error-texto" style={{ fontSize: 13.5, marginTop: 12 }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="va-boton" disabled={enviando} style={{ marginTop: 20 }}>
          {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
        </button>
      </form>

      <Link
        href="/ingresar-veterinario"
        style={{ fontSize: 13, opacity: 0.75, marginTop: 24, textDecoration: "underline", display: "block", textAlign: "center" }}
      >
        ¿Ya tenés cuenta? Ingresá acá
      </Link>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 18px", marginTop: 10, fontSize: 13 }}>
        <Link href="/recuperar-contrasena" style={{ textDecoration: "underline", opacity: 0.75 }}>
          Olvidé mi contraseña
        </Link>
        <Link href="/recuperar-usuario" style={{ textDecoration: "underline", opacity: 0.75 }}>
          Olvidé mi usuario
        </Link>
      </div>

    </Pantalla>
  );
}

function Campo({
  etiqueta,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  ayuda,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  ayuda?: string;
}) {
  return (
    <label style={{ display: "block", margin: "12px 0", fontSize: 14, fontWeight: 600 }}>
      <span className={error ? "va-etiqueta-error" : undefined}>{etiqueta}</span>
      {type === "password" ? (
        <CampoContrasena
          value={value}
          onChange={onChange}
          autoComplete={autoComplete === "current-password" ? "current-password" : "new-password"}
          style={{ marginTop: 6, fontWeight: 400 }}
          invalido={!!error}
        />
      ) : (
        <input
          className="va-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          style={{ marginTop: 6, fontWeight: 400 }}
        />
      )}
      {ayuda && !error && (
        <span style={{ display: "block", color: "var(--muted)", fontSize: 12, fontWeight: 400, marginTop: 4 }}>{ayuda}</span>
      )}
      {error && (
        <span role="alert" className="va-error-texto" style={{ display: "block", marginTop: 4 }}>
          {error}
        </span>
      )}
    </label>
  );
}
