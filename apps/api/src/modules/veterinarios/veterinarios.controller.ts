import { Controller, Get, Query } from "@nestjs/common";
import { VeterinariosService } from "./veterinarios.service";

@Controller("veterinarios")
export class VeterinariosController {
  constructor(private readonly veterinarios: VeterinariosService) {}

  @Get("disponibles")
  buscarDisponibles(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
    @Query("radioKm") radioKm = "15",
  ) {
    return this.veterinarios.buscarDisponibles({
      lat: Number(lat),
      lng: Number(lng),
      radioKm: Number(radioKm),
    });
  }
}
