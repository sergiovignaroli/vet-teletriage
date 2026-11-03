"use client";

// Convenio de adhesión del veterinario. Texto adaptado del Borrador 1 del
// libro para el abogado (3/11/2026). Los valores que dependen de la
// configuración (modo de precios, cargo de servicio) se traen en vivo de la
// API para no quedar desactualizados; los números fijos salen de las mismas
// constantes que usa el sistema (piso de calidad, puntos, solicitudes sin
// responder). Los plazos que todavía no están definidos NO se inventan: el
// texto dice "aviso previo" / "plazo razonable" hasta que el abogado fije
// cuántos días. Si cambia el texto, subir VERSION_CONVENIO_VETERINARIO en
// packages/types: todos los veterinarios tendrán que volver a aceptarlo.
//
// OJO: es un borrador de partida, NO una revisión legal. Puntos que el
// abogado debe mirar: cláusula 7.2 (PayPal), 12.1 (indemnidad frente al
// art. 40 de la Ley 24.240), 14 (plazo de aviso) y 15 (jurisdicción).
import { useEffect, useState } from "react";
import Link from "next/link";
import { PISO_CALIDAD_ESTRELLAS, PUNTOS_POR_CALIFICACION_PERFECTA, VERSION_CONVENIO_VETERINARIO } from "@vet-teletriage/types";
import { apiGet } from "../../lib/api";
import { Pantalla } from "../../components/Pantalla";
import { CUIT, DOMICILIO_COMERCIAL, TITULAR } from "../../lib/datos-legales";

interface ResumenPrecios {
  modo: "FIJO" | "BANDA" | "LIBRE";
  porcentajePlataforma: number;
  cargoMinimoDiurno: number;
  cargoMinimoNocturno: number;
}

const pesos = (v: number) => `$${v.toLocaleString("es-AR")}`;

export default function ConvenioVeterinarioPage() {
  const [precios, setPrecios] = useState<ResumenPrecios | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiGet<ResumenPrecios>("/precios-publico?pais=AR")
      .then((r) => {
        if (!cancelado) setPrecios(r);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <Pantalla titulo="Convenio" variante="terracota" ancho={640} volver="/registrar-veterinario">
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Convenio de adhesión del profesional veterinario
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0, marginBottom: 24 }}>
        Versión {VERSION_CONVENIO_VETERINARIO}.
      </p>

      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
        Entre {TITULAR}, CUIT {CUIT}, con domicilio comercial en {DOMICILIO_COMERCIAL} (en adelante, &ldquo;la
        Plataforma&rdquo;), y la persona que se registra como veterinario/a, identificada con los datos que consigna al
        crear su cuenta (en adelante, &ldquo;el Profesional&rdquo;), se celebra este convenio de adhesión, que el
        Profesional acepta al tildar la casilla correspondiente.
      </p>

      <Seccion titulo="1. Objeto">
        <p>
          La Plataforma pone a disposición del Profesional una herramienta tecnológica para que reciba solicitudes de
          asesoramiento veterinario a distancia de tutores de mascotas, realice la videollamada, cobre su honorario y
          reciba calificaciones. La Plataforma no presta servicios veterinarios.
        </p>
      </Seccion>

      <Seccion titulo="2. Independencia">
        <p>
          2.1. El Profesional actúa por cuenta propia, como profesional independiente. No existe relación de
          dependencia, sociedad, mandato, agencia ni representación entre el Profesional y la Plataforma.
        </p>
        <p>
          2.2. El Profesional decide libremente si se conecta, cuándo y por cuánto tiempo; si acepta, rechaza o propone
          otro horario a cada solicitud, sin necesidad de dar explicaciones; y su criterio clínico en cada
          asesoramiento. La Plataforma no le imparte instrucciones sobre el contenido ni la forma de la atención.
        </p>
        <p>
          2.3. No hay exclusividad ni cantidad mínima de consultas, de horas conectadas ni de aceptación de solicitudes.
          El Profesional puede ejercer por otros medios y en otras plataformas.
        </p>
        <p>
          2.4. El Profesional es responsable de su inscripción y cumplimiento ante las autoridades impositivas y
          previsionales que le correspondan, y de emitir los comprobantes por sus honorarios.
        </p>
      </Seccion>

      <Seccion titulo="3. Requisitos y declaraciones">
        <p>
          3.1. El Profesional declara, con carácter de declaración jurada, que: (a) los datos suministrados son
          verdaderos; (b) posee título habilitante y matrícula vigente, en la jurisdicción y colegio informados; (c)
          posee seguro de responsabilidad civil profesional vigente, con la aseguradora y póliza informadas; (d) no
          tiene sanciones ni inhabilitaciones vigentes que le impidan ejercer; y (e) conoce y respeta el código de ética
          de su colegio profesional.
        </p>
        <p>
          3.2. El Profesional se obliga a informar de inmediato cualquier cambio, suspensión o vencimiento de esos
          requisitos. La Plataforma podrá suspender su cuenta de forma automática al vencer la matrícula o el seguro
          (cláusula 10).
        </p>
        <p>
          3.3. La Plataforma revisa la documentación y, cuando corresponda, la identidad, antes de habilitar la cuenta.
          Esa revisión no constituye garantía sobre la calidad profesional del Profesional ni lo exime de su
          responsabilidad.
        </p>
      </Seccion>

      <Seccion titulo="4. Naturaleza del servicio">
        <p>
          El servicio es de orientación y asesoramiento a distancia y no reemplaza el examen físico. El Profesional se
          compromete a derivar a atención presencial cuando el caso lo requiera y a informar con claridad los límites de
          la orientación a distancia. Frente a un caso marcado por el tutor como posible emergencia, el Profesional puede
          aceptar o rechazar, pero no postergar.
        </p>
      </Seccion>

      <Seccion titulo="5. Honorarios y precios">
        <p>
          5.1.{" "}
          {precios?.modo === "FIJO"
            ? "Los honorarios son los definidos por la Plataforma, iguales para todos los profesionales."
            : precios?.modo === "BANDA"
              ? "El Profesional fija sus honorarios dentro del rango definido por la Plataforma para su país."
              : "El Profesional fija libremente sus honorarios para asesoramiento normal y de urgencia, en horario diurno y nocturno. La Plataforma puede mostrar valores de referencia, que no son obligatorios. La Plataforma registra los cambios de precio."}
        </p>
        <p>
          5.2. El precio vigente al momento en que el tutor elige al Profesional queda congelado para esa solicitud y no
          puede modificarse después.
        </p>
        <p>5.3. El Profesional reconoce que leyó y aceptó el aviso de precios vigente.</p>
      </Seccion>

      <Seccion titulo="6. Cargo de servicio de la Plataforma">
        <p>
          6.1. Por el uso de la herramienta, el cobro, la verificación y la atención de reclamos, la Plataforma percibe un
          cargo de servicio{" "}
          {precios ? (
            <>
              equivalente al {precios.porcentajePlataforma} % del honorario, con un mínimo de{" "}
              {pesos(precios.cargoMinimoDiurno)} en horario diurno y {pesos(precios.cargoMinimoNocturno)} en horario
              nocturno (noche, domingos y feriados). Cuando se cobra en dólares por PayPal, el cargo es un monto fijo en
              dólares que se informa antes de confirmar.
            </>
          ) : (
            "que se informa en la plataforma antes de confirmar cada solicitud."
          )}
        </p>
        <p>6.2. El cargo se informa al tutor, junto con el honorario, antes de que confirme la solicitud.</p>
        <p>6.3. Las comisiones propias del medio de pago son soportadas por el Profesional y se descuentan de su honorario.</p>
      </Seccion>

      <Seccion titulo="7. Cobro">
        <p>
          7.1. <strong>Mercado Pago:</strong> el Profesional vincula su propia cuenta mediante autorización OAuth. El pago
          del tutor se genera con las credenciales del Profesional; el honorario se acredita en su cuenta y el cargo de
          servicio se acredita a la Plataforma como comisión de marketplace. La Plataforma no accede a la contraseña de
          Mercado Pago del Profesional y conserva los tokens de autorización cifrados. El Profesional puede revocar la
          autorización en cualquier momento.
        </p>
        <p>
          7.2. <strong>PayPal:</strong> el tutor paga a la cuenta de la Plataforma y ésta transfiere el honorario a la
          dirección de PayPal informada por el Profesional una vez cerrado el caso, descontadas las comisiones del medio
          de pago.
        </p>
        <p>
          7.3. El cobro se efectúa antes de la videollamada. Los reembolsos se rigen por los Términos y Condiciones.
        </p>
        <p>
          7.4. Para recibir una solicitud, el Profesional debe tener su cuenta de cobro vinculada y operativa.
        </p>
      </Seccion>

      <Seccion titulo="8. Prohibiciones sobre el canal">
        <p>
          8.1. Para proteger el pago, el registro del asesoramiento y el derecho de reclamo del tutor, cada asesoramiento
          iniciado en la Plataforma debe realizarse y pagarse en ella. El Profesional no solicitará ni brindará datos de
          contacto al tutor para realizar fuera de la Plataforma el asesoramiento iniciado en ella.
        </p>
        <p>
          8.2. Esta cláusula no restringe que el Profesional atienda a sus propios pacientes o clientes por otros medios,
          ni que atienda a un tutor que lo contacte por fuera de la Plataforma sin relación con un asesoramiento
          iniciado en ella.
        </p>
      </Seccion>

      <Seccion titulo="9. Datos personales y confidencialidad">
        <p>
          9.1. El Profesional accede a datos del tutor y de la mascota únicamente para el asesoramiento puntual, y se
          obliga a tratarlos con confidencialidad, a no usarlos para otros fines, a no compartirlos y a eliminarlos de
          sus propios dispositivos cuando ya no sean necesarios.
        </p>
        <p>
          9.2. El Profesional no grabará la videollamada ni capturará imágenes de ella sin consentimiento expreso del
          tutor.
        </p>
        <p>
          9.3. La Plataforma trata los datos del Profesional conforme a su{" "}
          <Link href="/privacidad" style={{ color: "var(--esmeralda)" }}>
            Política de Privacidad
          </Link>
          , incluidos la matrícula, el seguro y los datos de cobro. El Profesional acepta que su nombre, matrícula y
          calificaciones sean visibles para los tutores.
        </p>
      </Seccion>

      <Seccion titulo="10. Suspensión y baja">
        <p>
          10.1. La cuenta se suspende automáticamente, de forma no disciplinaria, al vencer la matrícula o el seguro,
          hasta que el Profesional acredite la renovación.
        </p>
        <p>10.2. Ante una disputa de identidad abierta, la cuenta se suspende cautelarmente hasta que se resuelva.</p>
        <p>
          10.3. Si la calificación promedio cae por debajo de {PISO_CALIDAD_ESTRELLAS} estrellas, el Profesional deja de
          figurar entre los elegibles; podrá solicitar una revisión escrita.
        </p>
        <p>
          10.4. Si el Profesional no responde a tres solicitudes consecutivas, su estado pasa automáticamente a
          &ldquo;Stand by&rdquo;; puede volver a conectarse cuando quiera.
        </p>
        <p>
          10.5. La Plataforma podrá dar de baja al Profesional por incumplimiento grave (falsedad en las declaraciones,
          conductas contrarias a la ética, fraude, evasión del cobro), previa comunicación de los motivos y con un plazo
          razonable para responder, salvo urgencia.
        </p>
        <p>10.6. El Profesional puede darse de baja en cualquier momento, sin penalidad, salvo por los asesoramientos en curso.</p>
      </Seccion>

      <Seccion titulo="11. Calificaciones y puntos">
        <p>
          Los tutores califican de 1 a 5 estrellas al cierre de cada caso. La Plataforma otorga{" "}
          {PUNTOS_POR_CALIFICACION_PERFECTA} puntos por cada calificación de 5 estrellas.
        </p>
      </Seccion>

      <Seccion titulo="12. Responsabilidad">
        <p>
          12.1. El Profesional es el único responsable del contenido, criterio y consecuencias de su asesoramiento, sin
          perjuicio de los derechos del tutor consumidor frente a ambos.
        </p>
        <p>
          12.2. La Plataforma es responsable por el funcionamiento de la herramienta tecnológica, el procesamiento del
          pago y la atención de reclamos, en los términos de la ley.
        </p>
      </Seccion>

      <Seccion titulo="13. Propiedad intelectual y marca">
        <p>
          La marca, el diseño y el software son de la Plataforma. El Profesional no adquiere derechos sobre ellos. La
          Plataforma no adquiere derechos sobre la identidad profesional del Profesional más allá de mostrarla dentro de
          la herramienta mientras la cuenta esté activa.
        </p>
      </Seccion>

      <Seccion titulo="14. Duración y modificaciones">
        <p>
          El convenio es por tiempo indeterminado. La Plataforma podrá modificarlo comunicando los cambios con aviso
          previo por sus canales; el Profesional podrá darse de baja sin penalidad si no los acepta. La aceptación se
          registra con versión, fecha y dirección IP.
        </p>
      </Seccion>

      <Seccion titulo="15. Ley aplicable">
        <p>Este convenio se rige por la ley argentina.</p>
      </Seccion>

      <p style={{ fontSize: 13, marginTop: 8 }}>
        <Link href="/registrar-veterinario" style={{ color: "var(--esmeralda)", fontWeight: 700 }}>
          Volver al registro
        </Link>
      </p>
    </Pantalla>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{titulo}</h2>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)" }}>{children}</div>
    </section>
  );
}
