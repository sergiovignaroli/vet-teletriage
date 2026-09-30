"use client";

// Política de Privacidad (Sergio, 2026-09-30: "armá algo bien completo" —
// después de confirmar que, aparte de esta app, hay tres sitios sueltos en
// Wix con borradores de Términos/Privacidad/landing que NO están conectados
// a este sistema y no reflejan lo que realmente se construyó acá — por
// ejemplo, esos borradores mencionaban PayPal y Stripe como procesadores de
// pago, cuando el único que existe en el código es Mercado Pago. Esta
// página se escribió desde el sistema real (qué datos toca cada módulo:
// Truora para identidad, Agora para video, Mercado Pago para pagos), no
// copiando ese borrador — ver el mensaje al usuario sobre qué hacer con
// esos tres sitios de Wix.
//
// Mismo criterio que /terminos: no se inventa razón social, CUIT ni
// domicilio legal — quedan pendientes de que Sergio los confirme. Tampoco
// se afirma nada sobre grabación de las videollamadas: no existe ninguna
// funcionalidad de grabación en el código (Agora se usa solo para la
// sesión en vivo), así que la política dice eso mismo, no lo contrario.
//
// OJO (para quien retome esto): igual que /terminos, esto es un borrador
// de partida razonable a la luz de la Ley 25.326, no una revisión legal.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { apiGet } from "../../lib/api";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

export default function PrivacidadPage() {
  const [config, setConfig] = useState<ConfiguracionPlataforma | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiGet<ConfiguracionPlataforma>("/configuracion")
      .then((c) => {
        if (!cancelado) setConfig(c);
      })
      .catch(() => {
        // Igual que en /terminos: si falla, la página se muestra igual,
        // con la sección de contacto sin el email en vez de romperse.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Política de Privacidad
      </h1>
      <p style={{ fontSize: 12, opacity: 0.55, marginTop: 0, marginBottom: 24 }}>
        Última actualización: 30 de septiembre de 2026.
      </p>

      <Seccion titulo="1. Quién es responsable de tus datos">
        <p>
          Videollamada Animal — cuyos datos legales completos (razón social y CUIT) se están terminando de
          registrar y se incorporarán a este documento apenas estén confirmados — es responsable del
          tratamiento de los datos personales que se describen acá, conforme a la Ley 25.326 de Protección de
          Datos Personales de la República Argentina.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos recolectamos">
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>
            <strong>Datos de contacto:</strong> nombre, email y teléfono, tanto de clientes como de
            veterinarios.
          </li>
          <li>
            <strong>Datos de identidad (solo veterinarios):</strong> para habilitar a un veterinario en la
            plataforma, verificamos su identidad con un proveedor externo especializado (Truora), que puede
            incluir el cotejo de su documento contra el RENAPER y una prueba de vida (una selfie o video corto
            para confirmar que la persona está presente y es quien dice ser). Nosotros no vemos ni guardamos
            esas imágenes — solo recibimos el resultado (verificado o no) de ese proceso.
          </li>
          <li>
            <strong>Datos profesionales (solo veterinarios):</strong> matrícula profesional y datos del seguro
            de responsabilidad civil vigente.
          </li>
          <li>
            <strong>Datos del asesoramiento:</strong> la especie de la mascota y lo que contás sobre lo que le
            pasa, para poder conectarte con un veterinario y darle contexto antes de la videollamada.
          </li>
          <li>
            <strong>Datos de pago:</strong> el pago se procesa a través de Mercado Pago — nosotros no vemos ni
            guardamos el número de tu tarjeta ni tus credenciales de pago; Mercado Pago nos informa el
            resultado (aprobado, pendiente, reembolsado) y el monto.
          </li>
          <li>
            <strong>La videollamada en sí:</strong> las sesiones de video se transmiten en vivo entre vos y el
            veterinario a través de nuestro proveedor de video (Agora) y <strong>no se graban ni se guardan</strong> —
            no existe ninguna funcionalidad en la plataforma para grabar o almacenar la videollamada.
          </li>
          <li>
            <strong>Datos de uso:</strong> información técnica básica (como qué dispositivo o navegador usás)
            que se genera automáticamente al usar la plataforma.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Los datos de salud de tu mascota">
        <p>
          [Probable] Bajo la Ley 25.326, un "dato personal" es información referida a una persona humana
          identificada o identificable — los datos de salud de tu mascota, al no tratarse de una persona, no
          están alcanzados por esa definición legal. Aun así, los tratamos con la misma confidencialidad que el
          resto de la información: se usan únicamente para que el veterinario pueda asesorarte, y no se
          comparten con nadie ajeno al asesoramiento puntual.
        </p>
      </Seccion>

      <Seccion titulo="4. Para qué usamos tus datos">
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>Conectarte con un veterinario y permitir la videollamada.</li>
          <li>Procesar el pago del asesoramiento.</li>
          <li>Verificar la identidad y matrícula de los veterinarios antes de habilitarlos.</li>
          <li>Prevenir fraude y hacer cumplir nuestros Términos y Condiciones.</li>
          <li>Cumplir obligaciones legales, impositivas o contables.</li>
          <li>Comunicarnos con vos sobre tu asesoramiento (por ejemplo, por WhatsApp, si hace falta coordinar).</li>
        </ul>
      </Seccion>

      <Seccion titulo="5. Con quién compartimos tus datos">
        <p>
          No vendemos tus datos a nadie. Los compartimos únicamente con los proveedores que necesitamos para
          poder prestar el servicio, cada uno con acceso solo a lo que le corresponde:
        </p>
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>
            <strong>Mercado Pago</strong>, para procesar el pago.
          </li>
          <li>
            <strong>Truora</strong>, para verificar la identidad de los veterinarios.
          </li>
          <li>
            <strong>Agora</strong>, como infraestructura técnica de la videollamada en vivo (no almacena la
            sesión — ver sección 2).
          </li>
          <li>
            <strong>WhatsApp</strong>, cuando hace falta coordinar algo puntual con vos.
          </li>
          <li>
            El proveedor de hosting que aloja la plataforma, únicamente como infraestructura técnica.
          </li>
        </ul>
        <p>
          También podemos compartir datos si nos lo exige una ley, una orden judicial, o una autoridad
          competente.
        </p>
      </Seccion>

      <Seccion titulo="6. Cuánto tiempo guardamos tus datos">
        <p>
          Guardamos tus datos mientras tengas una cuenta activa y por el plazo adicional que exijan nuestras
          obligaciones legales, impositivas o contables (por ejemplo, los comprobantes de pago). Si pedís la
          eliminación de tu cuenta, eliminamos lo que no estemos obligados a conservar por ley.
        </p>
      </Seccion>

      <Seccion titulo="7. Tus derechos">
        <p>
          Como titular de tus datos, tenés derecho a acceder a ellos, rectificarlos si están mal, pedir su
          supresión, y revocar el consentimiento que hayas dado — todo esto conforme a la Ley 25.326. También
          podés hacer una denuncia ante la Agencia de Acceso a la Información Pública, el organismo de control
          de esta ley en Argentina, si considerás que no la estamos cumpliendo. Para ejercer cualquiera de estos
          derechos, escribinos a <ContactoEmail config={config} />.
        </p>
      </Seccion>

      <Seccion titulo="8. Seguridad">
        <p>
          Usamos conexión cifrada (HTTPS) en toda la plataforma, y el acceso a la videollamada se controla con
          un token que solo es válido para las dos partes del asesoramiento puntual y por tiempo limitado.
          Ningún sistema es 100% infalible, pero tomamos medidas razonables para proteger tu información.
        </p>
      </Seccion>

      <Seccion titulo="9. Menores de edad">
        <p>
          Este servicio está pensado para personas mayores de 18 años. Si sos menor de edad, necesitás que un
          adulto responsable solicite el asesoramiento por vos.
        </p>
      </Seccion>

      <Seccion titulo="10. Cambios a esta política">
        <p>
          Podemos actualizar esta política a medida que la plataforma cambie. La fecha de "última actualización"
          al principio de esta página siempre refleja la versión vigente.
        </p>
      </Seccion>

      <Seccion titulo="11. Contacto">
        <p>
          Para cualquier consulta sobre esta Política de Privacidad o sobre tus datos, escribinos a{" "}
          <ContactoEmail config={config} /> o visitá nuestra{" "}
          <Link href="/contacto" style={{ color: "var(--terracota)" }}>
            página de contacto
          </Link>
          . También podés ver nuestros{" "}
          <Link href="/terminos" style={{ color: "var(--terracota)" }}>
            Términos y Condiciones
          </Link>
          .
        </p>
      </Seccion>

      <LegalFooter />
    </main>
  );
}

function ContactoEmail({ config }: { config: ConfiguracionPlataforma | null }) {
  if (!config?.emailContacto) return <>el email que figura en nuestra página de contacto</>;
  return (
    <a href={`mailto:${config.emailContacto}`} style={{ color: "var(--terracota)" }}>
      {config.emailContacto}
    </a>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{titulo}</h2>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.85 }}>{children}</div>
    </section>
  );
}
