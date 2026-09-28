import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

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
