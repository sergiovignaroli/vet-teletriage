import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
  BanderasRojasIntake,
  CARGO_PLATAFORMA,
  ClasificacionCierre,
  franjaHorariaDe,
  hayBanderaRoja,
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
  // horaria de INICIO EFECTIVO de la sesión, no la de la reserva — acá solo
  // calculamos el valor de referencia al crear el caso; se recalcula al
  // iniciar la videollamada (ver iniciarSesion()). honorarioDeclarado no se
  // pide acá: lo fija el veterinario, libremente, recién cuando toma el
  // caso (ver comentario en schema.prisma) — a esta altura todavía no hay
  // veterinario asignado.
  async crear(input: CrearCasoInput) {
    const ahora = new Date();
    const franjaHoraria = franjaHorariaDe(ahora);

    const caso = await this.prisma.caso.create({
      data: {
        clienteId: input.clienteId,
        franjaHoraria,
        cargoPlataforma: CARGO_PLATAFORMA[franjaHoraria],
        estado: hayBanderaRoja(input.banderas) ? "BANDERA_ROJA_MOSTRADA" : "INTAKE",
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

  // Casos sin veterinario asignado todavía, para que cualquier veterinario
  // HABILITADO pueda elegir cuál tomar (Fase 1: dispatch manual — el
  // dispatcher avisa por fuera de la app, esto es lo que el veterinario ve
  // al entrar a mirar). Solo estados pre-asignación: uno ya EN_SESION o
  // CERRADO no tiene sentido "disponible".
  async disponibles() {
    return this.prisma.caso.findMany({
      where: { veterinarioId: null, estado: { in: ["INTAKE", "BANDERA_ROJA_MOSTRADA"] } },
      include: { intake: true },
      orderBy: { creadoEl: "asc" },
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

  // Se llama cuando el veterinario toma el caso y arranca la videollamada —
  // en la Fase 1 (dispatch manual, sin matching automático) "tomarlo" y
  // "empezar la sesión" son el mismo click, así que acá también se fija
  // honorarioDeclarado (Sección 4: lo declara el veterinario, libremente,
  // no el cliente ni la plataforma) y se recalcula la franja horaria por si
  // pasó tiempo entre la creación del caso y el inicio real.
  async iniciarSesion(casoId: string, veterinarioId: string, honorarioDeclarado: number) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    // Un caso ya tomado por otro veterinario no se puede "robar" pisando
    // el veterinarioId — sin este chequeo, cualquier vet autenticado podía
    // adjudicarse un caso ajeno con solo llamar a este endpoint.
    if (caso.veterinarioId && caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("Este caso ya fue tomado por otro veterinario");
    }
    if (!honorarioDeclarado || honorarioDeclarado <= 0) {
      throw new BadRequestException("Tenés que declarar un honorario válido para tomar el caso");
    }

    const ahora = new Date();
    const franjaHoraria = franjaHorariaDe(ahora);

    return this.prisma.caso.update({
      where: { id: casoId },
      data: {
        veterinarioId,
        honorarioDeclarado,
        franjaHoraria,
        cargoPlataforma: CARGO_PLATAFORMA[franjaHoraria],
        estado: "EN_SESION",
        iniciadoEl: ahora,
      },
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
