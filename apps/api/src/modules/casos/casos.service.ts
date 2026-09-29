import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
  BanderasRojasIntake,
  CARGO_PLATAFORMA,
  ClasificacionCierre,
  franjaHorariaDe,
  hayBanderaRoja,
  honorarioBaseDe,
  honorarioFinalDe,
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
  constructor(private readonly prisma: PrismaService) {}

  // Sección 4 del contrato: el cargo de plataforma se fija según la franja
  // horaria al crear el caso. honorarioBase se calcula acá mismo (franja +
  // si hay bandera roja) y queda fijo desde este momento — es lo que el
  // cliente va a ver, junto al margen de cada veterinario, en la pantalla
  // de "elegí veterinario" (GET /casos/:id/para-elegir), ANTES de contratar
  // a nadie. honorarioDeclarado sigue en null: se completa recién cuando el
  // cliente elige (ver asignar()), no antes.
  async crear(input: CrearCasoInput) {
    const ahora = new Date();
    const franjaHoraria = franjaHorariaDe(ahora);
    const hayUrgencia = hayBanderaRoja(input.banderas);

    const caso = await this.prisma.caso.create({
      data: {
        clienteId: input.clienteId,
        franjaHoraria,
        cargoPlataforma: CARGO_PLATAFORMA[franjaHoraria],
        honorarioBase: honorarioBaseDe(franjaHoraria, hayUrgencia),
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

    const conectados = await this.prisma.veterinario.findMany({
      where: { disponible: true, estado: "HABILITADO" },
      include: { calificaciones: { select: { estrellas: true } } },
    });

    return conectados
      .map((v) => {
        const cantidadCalificaciones = v.calificaciones.length;
        const ratingPromedio =
          cantidadCalificaciones > 0
            ? v.calificaciones.reduce((suma, c) => suma + c.estrellas, 0) / cantidadCalificaciones
            : null;
        const honorarioFinal = honorarioFinalDe(honorarioBase, v.margenPorcentaje);
        return {
          id: v.id,
          nombre: v.nombre,
          apellido: v.apellido,
          honorarioFinal,
          costoTotal: honorarioFinal + cargoPlataforma,
          ratingPromedio,
          cantidadCalificaciones,
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

  // El cliente elige veterinario (reemplaza al viejo "tomar caso" desde el
  // lado del veterinario). Se recalcula disponible/HABILITADO acá también
  // —no solo en paraElegir()— porque puede pasar tiempo entre que el
  // cliente ve la lista y hace click; si el veterinario se desconectó en el
  // medio, mejor un error claro que asignarle un caso a quien ya no está.
  async asignar(casoId: string, clienteId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== clienteId) {
      throw new ForbiddenException("Este caso no te pertenece");
    }
    if (caso.veterinarioId) {
      throw new BadRequestException("Este caso ya tiene un veterinario asignado");
    }
    if (caso.honorarioBase == null) {
      throw new BadRequestException("Este caso todavía no tiene un precio base calculado");
    }

    const veterinario = await this.prisma.veterinario.findUnique({ where: { id: veterinarioId } });
    if (!veterinario || !veterinario.disponible || veterinario.estado !== "HABILITADO") {
      throw new BadRequestException("Ese veterinario ya no está disponible — elegí otro de la lista");
    }

    const honorarioDeclarado = honorarioFinalDe(Number(caso.honorarioBase), veterinario.margenPorcentaje);

    return this.prisma.caso.update({
      where: { id: casoId },
      data: { veterinarioId, honorarioDeclarado, estado: "ASIGNADO" },
    });
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
  // CLIENTE ya le asignó (ver asignar()) — ya no fija ni recalcula ningún
  // monto acá: el precio quedó congelado en el momento en que el cliente
  // eligió, precisamente para que sea el total que le prometimos, no uno
  // que cambie según cuándo el veterinario efectivamente se conecte.
  async iniciarSesion(casoId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("No sos el veterinario asignado a este caso");
    }
    if (caso.estado !== "ASIGNADO") {
      throw new BadRequestException("Este caso no está en condiciones de iniciarse");
    }

    return this.prisma.caso.update({
      where: { id: casoId },
      data: { estado: "EN_SESION", iniciadoEl: new Date() },
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

    return this.prisma.caso.update({
      where: { id: casoId },
      data: {
        estado: "CERRADO",
        finalizadoEl: new Date(),
        cierre: { create: { clasificacion, notas } },
      },
      include: { cierre: true },
    });
  }
}
