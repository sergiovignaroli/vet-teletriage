import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CalificacionesService } from "./calificaciones.service";

@Controller("calificaciones")
export class CalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  @Post()
  registrar(@Body() body: { veterinarioId: string; casoId: string; estrellas: number; comentario?: string }) {
    return this.calificaciones.registrar(body.veterinarioId, body.casoId, body.estrellas, body.comentario);
  }

  @Get("veterinario/:id/promedio")
  promedio(@Param("id") id: string) {
    return this.calificaciones.promedioDe(id);
  }

  @Get("veterinario/:id/puntos")
  puntos(@Param("id") id: string) {
    return this.calificaciones.puntosAcumulados(id);
  }
}
