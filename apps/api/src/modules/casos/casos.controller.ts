import { Body, Controller, Param, Patch, Post } from "@nestjs/common";
import { CasosService } from "./casos.service";
import type { ClasificacionCierre } from "@vet-teletriage/types";

@Controller("casos")
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Post()
  crear(@Body() body: Parameters<CasosService["crear"]>[0]) {
    return this.casos.crear(body);
  }

  @Patch(":id/iniciar")
  iniciar(@Param("id") id: string, @Body("veterinarioId") veterinarioId: string) {
    return this.casos.iniciarSesion(id, veterinarioId);
  }

  @Patch(":id/cerrar")
  cerrar(
    @Param("id") id: string,
    @Body("clasificacion") clasificacion: ClasificacionCierre,
    @Body("notas") notas?: string,
  ) {
    return this.casos.cerrar(id, clasificacion, notas);
  }
}
