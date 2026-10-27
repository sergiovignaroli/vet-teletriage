"use client";

// Términos y Condiciones (Sergio, 2026-09-30): antes no existía esta
// página en ningún lado — los precios y la naturaleza del servicio no
// estaban aclarados en ningún documento, solo repartidos en la letra de
// distintas pantallas. Los montos de acá abajo se traen en vivo de
// GET /configuracion (la misma fuente que usa el backend para cobrar) para
// que este texto nunca quede desactualizado respecto de lo que
// efectivamente se cobra — si Sergio cambia un precio desde
// /admin/precios, este texto cambia solo, sin que nadie tenga que acordarse
// de venir a editarlo a mano.
//
// OJO (para quien retome esto): este texto es un borrador de partida
// razonable, no una revisión legal — antes de depender de él para
// limitar responsabilidad de verdad, conviene que lo revise un abogado.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { apiGet } from "../../lib/api";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

function pesos(valor: number) {
  return `$${valor.toLocaleString("es-AR")}`;
}

export default function TerminosPage() {
  const [config, setConfig] = useState<ConfiguracionPlataforma | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiGet<ConfiguracionPlataforma>("/configuracion")
      .then((c) => {
        if (!cancelado) setConfig(c);
      })
      .catch(() => {
        // Si falla, la página igual se muestra — con la sección de precios
        // sin números en vez de una pantalla rota.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Términos y Condiciones
      </h1>
      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 0, marginBottom: 24 }}>
        Última actualización: 27 de octubre de 2026.
      </p>

      <Seccion titulo="1. Qué es Videollamada Animal">
        <p>
          Videollamada Animal es una plataforma tecnológica que conecta, en todo el territorio de la República
          Argentina, a dueños de mascotas con veterinarios matriculados de forma independiente, para brindar{" "}
          <strong>asesoramiento y orientación veterinaria a distancia</strong>. La plataforma actúa como
          intermediaria: facilita el contacto, el cobro y la videollamada entre las partes, pero no presta ella
          misma el servicio profesional veterinario.
        </p>
        <p>
          La plataforma, el cliente (dueño de la mascota) y el veterinario actúan como partes independientes en
          esta relación — cada veterinario ejerce su profesión de manera autónoma, bajo su propia matrícula y
          responsabilidad profesional, y la plataforma no dirige ni supervisa el criterio clínico de ningún
          asesoramiento brindado.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué NO es este servicio">
        <p>
          Este servicio consiste en asesoramiento y orientación a distancia. <strong>No constituye telemedicina
          diagnóstica ni reemplaza un examen físico presencial.</strong> Ante una emergencia o una situación que
          lo amerite, el veterinario puede recomendar acudir a una guardia veterinaria presencial — esa
          recomendación no genera derecho a reembolso (ver sección 5).
        </p>
      </Seccion>

      <Seccion titulo="3. Precios">
        <p>El costo total de cada asesoramiento tiene dos componentes:</p>
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>
            <strong>Cargo de plataforma:</strong>{" "}
            {config ? (
              <>
                {pesos(config.cargoPlataformaDiurna)} en horario diurno (08:30 a 20:00) y{" "}
                {pesos(config.cargoPlataformaNocturna)} en horario nocturno (20:01 a 08:29).
              </>
            ) : (
              "varía según el horario — ver el detalle en la pantalla de elegir veterinario."
            )}
          </li>
          <li>
            <strong>Honorario del veterinario:</strong>{" "}
            {config ? (
              <>
                a partir de {pesos(config.honorarioBaseNormal)} para un asesoramiento normal, o{" "}
                {pesos(config.honorarioBaseUrgencia)} cuando el asesoramiento se marca como urgente. Cada veterinario
                puede ajustar este valor dentro de un rango fijo definido por la plataforma.
              </>
            ) : (
              "cada veterinario fija su honorario dentro de un rango definido por la plataforma."
            )}
          </li>
        </ul>
        <p>
          Los veterinarios con más de{" "}
          {config ? config.umbralSesionesVeterano : "un número determinado de"} sesiones completadas en la
          plataforma pueden aplicar, de forma automática, un adicional de{" "}
          {config ? `${config.bonusVeteranoPorcentaje}%` : "un porcentaje"} sobre su honorario, que se traslada
          al costo final que paga el cliente.
        </p>
        <p>
          El costo total (cargo de plataforma + honorario del veterinario elegido) se muestra siempre antes de
          confirmar y pagar el asesoramiento — nunca se cobra un monto distinto al que se mostró en ese momento.
        </p>
      </Seccion>

      <Seccion titulo="4. Aceptación de estos términos">
        <p>
          Al solicitar un asesoramiento — es decir, al continuar desde la pantalla de inicio hacia el formulario
          del asesoramiento — se entiende que el cliente conoce y acepta estos Términos y Condiciones. Además, al
          elegir un veterinario el cliente los acepta de forma expresa, tildando la casilla correspondiente; la
          plataforma registra la versión aceptada, la fecha y la dirección IP.
        </p>
      </Seccion>

      <Seccion titulo="5. Cómo se pide un asesoramiento">
        <p>
          Elegir un veterinario envía una <strong>solicitud</strong>: el veterinario puede aceptarla o rechazarla, y
          tiene un tiempo limitado para responder (si está atendiendo a otra persona, ese tiempo es algo mayor). Si
          rechaza, no responde a tiempo o el cliente cancela la solicitud, <strong>no se cobra nada</strong> y el
          cliente puede elegir a otro veterinario. Elegir a otro mientras hay una solicitud pendiente cancela la
          anterior.
        </p>
        <p>
          Si el veterinario no puede atender en ese momento, puede proponer un horario posterior (salvo que se haya
          marcado una posible emergencia, caso en el que solo puede aceptar o rechazar). El cliente decide si lo
          acepta, en cuyo caso queda un turno acordado, o elige a otro veterinario. <strong>No se cobra nada hasta
          la hora del turno</strong>, y el cliente puede cancelarlo sin costo antes de ese momento.
        </p>
        <p>
          La plataforma es siempre la intermediaria: puede enviar avisos por sus propios canales (aplicación,
          WhatsApp o correo) al cliente y al veterinario, y no comparte los datos de contacto de uno con el otro. El
          asesoramiento se realiza dentro de la plataforma; cliente y veterinario se comprometen a no trasladar la
          conversación ni los pagos a otros canales.
        </p>
      </Seccion>

      <Seccion titulo="6. Pagos, cancelaciones y reembolsos">
        <p>
          El pago se procesa una vez que el veterinario aceptó la solicitud, antes de que comience el asesoramiento.
          Si el veterinario cierra el asesoramiento como resuelto por orientación o como derivado a una emergencia,
          no corresponde reembolso: el servicio se considera prestado. Si el asesoramiento no pudo completarse por
          un motivo atribuible a la plataforma o al veterinario, se reembolsa el monto correspondiente conforme a
          la política vigente, informada en cada caso puntual.
        </p>
      </Seccion>

      <Seccion titulo="7. Contacto">
        <p>
          Para consultas sobre estos términos, escribinos a <ContactoEmail config={config} /> o visitá nuestra{" "}
          <Link href="/contacto" style={{ color: "var(--esmeralda)" }}>
            página de contacto
          </Link>
          . Para saber cómo tratamos tus datos, ver nuestra{" "}
          <Link href="/privacidad" style={{ color: "var(--esmeralda)" }}>
            Política de Privacidad
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
    <a href={`mailto:${config.emailContacto}`} style={{ color: "var(--esmeralda)" }}>
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
