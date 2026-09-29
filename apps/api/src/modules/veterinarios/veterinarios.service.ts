import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { MARGEN_PORCENTAJE_MAX, MARGEN_PORCENTAJE_MIN } from "@vet-teletriage/types";

@Injectable()
export class VeterinariosService {
  constructor(private readonly prisma: PrismaService) {}

  // Búsqueda por proximidad, filtrando solo veterinarios habilitados y
  // disponibles — la Sección 2 del contrato exige matrícula y seguro
  // vigentes, así que un vencimiento ya debería haber movido el estado
  // fuera de HABILITADO antes de llegar acá (ver revisarVencimientos()).
  async buscarDisponibles(params: { lat: number; lng: number; radioKm: number }) {
    // Nota de implementación: para el MVP alcanza con un filtro simple en
    // memoria; cuando el volumen lo justifique, migrar a una consulta
    // PostGIS (ST_DWithin) directamente en la base.
    const candidatos = await this.prisma.veterinario.findMany({
      where: { disponible: true, estado: "HABILITADO" },
    });

    return candidatos
      .map((v) => ({
        ...v,
        distanciaKm: this.distanciaHaversine(params.lat, params.lng, v.latitud ?? 0, v.longitud ?? 0),
      }))
      .filter((v) => v.distanciaKm <= params.radioKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  // Filtro real de "casos disponibles" (decisión de Sergio, 2026-09-28): NO
  // es por cercanía ni por especialidad — cualquier veterinario matriculado
  // en el país puede darse de alta y atender, de punta a punta. El único
  // filtro es que el veterinario se haya conectado explícitamente. Antes de
  // esto no existía ningún endpoint para prender/apagar `disponible` — solo
  // se tocaba automáticamente por vencimiento o disputa de identidad.
  async conectar(veterinarioId: string) {
    const veterinario = await this.prisma.veterinario.findUnique({ where: { id: veterinarioId } });
    if (!veterinario) throw new BadRequestException("Veterinario no encontrado");
    // Sección 2: solo puede aparecer disponible quien está HABILITADO
    // (matrícula y seguro vigentes, identidad verificada) — un
    // PENDIENTE_VERIFICACION o un SUSPENDIDO_* no puede conectarse.
    if (veterinario.estado !== "HABILITADO") {
      throw new ForbiddenException("Tu cuenta todavía no está habilitada — no podés conectarte a tomar casos");
    }
    return this.prisma.veterinario.update({ where: { id: veterinarioId }, data: { disponible: true } });
  }

  async desconectar(veterinarioId: string) {
    return this.prisma.veterinario.update({ where: { id: veterinarioId }, data: { disponible: false } });
  }

  // Habilitación manual por admin (Sergio, 2026-09-29) — vía el panel de
  // administración. Es el camino de EXCEPCIÓN: matrícula/seguro cargados
  // mal, Truora rechazó o no corrió, o cualquier caso que no resolvió solo
  // el camino automático de abajo. Tira error si no corresponde, porque acá
  // hay un humano mirando la pantalla que puede reaccionar al motivo.
  async habilitarManualmente(veterinarioId: string) {
    const veterinario = await this.prisma.veterinario.findUnique({ where: { id: veterinarioId } });
    if (!veterinario) throw new BadRequestException("Veterinario no encontrado");

    const { habilitable, motivo } = this.evaluarHabilitable(veterinario);
    if (!habilitable) throw new BadRequestException(motivo);

    return this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: { estado: "HABILITADO" },
    });
  }

  // Camino AUTOMÁTICO (Sergio, 2026-09-29): "la idea es que funcione solo y
  // casi automático porque cuando haya mucho flujo de gente no quiero
  // volverme loco". Lo llama identidad.service.ts apenas Truora aprueba la
  // identidad — sin esto, CADA veterinario nuevo, sin excepción, dependía
  // de que un admin humano tocara un botón, lo cual no escala. Es
  // best-effort y silencioso: si matrícula/seguro no están vigentes, el
  // veterinario simplemente queda en PENDIENTE_VERIFICACION — ahí lo
  // recoge el panel admin como excepción a revisar, no se lanza ningún
  // error al veterinario (que no puede hacer nada al respecto desde acá).
  async intentarHabilitarAutomaticamente(veterinarioId: string): Promise<boolean> {
    const veterinario = await this.prisma.veterinario.findUnique({ where: { id: veterinarioId } });
    if (!veterinario) return false;

    const { habilitable } = this.evaluarHabilitable(veterinario);
    if (!habilitable) return false;

    await this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: { estado: "HABILITADO" },
    });
    return true;
  }

  // Veterinarios que NO se auto-habilitaron y siguen esperando revisión —
  // es la cola de excepciones que muestra el panel admin (Sergio,
  // 2026-09-29): si la habilitación automática funciona, esta lista debería
  // ser chica y rara, no el flujo principal.
  async listarPendientes() {
    return this.prisma.veterinario.findMany({
      where: { estado: "PENDIENTE_VERIFICACION" },
      orderBy: { creadoEl: "asc" },
    });
  }

  private evaluarHabilitable(veterinario: {
    matriculaVenceEl: Date;
    seguroVenceEl: Date;
  }): { habilitable: boolean; motivo?: string } {
    const hoy = new Date();
    if (veterinario.matriculaVenceEl < hoy) {
      return { habilitable: false, motivo: "La matrícula cargada ya está vencida — no se puede habilitar así" };
    }
    if (veterinario.seguroVenceEl < hoy) {
      return { habilitable: false, motivo: "El seguro cargado ya está vencido — no se puede habilitar así" };
    }
    return { habilitable: true };
  }

  // Sergio, 2026-09-29: el margen es un % sobre el honorarioBase que
  // calcula la plataforma, igual para todos en cuanto al mecanismo — el
  // rango en sí (MARGEN_PORCENTAJE_MIN/MAX) es una constante compartida, no
  // algo que un veterinario pueda pisar mandando cualquier número. Nunca
  // confiar en el body sin clampear acá.
  async ajustarMargen(veterinarioId: string, margenPorcentaje: number) {
    if (!Number.isFinite(margenPorcentaje)) {
      throw new BadRequestException("Margen inválido");
    }
    if (margenPorcentaje < MARGEN_PORCENTAJE_MIN || margenPorcentaje > MARGEN_PORCENTAJE_MAX) {
      throw new BadRequestException(
        `El margen tiene que estar entre ${MARGEN_PORCENTAJE_MIN}% y ${MARGEN_PORCENTAJE_MAX}%`,
      );
    }
    return this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: { margenPorcentaje: Math.round(margenPorcentaje) },
    });
  }

  // Corre periódicamente (cron) — Sección 2: la suspensión por vencimiento
  // de matrícula o seguro es automática y no discrecional, nunca disciplinaria.
  async revisarVencimientos(hoy: Date = new Date()) {
    await this.prisma.veterinario.updateMany({
      where: { matriculaVenceEl: { lt: hoy }, estado: "HABILITADO" },
      data: { estado: "SUSPENDIDO_MATRICULA_VENCIDA", disponible: false },
    });
    await this.prisma.veterinario.updateMany({
      where: { seguroVenceEl: { lt: hoy }, estado: "HABILITADO" },
      data: { estado: "SUSPENDIDO_SEGURO_VENCIDO", disponible: false },
    });
  }

  private distanciaHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
