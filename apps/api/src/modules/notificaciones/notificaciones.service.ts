import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import webpush from "web-push";
import { PrismaService } from "../../prisma.service";
import { enviarWhatsAppPlantilla, normalizarTelefono, whatsappConfigurado } from "../../common/whatsapp-cloud-api.util";
import { emailConfigurado, enviarEmail } from "../../common/email.util";

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  // Ruta dentro de la plataforma a la que lleva el toque en el aviso.
  url: string;
  // Avisos con la misma etiqueta se reemplazan entre sí.
  etiqueta: string;
  // Segundos que el aviso sigue siendo útil: pasado ese tiempo el servicio de
  // push lo descarta en vez de entregarlo tarde.
  vigenciaSegundos: number;
}

// Capa única de avisos al veterinario. Hoy: push web. Las etapas siguientes
// (WhatsApp con plantilla, correo) se enchufan acá mismo, para que el resto
// del código solo diga "avisá" sin saber por qué canal. Nada de lo que viaja
// por acá incluye datos de contacto del cliente ni datos clínicos.
@Injectable()
export class NotificacionesService {
  private readonly log = new Logger(NotificacionesService.name);
  private readonly clavePublica = process.env.VAPID_PUBLIC_KEY?.trim() || null;
  private readonly habilitado: boolean;

  constructor(private readonly prisma: PrismaService) {
    const privada = process.env.VAPID_PRIVATE_KEY?.trim();
    const contacto = process.env.VAPID_SUBJECT?.trim() || "mailto:contacto@videollamadaanimal.com";
    this.habilitado = !!(this.clavePublica && privada);
    if (this.habilitado) {
      webpush.setVapidDetails(contacto, this.clavePublica!, privada!);
    } else {
      this.log.warn("Avisos push desactivados: faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY");
    }
  }

  // null = push no configurado en este servidor (la web esconde la opción).
  obtenerClavePublica(): string | null {
    return this.habilitado ? this.clavePublica : null;
  }

  async suscribir(
    veterinarioId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    // El mismo navegador puede re-suscribirse (o cambiar de cuenta): el
    // endpoint es único y pasa a pertenecer a quien lo registró último.
    await this.prisma.pushSuscripcion.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        veterinarioId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent?.slice(0, 300),
      },
      update: { veterinarioId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
    });
    return { suscripto: true };
  }

  async desuscribir(veterinarioId: string, endpoint: string) {
    await this.prisma.pushSuscripcion.deleteMany({ where: { veterinarioId, endpoint } });
    return { suscripto: false };
  }

  async cantidadDeDispositivos(veterinarioId: string) {
    return this.prisma.pushSuscripcion.count({ where: { veterinarioId } });
  }

  // Devuelve a cuántos dispositivos se entregó al servicio de push.
  async avisar(veterinarioId: string, aviso: AvisoPush): Promise<number> {
    if (!this.habilitado) return 0;
    const subs = await this.prisma.pushSuscripcion.findMany({ where: { veterinarioId } });
    let enviados = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({
              titulo: aviso.titulo,
              cuerpo: aviso.cuerpo,
              url: aviso.url,
              etiqueta: aviso.etiqueta,
            }),
            { TTL: Math.max(1, Math.round(aviso.vigenciaSegundos)), urgency: "high" },
          );
          enviados++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: el dispositivo ya no existe (desinstaló o revocó el permiso).
          if (status === 404 || status === 410) {
            await this.prisma.pushSuscripcion.deleteMany({ where: { id: s.id } });
          } else {
            this.log.warn(`No se pudo enviar el aviso push (${status ?? "sin estado"})`);
          }
        }
      }),
    );
    return enviados;
  }

  avisarSolicitudNueva(veterinarioId: string, vigenciaSegundos: number) {
    return this.avisar(veterinarioId, {
      titulo: "Nueva consulta",
      cuerpo: "Una persona quiere hablar con vos. Tocá para responder.",
      url: "/panel-veterinario",
      etiqueta: "solicitud",
      vigenciaSegundos,
    });
  }

  // ---- Otros canales (WhatsApp con plantilla y correo) ----
  // La plataforma es siempre la intermediaria: estos mensajes avisan que hay
  // una consulta esperando y mandan a la plataforma. Nunca llevan datos del
  // cliente ni del caso, y no se puede contestar por esa vía.

  capacidades() {
    return {
      whatsappDisponible: whatsappConfigurado() && !!process.env.WHATSAPP_PLANTILLA_NUEVA_CONSULTA_VET,
      emailDisponible: emailConfigurado(),
    };
  }

  async obtenerPreferencias(veterinarioId: string) {
    const v = await this.prisma.veterinario.findUniqueOrThrow({
      where: { id: veterinarioId },
      select: { avisarPorWhatsapp: true, avisarPorEmail: true, telefono: true },
    });
    return { ...v, ...this.capacidades() };
  }

  async guardarPreferencias(
    veterinarioId: string,
    datos: { avisarPorWhatsapp?: boolean; avisarPorEmail?: boolean; telefono?: string },
  ) {
    const cambios: { avisarPorWhatsapp?: boolean; avisarPorEmail?: boolean; telefono?: string } = {};
    if (typeof datos.avisarPorEmail === "boolean") cambios.avisarPorEmail = datos.avisarPorEmail;
    if (typeof datos.telefono === "string" && datos.telefono.trim()) {
      const telefono = normalizarTelefono(datos.telefono);
      if (telefono.length < 10 || telefono.length > 15) {
        throw new BadRequestException("Ingresá el teléfono con código de país y área, solo números (ej. 5493411234567)");
      }
      cambios.telefono = telefono;
    }
    if (typeof datos.avisarPorWhatsapp === "boolean") {
      if (datos.avisarPorWhatsapp) {
        const actual = await this.prisma.veterinario.findUniqueOrThrow({
          where: { id: veterinarioId },
          select: { telefono: true },
        });
        if (!(cambios.telefono ?? actual.telefono)) {
          throw new BadRequestException("Para recibir avisos por WhatsApp cargá tu teléfono");
        }
      }
      cambios.avisarPorWhatsapp = datos.avisarPorWhatsapp;
    }
    await this.prisma.veterinario.update({ where: { id: veterinarioId }, data: cambios });
    return this.obtenerPreferencias(veterinarioId);
  }

  // Aviso de consulta nueva por WhatsApp y correo, según lo que la persona
  // activó. Cada canal falla por separado: un error de uno no frena al otro.
  async avisarSolicitudPorOtrosCanales(veterinarioId: string) {
    const v = await this.prisma.veterinario.findUnique({
      where: { id: veterinarioId },
      select: { nombre: true, email: true, telefono: true, avisarPorWhatsapp: true, avisarPorEmail: true },
    });
    if (!v) return;
    const cap = this.capacidades();
    const tareas: Promise<void>[] = [];

    if (v.avisarPorWhatsapp && v.telefono && cap.whatsappDisponible) {
      tareas.push(
        enviarWhatsAppPlantilla({
          telefono: v.telefono,
          plantilla: process.env.WHATSAPP_PLANTILLA_NUEVA_CONSULTA_VET!,
          parametrosCuerpo: [v.nombre],
        }).catch((e) => this.log.warn(`WhatsApp al veterinario falló: ${e instanceof Error ? e.message : e}`)),
      );
    }
    if (v.avisarPorEmail && cap.emailDisponible) {
      const url = `${process.env.WEB_APP_URL ?? ""}/panel-veterinario`;
      tareas.push(
        enviarEmail({
          para: v.email,
          asunto: "Nueva consulta en Videollamada Animal",
          texto: `Hola ${v.nombre},\n\nUna persona quiere una consulta con vos. Entrá a la plataforma para responder antes de que venza:\n${url}\n\nEste mensaje es solo un aviso: la consulta se realiza dentro de la plataforma.`,
        }).catch((e) => this.log.warn(`Correo al veterinario falló: ${e instanceof Error ? e.message : e}`)),
      );
    }
    await Promise.all(tareas);
  }

  // Al cliente: solo cuando el veterinario aceptó y la persona ya no está
  // mirando la pantalla de espera (si la está mirando, no hace falta gastar un
  // mensaje).
  async avisarClienteConsultaAceptada(telefono: string) {
    const plantilla = process.env.WHATSAPP_PLANTILLA_CONSULTA_ACEPTADA_CLIENTE;
    if (!plantilla || !whatsappConfigurado()) return;
    await enviarWhatsAppPlantilla({ telefono, plantilla }).catch((e) =>
      this.log.warn(`WhatsApp al cliente falló: ${e instanceof Error ? e.message : e}`),
    );
  }
}
