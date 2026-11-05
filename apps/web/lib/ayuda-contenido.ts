// Contenido del Centro de ayuda (Sergio, 2026-11-03): guía de cada función,
// preguntas frecuentes y, aparte, el formulario de "preguntas nuevas" (que
// guarda la API). Todo lo que se afirma acá sale de lo que la plataforma
// hace de verdad (Términos, Convenio y pantallas); los números salen de las
// mismas constantes que usa el resto de la app, para que no se desactualicen.
// Si cambia el comportamiento de una pantalla, cambiar acá también.
import {
  CARGO_NO_COMPLETADO,
  CARGO_NO_COMPLETADO_USD,
  POSTERGAR_OPCIONES_MINUTOS,
  PROPUESTA_SEGUNDOS,
  SOLICITUD_SEGUNDOS_EN_CONSULTA,
  SOLICITUD_SEGUNDOS_LIBRE,
} from "@vet-teletriage/types";

export interface ItemAyuda {
  id: string;
  titulo: string;
  // Párrafos de texto.
  cuerpo?: string[];
  // Pasos numerados (opcional, después de los párrafos).
  pasos?: string[];
}

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
const minutos = (s: number) => `${Math.round(s / 60)} minutos`;
const postergar = POSTERGAR_OPCIONES_MINUTOS.map((m) => (m >= 60 ? `${m / 60} h` : `${m} min`)).join(", ");

// ---------------------------------------------------------------------------
// TUTOR
// ---------------------------------------------------------------------------

export const GUIA_TUTOR: ItemAyuda[] = [
  {
    id: "ingresar",
    titulo: "Cómo ingresar",
    cuerpo: ["No hay contraseña: entrás con tu número de teléfono y un código que te llega por WhatsApp."],
    pasos: [
      "Tocá “Ingresar” e ingresá tu teléfono (con código de área).",
      "Te mandamos un código por WhatsApp. Escribilo en la pantalla.",
      "Si no te llegó, pedí un código nuevo o corregí el número con “Cambiar número”.",
    ],
  },
  {
    id: "iniciar",
    titulo: "Cómo iniciar un asesoramiento",
    cuerpo: ["Desde “Mi panel” tocá “Iniciar un asesoramiento”. Son dos pasos cortos."],
    pasos: [
      "Respondé unas preguntas rápidas de emergencia (respiración, sangrado, convulsiones, golpes, etc.). Si marcás alguna, te recomendamos ir ya a una guardia veterinaria presencial; igual podés seguir si querés orientación mientras tanto.",
      "Elegí qué animal es y contá qué está pasando. Con la especie, te mostramos solo a los veterinarios que atienden ese animal.",
      "Tocá “Ver veterinarios disponibles”.",
    ],
  },
  {
    id: "elegir",
    titulo: "Cómo elegir veterinario",
    cuerpo: [
      "Ves la lista de los veterinarios conectados en ese momento, con su foto, su calificación y el precio. Solo aparecen los que atienden la especie de tu animal. La lista se actualiza sola.",
      "Cada precio tiene dos partes que ves por separado antes de confirmar: el honorario del veterinario y el cargo de servicio de la plataforma. El total que ves es lo que pagás.",
      "Para elegir, tildá que aceptás los Términos y Condiciones y elegí al veterinario. Elegir envía una solicitud: todavía no se cobra nada.",
    ],
  },
  {
    id: "solicitud",
    titulo: "Qué pasa después de elegir (la solicitud)",
    cuerpo: [
      `El veterinario puede aceptar o rechazar. Tiene ${SOLICITUD_SEGUNDOS_LIBRE} segundos para responder (${minutos(SOLICITUD_SEGUNDOS_EN_CONSULTA)} si está atendiendo a otra persona).`,
      "Si rechaza, no responde a tiempo o vos cancelás, no se cobra nada y podés elegir a otro.",
      `Si ahora no puede, puede proponerte un horario más tarde (no lo hace si marcaste una posible emergencia). Tenés ${minutos(PROPUESTA_SEGUNDOS)} para aceptarlo o elegir a otro. Si aceptás, queda un turno acordado: no se cobra nada hasta esa hora y podés cancelarlo sin costo antes.`,
    ],
  },
  {
    id: "pagar",
    titulo: "Cómo pagar",
    cuerpo: [
      "Cuando el veterinario acepta, seguís directo al pago. Pagás con Mercado Pago (en pesos) o, si ese veterinario lo ofrece, con PayPal (en dólares, a un valor fijo que ves antes de confirmar).",
      "El pago se hace siempre dentro de la plataforma, antes de la videollamada. Si el pago queda pendiente (por ejemplo, con una transferencia), tu asesoramiento queda reservado y te avisamos cuando se acredite.",
    ],
  },
  {
    id: "videollamada",
    titulo: "Cómo es la videollamada",
    cuerpo: [
      "Una vez pagado, la videollamada se abre desde tu panel en cuanto el veterinario la inicia: tocá “Entrar a la videollamada”. Permití la cámara y el micrófono cuando te lo pida.",
      "Es un asesoramiento y orientación a distancia: no reemplaza un examen presencial. Si el caso lo requiere, el veterinario te va a recomendar ir a una guardia o a una consulta presencial.",
    ],
  },
  {
    id: "calificar",
    titulo: "Cómo calificar al veterinario",
    cuerpo: [
      "Cuando el asesoramiento termina, en “Mi panel” aparece “Calificar asesoramiento”. Podés dejar de 1 a 5 estrellas y, si querés, un comentario. Tu opinión ayuda a otros tutores a elegir mejor.",
    ],
  },
  {
    id: "reclamar",
    titulo: "Cómo reportar un problema",
    cuerpo: [
      "Si algo salió mal, en “Mi panel” buscá el asesoramiento terminado y tocá “¿Hubo un problema? Reportalo”. El equipo lo revisa y te responde. Si corresponde un reembolso del cargo de plataforma, te llega una notificación.",
    ],
  },
  {
    id: "panel",
    titulo: "Qué veo en “Mi panel”",
    cuerpo: [
      "Tus turnos acordados y propuestas de horario, el botón “Iniciar un asesoramiento” y la lista de tus asesoramientos con su estado. Desde ahí podés seguir con “Elegir veterinario”, entrar a la videollamada, calificar o reportar un problema.",
    ],
  },
];

export const FAQ_TUTOR: ItemAyuda[] = [
  {
    id: "cuanto",
    titulo: "¿Cuánto cuesta?",
    cuerpo: [
      "Depende del veterinario que elijas y del momento (urgencia o no, horario diurno o nocturno). Siempre ves el honorario y el cargo de servicio por separado, y el total, antes de confirmar. Nunca se cobra un monto distinto al que viste.",
    ],
  },
  {
    id: "cuando-cobran",
    titulo: "¿Cuándo se cobra?",
    cuerpo: [
      "Recién cuando el veterinario acepta tu solicitud, antes de empezar la videollamada. Si rechaza, no responde o cancelás, no se cobra nada. En un turno acordado, el pago es a la hora del turno.",
    ],
  },
  {
    id: "no-responde",
    titulo: "El veterinario no responde, ¿qué hago?",
    cuerpo: [
      "Si no responde en el tiempo límite, la solicitud vence sin costo y podés elegir a otro de la lista. Elegir a otro mientras tenés una solicitud pendiente cancela la anterior.",
    ],
  },
  {
    id: "no-hay-vets",
    titulo: "No aparece ningún veterinario, ¿por qué?",
    cuerpo: [
      "La lista muestra solo a los veterinarios conectados en este momento que atienden la especie de tu animal. Si no hay ninguno, probá de nuevo en unos minutos: la lista se actualiza sola.",
    ],
  },
  {
    id: "emergencia",
    titulo: "Mi mascota está muy grave, ¿sirve la plataforma?",
    cuerpo: [
      "Ante una emergencia, andá de inmediato a una guardia veterinaria presencial. Este servicio es de orientación a distancia y no reemplaza la atención presencial. Si marcás una posible emergencia, el veterinario solo puede aceptar o rechazar (no posponer).",
    ],
  },
  {
    id: "reembolso",
    titulo: "¿Cuándo me devuelven el pago?",
    cuerpo: [
      `Si el veterinario cierra el asesoramiento como no completado, te devolvemos todo lo que pagaste menos un cargo fijo de ${pesos(CARGO_NO_COMPLETADO)} (US$ ${CARGO_NO_COMPLETADO_USD} si pagaste en dólares). Si el asesoramiento se resolvió con orientación o se derivó a una emergencia, el servicio se considera prestado y no corresponde reembolso. Si el motivo es atribuible a la plataforma, se te reembolsa según la política vigente. El detalle está en los Términos y Condiciones.`,
    ],
  },
  {
    id: "datos",
    titulo: "¿El veterinario ve mi teléfono?",
    cuerpo: [
      "No. La plataforma no comparte tus datos de contacto con el veterinario ni los de él con vos. Todo ocurre dentro de la plataforma. Ver la Política de Privacidad.",
    ],
  },
  {
    id: "fuera",
    titulo: "El veterinario me pidió pasar a WhatsApp o pagar por fuera, ¿puedo?",
    cuerpo: [
      "Los asesoramientos que empiezan en la plataforma se hacen y se pagan dentro de ella: así tu pago está protegido, queda registro y podés reclamar si algo sale mal. Si un veterinario te pide hacerlo por fuera, no lo hagas y avisanos con una pregunta nueva desde esta pantalla.",
    ],
  },
  {
    id: "especie",
    titulo: "Mi animal no es un perro ni un gato, ¿lo atienden?",
    cuerpo: [
      "Sí, según el veterinario: cada uno marca las especies que atiende (perros, gatos, animales exóticos, de campo y otros). Al indicar tu animal, te mostramos solo a quienes lo atienden.",
    ],
  },
  {
    id: "seguridad",
    titulo: "¿Los veterinarios son matriculados?",
    cuerpo: [
      "Sí. Antes de habilitar a un veterinario revisamos su matrícula, su seguro de responsabilidad civil y, cuando corresponde, su identidad. Cada uno ejerce de forma independiente bajo su propia matrícula y responsabilidad profesional.",
    ],
  },
];

// ---------------------------------------------------------------------------
// VETERINARIO
// ---------------------------------------------------------------------------

export const GUIA_VETERINARIO: ItemAyuda[] = [
  {
    id: "registrarse",
    titulo: "Cómo registrarte",
    cuerpo: [
      "Necesitás matrícula y seguro de responsabilidad civil profesional vigentes. Revisamos tus datos y tu documentación antes de habilitarte; mientras tanto tu cuenta queda pendiente de revisión.",
    ],
    pasos: [
      "Entrá a “Sumate como veterinario” y completá tus datos personales y de contacto.",
      "Cargá tu matrícula y tu seguro con sus vencimientos.",
      "Subí tu foto (opcional): la ven los tutores en la lista.",
      "Marcá las especies que atendés: solo te llegan consultas de esas especies.",
      "Leé y aceptá el Convenio de adhesión, los Términos y la Política de Privacidad, y creá tu cuenta.",
    ],
  },
  {
    id: "habilitacion",
    titulo: "Cuándo quedo habilitado/a",
    cuerpo: [
      "Cuando revisamos tu documentación y queda aprobada. Hasta entonces no podés conectarte. Tu cuenta también se suspende de forma automática si vence la matrícula o el seguro, hasta que acredites la renovación; avisanos de cualquier cambio.",
    ],
  },
  {
    id: "cobro",
    titulo: "Cómo conectar tu cuenta de cobro",
    cuerpo: [
      "Para que te puedan elegir tenés que conectar un medio de cobro desde “Medios de cobro” (se llega desde tu panel). Alcanza con uno:",
      "Mercado Pago: autorizás tu propia cuenta. La plataforma nunca ve tu contraseña, solo un permiso que emite Mercado Pago, y podés revocarlo cuando quieras. El pago del tutor se genera con tus credenciales: tu honorario se acredita directo en tu cuenta.",
      "PayPal: cargás tu email de PayPal. Cuando un tutor paga con PayPal, la plataforma te transfiere tu honorario a esa dirección una vez que cerrás el caso.",
    ],
  },
  {
    id: "presencia",
    titulo: "Conectado, Stand by y Desconectado",
    cuerpo: [
      "Conectado: los tutores te ven en la lista y pueden elegirte.",
      "Stand by: seguís con la sesión abierta y también te pueden elegir, pero los tutores ven que podés tardar más en responder.",
      "Desconectado: no aparecés en la lista.",
      "Mientras estés Conectado o en Stand by, dejá el panel abierto: si lo cerrás, dejás de aparecer a los 5 minutos. Con los avisos activados en tu dispositivo podés cerrar la pestaña y te llega una notificación cuando alguien te elige.",
    ],
  },
  {
    id: "solicitudes",
    titulo: "Cómo responder una solicitud",
    cuerpo: [
      `Cuando un tutor te elige ves el contexto clínico (especie, motivo, señales de emergencia) sin ningún dato de contacto. Tenés ${SOLICITUD_SEGUNDOS_LIBRE} segundos para responder (${minutos(SOLICITUD_SEGUNDOS_EN_CONSULTA)} si estás en otra consulta). Podés:`,
      "Aceptar: el tutor sigue al pago y, cuando se acredita, iniciás la videollamada desde tu panel.",
      `Rechazar: sin explicaciones, no se cobra nada y el tutor elige a otro.`,
      `Postergar: proponés un horario posterior (${postergar}). El tutor tiene ${minutos(PROPUESTA_SEGUNDOS)} para aceptarlo. No se puede postergar un caso marcado como posible emergencia: ahí solo aceptás o rechazás.`,
      "Si no respondés tres solicitudes seguidas, tu estado pasa solo a Stand by; volvés a Conectado cuando quieras.",
    ],
  },
  {
    id: "atender",
    titulo: "Cómo atender y cerrar un asesoramiento",
    cuerpo: [
      "Desde “Mis casos” abrís la videollamada. No la grabes ni captures imágenes sin consentimiento expreso del tutor, y no pidas ni des datos de contacto: el asesoramiento iniciado en la plataforma se hace y se paga ahí.",
      "Al terminar, cerrás el asesoramiento eligiendo cómo terminó: resuelto con orientación, derivado a una guardia de emergencia, o no se pudo completar.",
    ],
  },
  {
    id: "precios",
    titulo: "Mis precios",
    cuerpo: [
      "Los precios tienen cuatro combinaciones: orientación normal o urgencia, en horario diurno o nocturno (noche, domingos y feriados). Según cómo esté configurada la plataforma, los precios los fija la plataforma o los ponés vos dentro de un rango sugerido, desde “Mis precios” en tu panel. Si dejás uno vacío, rige el aconsejado. El precio vigente cuando el tutor te elige queda congelado para esa solicitud.",
    ],
  },
  {
    id: "perfil",
    titulo: "Foto y especies que atendés",
    cuerpo: [
      "Desde tu panel podés cambiar tu foto y las especies que atendés cuando quieras. La foto pasa por una revisión de la administración y la ven los tutores junto a tu nombre y matrícula.",
    ],
  },
  {
    id: "avisos",
    titulo: "Avisos de consultas nuevas",
    cuerpo: [
      "Podés recibir avisos en tu dispositivo (con el panel cerrado), por correo electrónico y por WhatsApp. En iPhone, los avisos solo funcionan con la app instalada: usá “Agregar a pantalla de inicio” desde el botón Compartir del navegador. Son solo avisos: la consulta se hace siempre dentro de la plataforma.",
    ],
  },
];

export const FAQ_VETERINARIO: ItemAyuda[] = [
  {
    id: "cuanto-cobro",
    titulo: "¿Cuánto cobro por cada asesoramiento?",
    cuerpo: [
      "El tutor paga tu honorario más el cargo de servicio de la plataforma (un porcentaje del honorario con un mínimo, distinto en horario diurno y nocturno). El cargo lo ve el tutor por separado, no se descuenta de tu honorario. Las comisiones propias del medio de pago (Mercado Pago o PayPal) sí las soportás vos y se descuentan de tu honorario. El detalle está en el Convenio de adhesión, cláusulas 6 y 7.",
    ],
  },
  {
    id: "cuando-cobro",
    titulo: "¿Cuándo me pagan?",
    cuerpo: [
      "Con Mercado Pago, el honorario se acredita en tu cuenta cuando el tutor paga, que es antes de la videollamada. Con PayPal, la plataforma te transfiere el honorario una vez que cerrás el caso.",
    ],
  },
  {
    id: "no-aparezco",
    titulo: "No aparezco en la lista de los tutores, ¿por qué?",
    cuerpo: [
      "Revisá estas cosas: que tu cuenta esté habilitada, que tengas conectado un medio de cobro, que estés en Conectado o Stand by, que tengas el panel abierto (o los avisos activados), que hayas marcado las especies que atendés y que tu matrícula y tu seguro no estén vencidos. El panel te indica qué falta.",
    ],
  },
  {
    id: "no-completado",
    titulo: "¿Qué pasa si cierro un caso como “no se pudo completar”?",
    cuerpo: [
      `Se le devuelve al tutor todo lo que pagó menos un cargo fijo de ${pesos(CARGO_NO_COMPLETADO)} (US$ ${CARGO_NO_COMPLETADO_USD} si pagó en dólares) que se queda la plataforma. El honorario que ya estaba en tu cuenta se retira para devolverlo. Si lo cerrás como resuelto con orientación o derivado a emergencia, el servicio se considera prestado.`,
    ],
  },
  {
    id: "calificaciones",
    titulo: "¿Cómo funcionan las calificaciones?",
    cuerpo: [
      "Los tutores te califican de 1 a 5 estrellas al terminar. Esas calificaciones son visibles en la lista. Si tu promedio cae por debajo del mínimo que fija el Convenio, dejás de figurar entre los elegibles, y podés pedir una revisión por escrito. Las calificaciones de 5 estrellas suman puntos de premio.",
    ],
  },
  {
    id: "datos-tutor",
    titulo: "¿Puedo pedirle el contacto al tutor o darle el mío?",
    cuerpo: [
      "No. Los datos de contacto nunca se intercambian: la plataforma es siempre la mediadora. Tampoco podés ofrecerle atenderlo por fuera de la plataforma si el asesoramiento empezó acá. Lo que ves del tutor es solo el contexto clínico del caso, que tenés que tratar con confidencialidad.",
    ],
  },
  {
    id: "datos-cambian",
    titulo: "Cambió mi matrícula o mi seguro, ¿qué hago?",
    cuerpo: [
      "Tenés que informarlo de inmediato. Si venció, tu cuenta se suspende hasta que acredites la renovación; escribinos con una pregunta nueva desde esta pantalla.",
    ],
  },
];
