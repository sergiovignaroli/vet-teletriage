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
// razonable, NO una revisión legal. Reescrito el 2026-11-03 según la
// investigación de riesgos (ver el dossier en Notion): describe qué hace la
// plataforma y qué no, sin prometer más de lo que se hace, y no intenta
// "eximir" de todo (en una relación de consumo esas cláusulas suelen caerse y
// pueden volverse en contra). Los montos y el modo de precios se traen en vivo
// de la API para que el texto no quede desactualizado. Antes de lanzar:
// revisión de abogado. Si cambia el texto, subir VERSION_TERMINOS.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { CARGO_NO_COMPLETADO, CARGO_NO_COMPLETADO_USD } from "@vet-teletriage/types";
import { apiGet } from "../../lib/api";
import { Pantalla } from "../../components/Pantalla";
import { TELEFONO_ENLACE, TELEFONO_VISIBLE } from "../../lib/datos-legales";

interface ResumenPrecios {
  modo: "FIJO" | "BANDA" | "LIBRE";
  porcentajePlataforma: number;
  cargoMinimoDiurno: number;
  cargoMinimoNocturno: number;
}

function pesos(valor: number) {
  return `$${valor.toLocaleString("es-AR")}`;
}

export default function TerminosPage() {
  const [config, setConfig] = useState<ConfiguracionPlataforma | null>(null);
  const [precios, setPrecios] = useState<ResumenPrecios | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiGet<ResumenPrecios>("/precios-publico?pais=AR")
      .then((r) => {
        if (!cancelado) setPrecios(r);
      })
      .catch(() => {
        // sin datos, la sección de precios se muestra sin números
      });
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
    <Pantalla titulo="Legal" variante="menta" ancho={640} volver="/">
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Términos y Condiciones
      </h1>
      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 0, marginBottom: 24 }}>
        Última actualización: 3 de noviembre de 2026.
      </p>

      <Seccion titulo="1. Qué es Videollamada Animal">
        <p>
          Videollamada Animal es una plataforma tecnológica que pone en contacto a dueños de mascotas con veterinarios
          matriculados que ejercen de forma independiente, para brindar{" "}
          <strong>asesoramiento y orientación veterinaria a distancia</strong>. La plataforma ofrece la tecnología para
          encontrarse, la videollamada, el cobro y la atención de reclamos; el asesoramiento en sí lo brinda el
          veterinario que vos elegís, no la plataforma.
        </p>
        <p>
          Quién hace qué: <strong>el veterinario</strong> ejerce su profesión de manera autónoma, bajo su propia
          matrícula y responsabilidad profesional, decide su criterio clínico y fija su honorario;{" "}
          <strong>vos</strong> elegís al veterinario y contratás con él el asesoramiento;{" "}
          <strong>la plataforma</strong> verifica la documentación del veterinario al habilitarlo, procesa el pago,
          mantiene la herramienta funcionando y atiende tus reclamos. El veterinario no es empleado ni representante de
          la plataforma, ni está obligado a atender un número mínimo de consultas ni a trabajar en exclusiva con ella.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué NO es este servicio">
        <p>
          Este servicio consiste en asesoramiento y orientación a distancia. <strong>No constituye telemedicina
          diagnóstica ni reemplaza un examen físico presencial.</strong> Ante una emergencia o una situación que
          lo amerite, el veterinario puede recomendar acudir a una guardia veterinaria presencial — esa
          recomendación no genera derecho a reembolso (ver sección 6).
        </p>
      </Seccion>

      <Seccion titulo="3. Precios">
        <p>El precio de cada asesoramiento tiene dos partes, que siempre ves por separado antes de pagar:</p>
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>
            <strong>Honorario del veterinario:</strong>{" "}
            {precios?.modo === "FIJO"
              ? "por ahora la plataforma establece un valor único para cada tipo de asesoramiento y franja horaria, igual para todos los veterinarios."
              : precios?.modo === "BANDA"
                ? "lo fija cada veterinario dentro de un rango definido por la plataforma, y se muestra junto a su perfil."
                : "lo fija cada veterinario, de manera independiente, y se muestra junto a su perfil. La plataforma puede mostrar valores de referencia, que no son obligatorios."}{" "}
            Es distinto para un asesoramiento normal y para uno marcado como urgente, y para el horario diurno y el
            nocturno (noche, domingos y feriados, según la hora local del veterinario).
          </li>
          <li>
            <strong>Cargo de servicio de la plataforma:</strong>{" "}
            {precios ? (
              <>
                {precios.porcentajePlataforma} % del honorario, con un mínimo de {pesos(precios.cargoMinimoDiurno)} en
                horario diurno y {pesos(precios.cargoMinimoNocturno)} en horario nocturno. Es lo que cobra la
                plataforma por su servicio (tecnología, cobro, verificación y atención de reclamos).
              </>
            ) : (
              "es un porcentaje del honorario, con un mínimo, y se muestra en la pantalla de elegir veterinario."
            )}
          </li>
        </ul>
        <p>
          El total (honorario + cargo de servicio del veterinario elegido) se muestra siempre antes de confirmar y
          pagar el asesoramiento — nunca se cobra un monto distinto al que se mostró en ese momento. Los medios de pago
          pueden cobrar sus propias comisiones al veterinario; no se te suman a vos.
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
          La plataforma puede enviar avisos por sus propios canales (aplicación, WhatsApp o correo) al cliente y al
          veterinario, y no comparte los datos de contacto de uno con el otro, para proteger a ambos. Para que el pago
          esté protegido, quede registro del asesoramiento y puedas reclamar si algo sale mal, cada asesoramiento que
          empieza en la plataforma se realiza y se paga dentro de ella.
        </p>
      </Seccion>

      <Seccion titulo="6. Pagos, cancelaciones y reembolsos">
        <p>
          El pago se procesa una vez que el veterinario aceptó la solicitud, antes de que comience el asesoramiento, a
          través de Mercado Pago (en pesos argentinos) o, si lo elegís, de PayPal (en dólares estadounidenses, a un valor
          fijo que ves antes de confirmar). Solo pueden recibir solicitudes los veterinarios que tienen su cuenta de cobro
          conectada.
        </p>
        <p>
          Si el veterinario cierra el asesoramiento como resuelto por orientación o como derivado a una emergencia, no
          corresponde reembolso: el servicio se considera prestado.
        </p>
        <p>
          Si el asesoramiento no pudo completarse y el veterinario lo cierra como no completado, te devolvemos todo lo
          que pagaste menos un cargo fijo de {pesos(CARGO_NO_COMPLETADO)} (US${CARGO_NO_COMPLETADO_USD} si pagaste en
          dólares), que cubre el tiempo y los costos del intento. Si el motivo es atribuible a la plataforma, se te
          reembolsa el monto correspondiente conforme a la política vigente, informada en cada caso puntual.
        </p>
      </Seccion>

      <Seccion titulo="7. Tus derechos y reclamos">
        <p>
          Estos términos no limitan los derechos que te reconoce la ley, incluida la de Defensa del Consumidor. Si algo
          sale mal podés reclamar a la plataforma, que revisa cada reclamo y te responde por escrito, y también ante
          las autoridades de defensa del consumidor de tu jurisdicción. Reclamos sobre el criterio clínico del
          asesoramiento se canalizan hacia el veterinario que lo brindó y su colegio profesional; la plataforma
          colabora aportando el registro del caso.
        </p>
      </Seccion>

      <Seccion titulo="8. Contacto">
        <p>
          Para consultas sobre estos términos, contactanos en <ContactoEmail config={config} /> o visitá nuestra{" "}
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

    </Pantalla>
  );
}

function ContactoEmail({ config }: { config: ConfiguracionPlataforma | null }) {
  if (!config?.emailContacto) return <a href={TELEFONO_ENLACE} style={{ color: "var(--esmeralda)" }}>{TELEFONO_VISIBLE}</a>;
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
