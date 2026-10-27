import { Injectable, Logger } from "@nestjs/common";
import webpush from "web-push";
import { PrismaService } from "../../prisma.service";

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
}
