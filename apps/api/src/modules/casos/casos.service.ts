import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { desdeSenalVigente } from "../../common/presencia";
import { PrismaService } from "../../prisma.service";
import { VideoService } from "../video/video.service";
import { PagosService } from "../pagos/pagos.service";
import { ConfiguracionService } from "../configuracion/configuracion.service";
import {
  BanderasRojasIntake,
  ClasificacionCierre,
  franjaHorariaDe,
  hayBanderaRoja,
  honorarioBaseDe,
  honorarioFinalDe,
  honorarioPaypalDe,
  PISO_CALIDAD_ESTRELLAS,
  VeterinarioParaElegir,
} from "@vet-teletriage/types";

interface CrearCasoInput {
  clienteId: string;
  banderas: BanderasRojasIntake;
  contexto: {
    especie: string;
    raza?: string;
    edadAproximada?: string;
    pesoAproximadoKg?: number;
    motivoConsulta: string;
    tiempoEvolucion?: string;
    medicacionActual?: string;
    antecedentes?: string;
    fotosUrls?: string[];
    videoUrl?: string;
  };
}

@Injectable()
export class CasosService {
  private readonly logger = new Logger(CasosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly video: VideoService,
    private readonly pagos: PagosService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  // Sección 4 del contrato: el cargo de plataforma se fija según la franja
  // horaria al crear el caso. honorarioBase se calcula acá mismo (franja +
  // si hay bandera roja) y queda fijo desde este momento — es lo que el
  // cliente va a ver, junto al margen de cada veterinario, en la pantalla
  // de "elegí veterinario" (GET /casos/:id/para-elegir), ANTES de contratar
  // a nadie. honorarioDeclarado sigue en null: se completa recién cuando el
  // cliente elige (ver asignarPorAceptacion()), no antes.
  async crear(input: CrearCasoInput) {
    const ahora = new Date();
    const franjaHoraria = franjaHorariaDe(ahora);
    const hayUrgencia = hayBanderaRoja(input.banderas);
    const config = await this.configuracion.obtener();
    const cargoPlataforma =
      franjaHoraria === "DIURNA" ? config.cargoPlataformaDiurna : config.cargoPlataformaNocturna;

    const caso = await this.prisma.caso.create({
      data: {
        clienteId: input.clienteId,
        franjaHoraria,
        cargoPlataforma,
        honorarioBase: honorarioBaseDe(config, hayUrgencia),
        estado: hayUrgencia ? "BANDERA_ROJA_MOSTRADA" : "INTAKE",
        intake: {
          create: {
            ...input.banderas,
            ...input.contexto,
          },
        },
      },
      include: { intake: true },
    });

    return caso;
  }

  // Reemplaza a la vieja "cola de disponibles" (2026-09-28) donde el
  // veterinario agarraba el primer caso libre. Decisión de Sergio
  // (2026-09-29): el cliente tiene que ver el costo total y poder elegir
  // ANTES de contratar — así que ahora es al revés: el cliente pide esta
  // lista y elige, el veterinario ya no "toma" nada por su cuenta (ver
  // asignar() más abajo). El filtro de conexión sigue siendo el mismo
  // (Veterinario.disponible + estado HABILITADO), solo que ahora se aplica
  // del lado del cliente, no del veterinario.
  //
  // Situación probable (encontrada 2026-09-29, no pedida explícitamente):
  // `disponible` es un toggle manual — "conectarme/desconectarme" — que
  // NUNCA se apaga solo. Sin el filtro `casos: none` de acá abajo, un
  // veterinario que ya tiene un caso ASIGNADO o EN_SESION seguía apareciendo
  // en esta lista para TODOS los demás clientes, así que el más barato o
  // mejor puntuado de la lista terminaba acumulando varias consultas
  // simultáneas — justo lo que Sergio dijo que no quiere ("no quiero
  // volverme loco" con mucho flujo). Un veterinario ocupado con un caso no
  // debería poder ser elegido para otro hasta cerrar el que tiene.
  async paraElegir(casoId: string, clienteId: string): Promise<VeterinarioParaElegir[]> {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== clienteId) {
      throw new ForbiddenException("Este caso no te pertenece");
    }
    if (caso.veterinarioId) {
      throw new BadRequestException("Este caso ya tiene un veterinario asignado");
    }
    if (caso.honorarioBase == null) {
      // No debería pasar nunca (crear() siempre lo completa) — defensivo.
      throw new BadRequestException("Este caso todavía no tiene un precio base calculado");
    }

    const honorarioBase = Number(caso.honorarioBase);
    const cargoPlataforma = Number(caso.cargoPlataforma);
    const config = await this.configuracion.obtener();

    // hace falta para el precio fijo de PayPal (honorarioPaypalDe abajo) —
    // el mismo criterio que usó crear() para fijar honorarioBase.
    const intake = await this.prisma.intakeFormulario.findUnique({ where: { casoId } });
    const hayUrgencia = intake ? hayBanderaRoja(intake) : false;
    const costoTotalPaypalUsd =
      Math.round((honorarioPaypalDe(config, hayUrgencia) + config.cargoPlataformaPaypalUsd) * 100) / 100;

    // Solicitudes de atención (Sergio, 2026-10-27): se lista a quien está
    // Conectado o en Stand by (ambos reciben aviso) con el panel vivo. Quien
    // está en consulta SIGUE apareciendo — recibe la solicitud como ventana
    // emergente — pero no quien ya tiene un cliente asignado esperando que
    // empiece, ni quien tiene una solicitud pendiente de respuesta.
    const conectados = await this.prisma.veterinario.findMany({
      where: {
        estado: "HABILITADO",
        presencia: { in: ["CONECTADO", "STAND_BY"] },
        // Solo quien tiene el panel abierto (latido reciente) — ver common/presencia.ts
        ultimaSenal: { gte: desdeSenalVigente() },
        casos: { none: { estado: "ASIGNADO" } },
        solicitudes: { none: { estado: "PENDIENTE", venceEl: { gt: new Date() } } },
      },
      include: {
        calificaciones: { select: { estrellas: true } },
        casos: { where: { estado: "EN_SESION" }, select: { id: true } },
      },
    });

    return conectados
      .map((v) => {
        const cantidadCalificaciones = v.calificaciones.length;
        const ratingPromedio =
          cantidadCalificaciones > 0
            ? v.calificaciones.reduce((suma, c) => suma + c.estrellas, 0) / cantidadCalificaciones
            : null;
        // Premio por volumen (Sergio, 2026-09-30): automático, no lo toca el
        // veterinario. Tiene que calcularse EXACTAMENTE igual acá que en
        // asignar() más abajo — si no, el precio que el cliente ve en esta
        // lista no coincidiría con el que termina pagando.
        const bonusVeterano = v.sesionesCompletadas >= config.umbralSesionesVeterano ? config.bonusVeteranoPorcentaje : 0;
        const honorarioFinal = honorarioFinalDe(honorarioBase, v.margenPorcentaje, bonusVeterano);
        return {
          id: v.id,
          nombre: v.nombre,
          apellido: v.apellido,
          honorarioFinal,
          costoTotal: honorarioFinal + cargoPlataforma,
          // null si este veterinario no cargó un email de PayPal — ver
          // Veterinario.paypalEmail y PagosService.crearCheckoutPayPal.
          costoTotalPaypalUsd: v.paypalEmail ? costoTotalPaypalUsd : null,
          ratingPromedio,
          cantidadCalificaciones,
          enConsulta: v.casos.length > 0,
          enStandBy: v.presencia === "STAND_BY",
        };
      })
      // Piso de calidad (Sección 11/12, PISO_CALIDAD_ESTRELLAS): un
      // veterinario con calificaciones por debajo del piso queda fuera de
      // esta lista. Uno sin calificaciones todavía (recién habilitado) NO
      // se excluye — no hay señal para juzgarlo, no es lo mismo que un mal
      // rating.
      .filter((v) => v.ratingPromedio === null || v.ratingPromedio >= PISO_CALIDAD_ESTRELLAS)
      .sort((a, b) => a.costoTotal - b.costoTotal);
  }

  // Asignación por aceptación (Sergio, 2026-10-27): el cliente ya NO asigna
  // directo — pide una solicitud (SolicitudesService.crear) y el caso se
  // asigna recién cuando el veterinario la acepta. Por eso esto es interno:
  // ninguna ruta del cliente lo llama, y no se puede saltear el consentimiento
  // del veterinario ni la aceptación de los términos.
  //
  // Acá no se vuelve a exigir `disponible` ni señal vigente: quien acepta una
  // solicitud está claramente presente. Sí se mantiene el límite de un solo
  // caso ASIGNADO esperando (no se puede acumular clientes sin arrancar). Un
  // caso EN_SESION no bloquea: justamente se acepta mientras se atiende a otro.
  async asignarPorAceptacion(casoId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.veterinarioId) {
      throw new BadRequestException("Este caso ya tiene un veterinario asignado");
    }
    if (caso.honorarioBase == null) {
      throw new BadRequestException("Este caso todavía no tiene un precio base calculado");
    }

    const veterinario = await this.prisma.veterinario.findUnique({
      where: { id: veterinarioId },
      include: { casos: { where: { estado: "ASIGNADO" }, select: { id: true } } },
    });
    if (!veterinario || veterinario.estado !== "HABILITADO") {
      throw new BadRequestException("Ese veterinario no está habilitado");
    }
    if (veterinario.casos.length > 0) {
      throw new BadRequestException("Ya tenés un cliente esperando que empieces — iniciá esa consulta primero");
    }

    // Mismo cálculo que paraElegir() — ver el comentario ahí sobre por qué
    // tiene que coincidir exactamente.
    const config = await this.configuracion.obtener();
    const bonusVeterano =
      veterinario.sesionesCompletadas >= config.umbralSesionesVeterano ? config.bonusVeteranoPorcentaje : 0;
    const honorarioDeclarado = honorarioFinalDe(Number(caso.honorarioBase), veterinario.margenPorcentaje, bonusVeterano);

    // Condición en el update: si dos aceptaciones se cruzan, solo una gana.
    const r = await this.prisma.caso.updateMany({
      where: { id: casoId, veterinarioId: null },
      data: { veterinarioId, honorarioDeclarado, estado: "ASIGNADO" },
    });
    if (r.count === 0) throw new BadRequestException("Este caso ya tiene un veterinario asignado");
    return this.prisma.caso.findUniqueOrThrow({ where: { id: casoId } });
  }

  // Casos de ESTE veterinario (tomados por él, en curso o ya cerrados) —
  // el id sale del JWT vía @CurrentUser, nunca de un query param, para que
  // un veterinario no pueda pedir la lista de otro.
  async misCasos(veterinarioId: string) {
    return this.prisma.caso.findMany({
      where: { veterinarioId },
      include: { intake: true, cierre: true },
      orderBy: { creadoEl: "desc" },
    });
  }

  // Historial del CLIENTE — sin esto no había ninguna forma de que el
  // cliente volviera a ver un caso una vez que salía de la pantalla de
  // "elegí veterinario", ni de saber que terminó, ni de calificarlo
  // (Sergio, 2026-09-29: el sistema de estrellitas es el corazón del
  // producto y no tenía por dónde alimentarse desde la app), ni de
  // reportar un problema (disputa de calidad — mismo día, siguiente hueco).
  //
  // disputaCalidad SÍ es una relación real (Caso.disputaCalidad en el
  // schema), así que se resuelve con include anidado. Calificacion.casoId,
  // en cambio, es un campo único pero NO una relación de Prisma — no hay
  // @relation hacia Caso — así que esa parte se consulta aparte y se cruza
  // acá a mano.
  async misCasosCliente(clienteId: string) {
    const casos = await this.prisma.caso.findMany({
      where: { clienteId },
      include: {
        intake: true,
        veterinario: { select: { id: true, nombre: true, apellido: true } },
        disputaCalidad: { select: { id: true, estado: true, resolucion: true } },
        // `select`, no `true`: el modelo Pago tiene ids/preferencia de
        // Mercado Pago que no le aportan nada al cliente — solo lo mínimo
        // para que /pago/[estado] sepa el resultado real del cobro, sin
        // confiar únicamente en el back_url por el que MP redirigió.
        pago: { select: { estado: true, montoTotal: true, moneda: true, medioDeCobro: true } },
      },
      orderBy: { creadoEl: "desc" },
    });

    const calificaciones = await this.prisma.calificacion.findMany({
      where: { casoId: { in: casos.map((c) => c.id) } },
      select: { casoId: true },
    });
    const calificados = new Set(calificaciones.map((c) => c.casoId));

    return casos.map((caso) => ({ ...caso, yaCalificado: calificados.has(caso.id) }));
  }

  // El veterinario confirma que arranca la videollamada de un caso que el
  // CLIENTE ya le asignó (ver asignarPorAceptacion()) — ya no fija ni recalcula ningún
  // monto acá: el precio quedó congelado en el momento en que el cliente
  // eligió, precisamente para que sea el total que le prometimos, no uno
  // que cambie según cuándo el veterinario efectivamente se conecte.
  //
  // Acá mismo se crea la sala de video (Sergio, 2026-09-29) — tiene sentido
  // recién ahora, no antes: no hace falta sala mientras el caso solo está
  // ASIGNADO y nadie se conectó todavía. VideoService.crearSala() puede
  // devolver null (sin proveedor real conectado, ver módulo `video`) — eso
  // NUNCA bloquea el paso a EN_SESION, la sala es un detalle de cómo se
  // hace la consulta, no una condición para que empiece.
  async iniciarSesion(casoId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("No sos el veterinario asignado a este caso");
    }
    if (caso.estado !== "ASIGNADO") {
      throw new BadRequestException("Este caso no está en condiciones de iniciarse");
    }

    const salaVideoUrl = await this.video.crearSala(casoId);

    return this.prisma.caso.update({
      where: { id: casoId },
      data: { estado: "EN_SESION", iniciadoEl: new Date(), salaVideoUrl },
    });
  }

  // Sección 8 y 9 del contrato: el checklist de cierre determina si hay
  // derecho a reembolso. RESUELTO_POR_ORIENTACION y DERIVADO_A_EMERGENCIA
  // se facturan al 100% — acá NO se toca el pago, eso lo hace pagos.service
  // en base a esta clasificación.
  async cerrar(casoId: string, veterinarioId: string, clasificacion: ClasificacionCierre, notas?: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.estado !== "EN_SESION") {
      throw new BadRequestException("Solo se puede cerrar un caso que está en sesión");
    }
    // Solo el veterinario asignado a ESTE caso puede cerrarlo — sin esto,
    // cualquier vet autenticado podía clasificar el cierre de un caso ajeno.
    if (caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("No sos el veterinario asignado a este caso");
    }

    const cerrado = await this.prisma.caso.update({
      where: { id: casoId },
      data: {
        estado: "CERRADO",
        finalizadoEl: new Date(),
        cierre: { create: { clasificacion, notas } },
      },
      include: { cierre: true },
    });

    // Alimenta el premio por volumen (Sergio, 2026-09-30, ver
    // Veterinario.sesionesCompletadas) — CUALQUIER cierre cuenta acá, sea
    // cual sea la clasificación: el contador mide "sesiones atendidas", no
    // "sesiones sin problemas". No bloquea el cierre si falla.
    try {
      await this.prisma.veterinario.update({
        where: { id: veterinarioId },
        data: { sesionesCompletadas: { increment: 1 } },
      });
    } catch (e) {
      this.logger.error(
        `No se pudo incrementar sesionesCompletadas del veterinario ${veterinarioId}: ${e instanceof Error ? e.message : e}`,
      );
    }

    // Situación probable (encontrada 2026-09-29): POST /pagos/:id/liquidar
    // existía desde antes pero ninguna pantalla ni ningún otro service lo
    // llamaba nunca — sin esto, cerrar un caso jamás liquidaba ni reembolsaba
    // el pago, quedaba en AUTORIZADO para siempre. Se llama automáticamente
    // acá, apenas se cierra, para que el vet no tenga que acordarse de un
    // segundo paso manual. Si falla (ej. el webhook de Mercado Pago todavía
    // no confirmó el pago, o la API de Mercado Pago no responde), NO se
    // bloquea el cierre del caso — el vet ya prestó o no el servicio, eso ya
    // pasó. Queda sin liquidar, pero ya no es un callejón sin salida: un
    // admin puede reintentarlo desde /admin (PagosService.reconciliarPagosPendientes,
    // POST /pagos/reconciliar) sin necesitar acceso a la base de datos.
    try {
      await this.pagos.liquidarSegunCierre(casoId, veterinarioId);
    } catch (e) {
      this.logger.error(
        `No se pudo liquidar el pago del caso ${casoId} al cerrarlo: ${e instanceof Error ? e.message : e}`,
      );
    }

    return cerrado;
  }
}
