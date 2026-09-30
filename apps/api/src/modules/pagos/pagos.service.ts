import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
  BanderasRojasIntake,
  CARGO_NO_COMPLETADO,
  CARGO_NO_COMPLETADO_USD,
  CIERRES_SIN_REEMBOLSO,
  hayBanderaRoja,
  honorarioPaypalDe,
} from "@vet-teletriage/types";
import {
  construirUrlAutorizacionMercadoPago,
  intercambiarCodigoPorToken,
  refrescarTokenMercadoPago,
  verificarYExtraerState,
} from "../../common/mercadopago-oauth.util";
import {
  crearPreferenciaDePago,
  obtenerPagoMercadoPago,
  reembolsarPagoMercadoPago,
  requerirEnvMercadoPago,
} from "../../common/mercadopago-checkout.util";
import {
  capturarOrdenPayPal,
  crearOrdenPayPal,
  enviarPayoutPayPal,
  reembolsarCapturaPayPal,
} from "../../common/paypal.util";
import { ConfiguracionService } from "../configuracion/configuracion.service";

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  // -------------------------------------------------------------------------
  // Checkout (situación probable, encontrada 2026-09-29, no pedida
  // puntualmente): ni un solo lugar de todo apps/api creaba nunca un
  // registro Pago — liquidarSegunCierre(), el webhook y el reembolso de
  // disputas de calidad asumían uno existente que ninguna pantalla llegaba a
  // crear. De punta a punta, un cliente nunca pagaba nada. Esto es lo que
  // faltaba: se llama apenas el cliente elige veterinario (asignar() ya dejó
  // el caso en ASIGNADO con honorarioDeclarado fijo), crea la preferencia de
  // Mercado Pago con el access_token DEL VETERINARIO (split automático,
  // marketplace_fee = cargo de plataforma) y devuelve la URL de checkout
  // para que el navegador del cliente redirija ahí.
  //
  // Cobro inmediato, no hold (Sergio, 2026-09-29, confirmado después de
  // verificar que Checkout Pro no soporta captura diferida — ver
  // mercadopago-checkout.util.ts): el tutor paga el total ACÁ, antes de que
  // exista ninguna videollamada. Lo que corresponda se reembolsa después,
  // según cómo cierre el caso (ver liquidarSegunCierre más abajo).
  async crearCheckout(casoId: string, clienteId: string, medioPago: "MERCADO_PAGO" | "PAYPAL" = "MERCADO_PAGO") {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      include: { pago: true, veterinario: true, intake: true },
    });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== clienteId) throw new ForbiddenException("Este caso no te pertenece");
    if (caso.estado !== "ASIGNADO" || !caso.veterinarioId || !caso.veterinario) {
      throw new BadRequestException("Este caso todavía no tiene un veterinario asignado");
    }
    if (caso.honorarioDeclarado == null) {
      // No debería pasar nunca — asignar() siempre lo completa. Defensivo.
      throw new BadRequestException("Este caso todavía no tiene un honorario calculado");
    }
    // Pago.casoId es único — nunca se crea una segunda fila para el mismo
    // caso. Si ya hay una Y sigue viva (PENDIENTE esperando que termine el
    // checkout, o ya AUTORIZADO/CAPTURADO/REEMBOLSADO_*), no hay nada que
    // reintentar. La única excepción es CANCELADO (Mercado Pago rechazó o
    // el tutor abandonó el pago, ver manejarWebhookMercadoPago) — ahí sí
    // hace falta poder reintentar (ver /pago/fallo), así que se genera una
    // preferencia NUEVA y se actualiza la fila existente en vez de crear
    // otra.
    if (caso.pago && caso.pago.estado !== "CANCELADO") {
      throw new BadRequestException("Ya se inició un cobro para este caso");
    }

    if (medioPago === "PAYPAL") {
      return this.crearCheckoutPayPal(caso);
    }

    const veterinario = await this.asegurarTokenMercadoPagoVigente(caso.veterinarioId);
    if (!veterinario.mercadoPagoAccessToken) {
      throw new BadRequestException(
        "El veterinario elegido todavía no conectó su cuenta de Mercado Pago — elegí otro de la lista",
      );
    }

    const montoHonorarioVet = Number(caso.honorarioDeclarado);
    const montoCargoPlataforma = Number(caso.cargoPlataforma);
    const montoTotal = montoHonorarioVet + montoCargoPlataforma;

    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    const apiUrl = process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3001";

    // Pantallas de resultado dedicadas por casoId (Sergio, 2026-09-29) — ya
    // no los tres back_urls apuntando a /panel. No se depende de que
    // Mercado Pago mande `external_reference` de vuelta en el query del
    // redirect (no se pudo verificar ese comportamiento contra la
    // documentación): el casoId va directo en la URL, que ya se conoce acá.
    const preferencia = await crearPreferenciaDePago({
      accessTokenVendedor: veterinario.mercadoPagoAccessToken,
      casoId,
      montoTotal,
      cargoPlataforma: montoCargoPlataforma,
      urlExito: `${webAppUrl}/pago/exito?casoId=${casoId}`,
      urlPendiente: `${webAppUrl}/pago/pendiente?casoId=${casoId}`,
      urlFallo: `${webAppUrl}/pago/fallo?casoId=${casoId}`,
      urlNotificacion: `${apiUrl}/pagos/webhooks/mercado-pago`,
    });

    const datosPago = {
      medioDeCobro: "MERCADO_PAGO" as const,
      moneda: "ARS" as const,
      montoTotal,
      montoHonorarioVet,
      montoCargoPlataforma,
      estado: "PENDIENTE" as const,
      mercadoPagoPreferenciaId: preferencia.id,
      // Un reintento (ver más arriba) parte de un pago CANCELADO — limpiar
      // los datos del intento anterior para que no queden pisados con
      // información vieja (mercadoPagoPaymentId de un pago que Mercado Pago
      // ya rechazó, montoReembolsado de un caso que ni llegó a cobrarse).
      mercadoPagoPaymentId: null,
      paypalOrderId: null,
      paypalCaptureId: null,
      paypalPayoutId: null,
      pagadoEl: null,
      capturadoEl: null,
      reembolsadoEl: null,
      montoReembolsado: null,
      montoPendienteAccionManual: null,
      notaAccionManual: null,
    };

    if (caso.pago) {
      await this.prisma.pago.update({ where: { casoId }, data: datosPago });
    } else {
      await this.prisma.pago.create({ data: { casoId, ...datosPago } });
    }

    return { initPoint: preferencia.init_point };
  }

  // Rama PayPal de crearCheckout (Sergio, 2026-09-30) — "PayPal Payouts,
  // dos pasos": acá NO se usa ninguna cuenta del veterinario para cobrar
  // (a diferencia de Mercado Pago) — la orden se crea contra la cuenta
  // PROPIA de la plataforma (credenciales PAYPAL_CLIENT_ID/SECRET). Por
  // eso el único requisito del lado del veterinario es que tenga cargado
  // un email de PayPal — no una cuenta conectada por OAuth — para que
  // haya a dónde mandarle el honorario recién al cerrar el caso.
  //
  // Precio: FIJO en USD (config.honorarioPaypalNormalUsd/UrgenciaUsd +
  // cargoPlataformaPaypalUsd), no una conversión del honorarioDeclarado en
  // pesos ya calculado para este caso — PayPal no soporta ARS (ver nota en
  // Pago.moneda, schema.prisma) y Sergio decidió (2026-09-30) precio fijo
  // en vez de conversión en vivo. Consecuencia directa: sin margen
  // individual por veterinario ni premio por volumen en este precio — todo
  // veterinario con PayPal conectado cobra igual por sesión.
  private async crearCheckoutPayPal(caso: {
    id: string;
    intake: BanderasRojasIntake | null;
    veterinario: { paypalEmail: string | null } | null;
  }) {
    if (!caso.veterinario?.paypalEmail) {
      throw new BadRequestException(
        "El veterinario elegido no tiene PayPal conectado — elegí Mercado Pago o cambiá de veterinario",
      );
    }
    if (!caso.intake) {
      // No debería pasar nunca — crear() siempre lo completa. Defensivo.
      throw new BadRequestException("Este caso todavía no tiene datos de intake");
    }

    const config = await this.configuracion.obtener();
    const hayUrgencia = hayBanderaRoja(caso.intake);
    const montoHonorarioVet = honorarioPaypalDe(config, hayUrgencia);
    const montoCargoPlataforma = config.cargoPlataformaPaypalUsd;
    const montoTotal = Math.round((montoHonorarioVet + montoCargoPlataforma) * 100) / 100;

    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    const apiUrl = process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3001";

    // El return_url apunta al BACKEND (no directo a /pago/exito): PayPal
    // solo aprueba, la captura efectiva del dinero es una llamada de
    // servidor aparte (capturarPagoPayPal, ver el controller) — recién esa
    // llamada, ya confirmada, redirige al navegador a /pago/exito o
    // /pago/fallo. Así /pago/[estado]/page.tsx no necesita saber nada de
    // PayPal: sigue leyendo Pago.estado en vivo, como con Mercado Pago.
    const orden = await crearOrdenPayPal({
      casoId: caso.id,
      montoTotalUsd: montoTotal,
      urlRetorno: `${apiUrl}/pagos/paypal/capturar?casoId=${caso.id}`,
      urlCancelacion: `${webAppUrl}/pago/fallo?casoId=${caso.id}`,
    });

    const datosPago = {
      medioDeCobro: "PAYPAL" as const,
      moneda: "USD" as const,
      montoTotal,
      montoHonorarioVet,
      montoCargoPlataforma,
      estado: "PENDIENTE" as const,
      paypalOrderId: orden.id,
      paypalCaptureId: null,
      paypalPayoutId: null,
      mercadoPagoPreferenciaId: null,
      mercadoPagoPaymentId: null,
      pagadoEl: null,
      capturadoEl: null,
      reembolsadoEl: null,
      montoReembolsado: null,
      montoPendienteAccionManual: null,
      notaAccionManual: null,
    };

    const existente = await this.prisma.pago.findUnique({ where: { casoId: caso.id } });
    if (existente) {
      await this.prisma.pago.update({ where: { casoId: caso.id }, data: datosPago });
    } else {
      await this.prisma.pago.create({ data: { casoId: caso.id, ...datosPago } });
    }

    return { initPoint: orden.urlAprobacion };
  }

  private async asegurarTokenMercadoPagoVigente(veterinarioId: string) {
    const veterinario = await this.prisma.veterinario.findUniqueOrThrow({ where: { id: veterinarioId } });
    if (!veterinario.mercadoPagoRefreshToken || !veterinario.mercadoPagoTokenVenceEl) return veterinario;
    // Margen de 5 minutos para no arrancar un checkout con un token que
    // vence en el medio del armado de la preferencia.
    const porVencer = veterinario.mercadoPagoTokenVenceEl.getTime() - Date.now() < 5 * 60 * 1000;
    if (!porVencer) return veterinario;

    const token = await refrescarTokenMercadoPago(veterinario.mercadoPagoRefreshToken);
    return this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: {
        mercadoPagoAccessToken: token.access_token,
        mercadoPagoRefreshToken: token.refresh_token,
        mercadoPagoTokenVenceEl: new Date(Date.now() + token.expires_in * 1000),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Webhook real de Mercado Pago (reemplaza el stub anterior, que asumía un
  // body {casoId, mercadoPagoPaymentId} — Mercado Pago nunca manda eso: solo
  // manda {type, data:{id}}, y hay que pedirle el detalle del pago aparte).
  // -------------------------------------------------------------------------
  async manejarWebhookMercadoPago(tipo: string, paymentId: string) {
    if (tipo !== "payment") return { ignorado: true }; // ej. merchant_order — no nos interesa acá

    const accessTokenPlataforma = requerirEnvMercadoPago("MERCADOPAGO_ACCESS_TOKEN");
    const pagoMp = await obtenerPagoMercadoPago(paymentId, accessTokenPlataforma);
    if (!pagoMp.external_reference) return { ignorado: true };

    const pago = await this.prisma.pago.findUnique({ where: { casoId: pagoMp.external_reference } });
    if (!pago) return { ignorado: true }; // notificación de un pago que no es nuestro, o duplicada

    if (pagoMp.status === "approved") {
      // Idempotente: un reintento del mismo webhook no debe pisar pagadoEl.
      if (pago.estado === "PENDIENTE") {
        return this.prisma.pago.update({
          where: { casoId: pago.casoId },
          data: { estado: "AUTORIZADO", mercadoPagoPaymentId: String(pagoMp.id), pagadoEl: new Date() },
        });
      }
      return pago;
    }

    if (pagoMp.status === "rejected" || pagoMp.status === "cancelled") {
      return this.prisma.pago.update({
        where: { casoId: pago.casoId },
        data: { estado: "CANCELADO", mercadoPagoPaymentId: String(pagoMp.id) },
      });
    }

    // "pending", "in_process", etc. — todavía no hay nada que resolver.
    return pago;
  }

  // -------------------------------------------------------------------------
  // PayPal — captura (la llama el controller, en el return_url que PayPal
  // redirige tras la aprobación del cliente) y webhook (respaldo/
  // reconciliación — ver comentario en el controller sobre por qué se
  // confía en la respuesta síncrona de la captura Y además se procesa el
  // webhook, idempotente, como en Mercado Pago).
  // -------------------------------------------------------------------------
  async capturarPagoPayPal(casoId: string, paypalOrderId: string) {
    const pago = await this.prisma.pago.findUnique({ where: { casoId } });
    if (!pago) throw new BadRequestException("Pago no encontrado para este caso");
    if (pago.medioDeCobro !== "PAYPAL") throw new BadRequestException("Este pago no es de PayPal");
    // Idempotente: si el navegador vuelve a pegarle a este link (doble
    // click, back del navegador), no se intenta capturar dos veces.
    if (pago.estado !== "PENDIENTE") return pago;

    const captura = await capturarOrdenPayPal(paypalOrderId);
    if (captura.status !== "COMPLETED") {
      return this.prisma.pago.update({
        where: { casoId },
        data: { estado: "CANCELADO", paypalOrderId },
      });
    }
    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "AUTORIZADO",
        paypalOrderId,
        paypalCaptureId: captura.captureId,
        pagadoEl: new Date(),
      },
    });
  }

  // Respaldo de reconciliación (Sergio, 2026-09-30, mismo criterio que el
  // webhook de Mercado Pago): la captura ya se hace sincrónicamente en
  // capturarPagoPayPal (arriba) al volver del checkout — este webhook es
  // la red de seguridad para cuando esa vuelta no llega a completarse (el
  // navegador del cliente se cierra antes del redirect, por ejemplo) pero
  // PayPal sí completó el cobro de su lado.
  async manejarWebhookPayPal(evento: { event_type?: string; resource?: { id?: string; custom_id?: string } }) {
    if (evento.event_type !== "PAYMENT.CAPTURE.COMPLETED") return { ignorado: true };
    const casoId = evento.resource?.custom_id;
    if (!casoId) return { ignorado: true };

    const pago = await this.prisma.pago.findUnique({ where: { casoId } });
    if (!pago || pago.medioDeCobro !== "PAYPAL") return { ignorado: true };

    if (pago.estado === "PENDIENTE") {
      return this.prisma.pago.update({
        where: { casoId },
        data: {
          estado: "AUTORIZADO",
          paypalCaptureId: evento.resource?.id ?? pago.paypalCaptureId,
          pagadoEl: new Date(),
        },
      });
    }
    return pago; // ya capturado por el camino síncrono — idempotente
  }

  // Sección 8 del contrato, adaptado a cobro inmediato (Sergio, 2026-09-29):
  // la plata YA se cobró y se repartió al pagar (ver crearCheckout) — acá ya
  // no hay nada que "capturar", solo decidir si corresponde reembolso según
  // la clasificación de cierre.
  //
  // - RESUELTO_POR_ORIENTACION / DERIVADO_A_EMERGENCIA → servicio cumplido,
  //   no hay reembolso — se marca CAPTURADO como bookkeeping nomás.
  // - NO_COMPLETADO → reembolso al tutor de TODO menos CARGO_NO_COMPLETADO.
  //
  // Corrección (2026-09-29, sin esto ya se había comunicado como resuelto):
  // el diseño anterior hacía DOS llamadas de reembolso independientes —
  // una contra la cuenta del vet, otra contra la de la plataforma — bajo el
  // supuesto de que cada una deduciría solo de esa cuenta puntual. Se
  // verificó contra la documentación oficial de Mercado Pago
  // (mercadopago.com.br/developers/en/docs/split-payments/split-1-1/
  // integration-configuration/integrate-marketplace) que NO es así: un
  // reembolso sobre un pago con split siempre se reparte PROPORCIONAL entre
  // vendedor y marketplace según lo que cada uno cobró — no hay forma de
  // pedirle a la API "sacale todo a uno, nada al otro". Con esa base, dos
  // llamadas independientes no logran el resultado asimétrico que pide el
  // contrato (vet = $0, plataforma = flat completo) — lo más probable es
  // que terminen sobre-reembolsando al tutor o fallando.
  //
  // Lo único que sí se puede automatizar con garantías: UNA sola llamada de
  // reembolso PARCIAL de (total - CARGO_NO_COMPLETADO) al tutor. Esto
  // cumple exactamente la promesa visible ("te devolvemos todo menos $X")
  // sin arriesgar de más — el tutor termina con el monto correcto. Lo que
  // ese reembolso deja mal es el reparto INTERNO de los $X retenidos entre
  // vet y plataforma (proporcional, no 100% a la plataforma): esa parte NO
  // se automatiza — queda anotada en montoPendienteAccionManual /
  // notaAccionManual para que un admin la corrija a mano con el vet.
  async liquidarSegunCierre(casoId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      include: { cierre: true, pago: true, veterinario: true },
    });
    if (!caso || !caso.cierre || !caso.pago || !caso.veterinario) {
      throw new BadRequestException("El caso no tiene cierre o pago registrado todavía");
    }
    // Sin este chequeo, cualquier veterinario autenticado podía liquidar
    // (y por lo tanto capturar el pago de) un caso ajeno.
    if (caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("No sos el veterinario asignado a este caso");
    }
    if (caso.pago.estado !== "AUTORIZADO") {
      // Todavía no llegó el webhook confirmando el pago, o ya se liquidó
      // antes — no hay nada consistente que hacer acá.
      throw new BadRequestException("El pago de este caso todavía no está confirmado");
    }

    // PayPal ("Payouts, dos pasos") tiene su propia lógica, bien distinta
    // de la de Mercado Pago de acá abajo — ver liquidarSegunCierrePayPal.
    if (caso.pago.medioDeCobro === "PAYPAL") {
      return this.liquidarSegunCierrePayPal(casoId, caso.cierre.clasificacion, caso.pago, caso.veterinario);
    }

    const sinDerechoAReembolso = CIERRES_SIN_REEMBOLSO.includes(caso.cierre.clasificacion);

    if (sinDerechoAReembolso) {
      return this.prisma.pago.update({
        where: { casoId },
        data: { estado: "CAPTURADO", capturadoEl: new Date() },
      });
    }

    if (!caso.pago.mercadoPagoPaymentId) {
      throw new BadRequestException("Falta el id de pago de Mercado Pago — no se puede reembolsar");
    }
    const montoTotal = Number(caso.pago.montoTotal);
    const montoHonorarioVet = Number(caso.pago.montoHonorarioVet);
    // Clamp: CARGO_NO_COMPLETADO es un valor que Sergio puede subir con el
    // tiempo — nunca debería hacer que intentemos retener más de lo que
    // efectivamente se cobró en ESTE caso puntual.
    const montoRetenido = Math.min(CARGO_NO_COMPLETADO, montoTotal);
    const montoAReembolsar = Math.round((montoTotal - montoRetenido) * 100) / 100;

    const veterinario = await this.asegurarTokenMercadoPagoVigente(caso.veterinarioId!);
    if (!veterinario.mercadoPagoAccessToken) {
      throw new BadRequestException(
        "El veterinario no tiene una cuenta de Mercado Pago conectada — no se puede reembolsar automáticamente",
      );
    }
    if (montoAReembolsar > 0) {
      // [Probable] se pide con el access_token del vet porque es el
      // collector del pago (quien creó la preferencia en crearCheckout) —
      // no se pudo verificar contra un pago real ni contra sandbox. Si
      // Mercado Pago rechaza esta llamada con el token del vet, revisar si
      // hace falta usar el token de la plataforma en su lugar.
      await reembolsarPagoMercadoPago(
        caso.pago.mercadoPagoPaymentId,
        veterinario.mercadoPagoAccessToken,
        montoAReembolsar,
      );
    }

    // De los $montoRetenido que NO se reembolsaron, Mercado Pago los deja
    // repartidos proporcional entre vet y plataforma según lo que cada uno
    // había cobrado — no 100% a la plataforma. Esto es lo que le quedó de
    // más al vet de esos $montoRetenido; hay que descontárselo a mano
    // (próxima liquidación o transferencia) para que la plataforma termine
    // efectivamente con el flat completo.
    const montoDeMasParaElVet =
      montoTotal > 0 ? Math.round(((montoHonorarioVet * montoRetenido) / montoTotal) * 100) / 100 : 0;

    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "REEMBOLSADO_TOTAL",
        reembolsadoEl: new Date(),
        montoReembolsado: montoAReembolsar,
        montoPendienteAccionManual: montoDeMasParaElVet > 0 ? montoDeMasParaElVet : null,
        notaAccionManual:
          montoDeMasParaElVet > 0
            ? `NO_COMPLETADO: se reembolsaron $${montoAReembolsar} al tutor (todo menos $${montoRetenido}, que se queda la plataforma). Por el reparto proporcional de Mercado Pago, al vet le quedaron retenidos ~$${montoDeMasParaElVet} de esos $${montoRetenido} — descontárselos en su próxima liquidación para que la plataforma efectivamente se quede con el flat completo.`
            : null,
      },
    });
  }

  // Rama PayPal de liquidarSegunCierre ("Payouts, dos pasos", Sergio,
  // 2026-09-30) — arquitectónicamente MÁS SIMPLE que la de Mercado Pago de
  // arriba, y a propósito: como la plataforma cobró el TOTAL a su propia
  // cuenta y todavía no le mandó nada al veterinario, acá no existe el
  // problema del reparto proporcional que documenta el comentario grande
  // de liquidarSegunCierre — no hay nada que "corregir a mano después".
  //
  // - Sin derecho a reembolso (RESUELTO_POR_ORIENTACION / DERIVADO_A_EMERGENCIA):
  //   ACÁ es donde recién se le manda la plata al veterinario, vía PayPal
  //   Payouts — antes de esto, ese dinero nunca salió de la cuenta de la
  //   plataforma.
  // - NO_COMPLETADO: se reembolsa (total - CARGO_NO_COMPLETADO_USD) al
  //   cliente y NO se manda ningún payout — no hay nada que reclamarle de
  //   vuelta al veterinario porque nunca se le mandó nada.
  private async liquidarSegunCierrePayPal(
    casoId: string,
    clasificacion: string,
    pago: { montoTotal: unknown; montoHonorarioVet: unknown; paypalCaptureId: string | null },
    veterinario: { paypalEmail: string | null } | null,
  ) {
    const sinDerechoAReembolso = CIERRES_SIN_REEMBOLSO.includes(clasificacion as (typeof CIERRES_SIN_REEMBOLSO)[number]);

    if (sinDerechoAReembolso) {
      const montoHonorarioVet = Number(pago.montoHonorarioVet);
      if (!veterinario?.paypalEmail) {
        // No debería pasar nunca — crearCheckoutPayPal ya exige el email
        // antes de crear la orden. Defensivo: si el veterinario de alguna
        // forma se quedó sin email cargado en el medio, no se pierde el
        // honorario — queda anotado para pagárselo a mano.
        return this.prisma.pago.update({
          where: { casoId },
          data: {
            estado: "CAPTURADO",
            capturadoEl: new Date(),
            montoPendienteAccionManual: montoHonorarioVet,
            notaAccionManual:
              "El veterinario ya no tiene un email de PayPal cargado — pagarle el honorario a mano.",
          },
        });
      }
      const payout = await enviarPayoutPayPal({
        emailDestino: veterinario.paypalEmail,
        montoUsd: montoHonorarioVet,
        casoId,
      });
      return this.prisma.pago.update({
        where: { casoId },
        data: { estado: "CAPTURADO", capturadoEl: new Date(), paypalPayoutId: payout.payoutItemId },
      });
    }

    if (!pago.paypalCaptureId) {
      throw new BadRequestException("Falta el id de captura de PayPal — no se puede reembolsar");
    }
    const montoTotal = Number(pago.montoTotal);
    const montoRetenido = Math.min(CARGO_NO_COMPLETADO_USD, montoTotal);
    const montoAReembolsar = Math.round((montoTotal - montoRetenido) * 100) / 100;
    if (montoAReembolsar > 0) {
      await reembolsarCapturaPayPal(pago.paypalCaptureId, montoAReembolsar);
    }
    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "REEMBOLSADO_TOTAL",
        reembolsadoEl: new Date(),
        montoReembolsado: montoAReembolsar,
        // Sin montoPendienteAccionManual acá: a diferencia de Mercado
        // Pago, no hay ningún payout previo que corregir — nunca se envió.
      },
    });
  }

  // Sección 10 del contrato: una disputa de CALIDAD puede, como máximo,
  // reembolsar el cargo de servicio de la plataforma — nunca el honorario
  // ya liquidado al veterinario (eso solo pasa por NO_COMPLETADO, arriba).
  // Lo llama disputas.service al resolver una DisputaCalidad a favor del
  // cliente; nunca se llama a partir de una DisputaIdentidad (esas no tocan
  // el pago, tocan la habilitación del vet).
  //
  // Corrección (2026-09-29): a diferencia de liquidarSegunCierre(), ACÁ NO
  // se automatiza ninguna llamada a la API de reembolsos, ni siquiera
  // parcial. El reparto de Mercado Pago en un pago con split es siempre
  // proporcional entre vendedor y marketplace — así que pedir un reembolso
  // de "solo el cargo de plataforma" igual le descuenta una porción
  // proporcional al vet, violando la regla explícita de esta sección
  // ("nunca tocar el honorario ya liquidado"). Por eso todo el monto queda
  // anotado para que un admin lo resuelva a mano, coordinado directamente
  // con el vet, fuera de la API de reembolsos de Mercado Pago.
  async reembolsarCargoPlataforma(casoId: string) {
    const pago = await this.prisma.pago.findUnique({ where: { casoId } });
    if (!pago) throw new BadRequestException("El caso no tiene pago registrado");

    // PayPal (Sergio, 2026-09-30): a diferencia de Mercado Pago de abajo,
    // ACÁ SÍ se automatiza completo, sin acción manual — el honorario del
    // veterinario ya salió (o no) por un Payout totalmente aparte (ver
    // liquidarSegunCierrePayPal), así que reembolsar el cargo de
    // plataforma desde la captura propia de la plataforma no le toca ni un
    // centavo al veterinario. Es una mejora real que habilita la
    // arquitectura de PayPal, no solo paridad con Mercado Pago.
    if (pago.medioDeCobro === "PAYPAL") {
      if (pago.estado === "REEMBOLSADO_PARCIAL") return pago; // idempotente
      const monto = Number(pago.montoCargoPlataforma);
      if (monto > 0 && pago.paypalCaptureId) {
        await reembolsarCapturaPayPal(pago.paypalCaptureId, monto);
      }
      return this.prisma.pago.update({
        where: { casoId },
        data: { estado: "REEMBOLSADO_PARCIAL", reembolsadoEl: new Date(), montoReembolsado: monto },
      });
    }

    if (pago.montoPendienteAccionManual != null) return pago; // idempotente

    const monto = Number(pago.montoCargoPlataforma);

    return this.prisma.pago.update({
      where: { casoId },
      data: {
        montoPendienteAccionManual: monto > 0 ? monto : null,
        notaAccionManual:
          monto > 0
            ? `Disputa de calidad con lugar: reembolsar $${monto} (cargo de plataforma) al tutor SIN tocar el honorario del vet. No se puede automatizar vía API — el reparto de Mercado Pago en un pago con split es siempre proporcional, así que cualquier reembolso automático le descontaría también al vet. Coordinar el reembolso al tutor y el ajuste con el vet a mano.`
            : null,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Reconciliación manual (Sergio, 2026-09-29 — "resolvé con criterio" el
  // punto de "no hay reintento si falla la liquidación automática"):
  // casos.service.cerrar() llama a liquidarSegunCierre() automáticamente,
  // pero si esa llamada falla (Mercado Pago no responde, el webhook del
  // pago todavía no llegó, etc.) el caso igual queda CERRADO — el pago
  // queda "colgado" en AUTORIZADO para siempre, sin ningún mecanismo que
  // lo vuelva a intentar.
  //
  // Descartado a propósito: un cron in-process (@nestjs/schedule + @Cron).
  // Este proyecto corre en el plan free de Render, que suspende el web
  // service después de un período de inactividad — un scheduler in-process
  // no corre mientras el servicio está dormido y no hay cola de alcance
  // ("catch-up") al despertar, así que un cron acá daría una falsa
  // sensación de estar cubierto cuando en la práctica puede no disparar
  // nunca. (Nota aparte, encontrada de paso: revisarVencimientos() en
  // veterinarios.service.ts tiene exactamente este mismo problema — un
  // comentario que dice "corre periódicamente (cron)" pero ningún
  // @Cron, endpoint ni llamada real lo dispara. Queda fuera de este
  // alcance puntual, pero es la misma clase de bug.)
  //
  // En su lugar: un endpoint que un admin dispara a mano (o que Sergio
  // puede después engancharle un pinger externo — un cron-job.io, un
  // GitHub Action con schedule, etc. — pegándole a este mismo endpoint;
  // eso sí sería confiable en el free tier, porque el pinger vive afuera
  // de Render).
  async reconciliarPagosPendientes() {
    const pendientes = await this.prisma.pago.findMany({
      where: { estado: "AUTORIZADO", caso: { estado: "CERRADO" } },
      include: { caso: true },
    });

    let liquidados = 0;
    let fallidos = 0;
    const errores: { casoId: string; error: string }[] = [];

    for (const pago of pendientes) {
      if (!pago.caso.veterinarioId) {
        // No debería pasar nunca — un caso CERRADO ya pasó por asignar().
        // Defensivo: no lo contamos como "fallido silencioso", queda
        // explícito en la lista de errores para que un admin lo vea.
        fallidos++;
        errores.push({ casoId: pago.casoId, error: "El caso no tiene veterinario asignado" });
        continue;
      }
      try {
        await this.liquidarSegunCierre(pago.casoId, pago.caso.veterinarioId);
        liquidados++;
      } catch (e) {
        fallidos++;
        const mensaje = e instanceof Error ? e.message : String(e);
        errores.push({ casoId: pago.casoId, error: mensaje });
        this.logger.error(`Reconciliación: no se pudo liquidar el caso ${pago.casoId}: ${mensaje}`);
      }
    }

    return { revisados: pendientes.length, liquidados, fallidos, errores };
  }

  // Lista lo que quedó pendiente de acción manual (ver comentarios en
  // liquidarSegunCierre / reembolsarCargoPlataforma sobre por qué no se
  // automatiza) — para que un admin lo vea y lo resuelva desde /admin.
  //
  // `select` explícito, nunca `include: { cliente: true, veterinario: true
  // }`: esos modelos tienen passwordHash / otpCodeHash / los tokens de
  // Mercado Pago del vet — un include completo se los mandaría tal cual al
  // frontend de admin. Acá solo lo mínimo para identificar el caso.
  async listarConAccionManualPendiente() {
    return this.prisma.pago.findMany({
      where: { montoPendienteAccionManual: { not: null } },
      select: {
        id: true,
        casoId: true,
        estado: true,
        montoTotal: true,
        montoPendienteAccionManual: true,
        notaAccionManual: true,
        reembolsadoEl: true,
        caso: {
          select: {
            cliente: { select: { nombre: true, email: true, telefono: true } },
            veterinario: { select: { nombre: true, apellido: true, email: true } },
          },
        },
      },
      orderBy: { reembolsadoEl: "desc" },
    });
  }

  // -------------------------------------------------------------------------
  // OAuth de Mercado Pago (Split de Pagos) — el veterinario conecta su
  // propia cuenta antes de poder cobrar. Sin esto, no hay access_token
  // propio para armar la preferencia con split en crearCheckout().
  // -------------------------------------------------------------------------
  iniciarOAuthMercadoPago(veterinarioId: string): { url: string } {
    return { url: construirUrlAutorizacionMercadoPago(veterinarioId) };
  }

  async manejarCallbackOAuthMercadoPago(code: string, state: string) {
    const veterinarioId = verificarYExtraerState(state); // lanza si el state fue manipulado
    const token = await intercambiarCodigoPorToken(code);

    await this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: {
        mercadoPagoOAuthId: String(token.user_id),
        mercadoPagoAccessToken: token.access_token,
        mercadoPagoRefreshToken: token.refresh_token,
        mercadoPagoTokenVenceEl: new Date(Date.now() + token.expires_in * 1000),
        medioDeCobro: "MERCADO_PAGO",
      },
    });

    return { veterinarioId, conectado: true };
  }
}
