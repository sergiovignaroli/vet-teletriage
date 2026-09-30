import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";
import { generarTokenAgora, VideoNoConfiguradoError } from "./agora.util";

// Único endpoint Agora-específico de toda la app (ver el comentario en
// agora.util.ts sobre por qué esto no pasa por la interfaz agnóstica
// ProveedorVideo). Vive en su propio controller, no en CasosController,
// para que VideoModule no dependa de CasosModule (hoy es al revés:
// CasosModule importa VideoModule) — inyecta PrismaService directo para
// chequear pertenencia al caso, mismo criterio que CasosService.
@Controller("video")
export class VideoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":casoId/token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE", "VETERINARIO")
  async token(@Param("casoId") casoId: string, @CurrentUser() usuario: UsuarioAutenticado) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new NotFoundException("Caso no encontrado");

    // El usuario tiene que ser el cliente o el veterinario DE ESTE caso
    // puntual — nunca alcanza con "estar logueado como cliente/veterinario"
    // a secas, si no cualquiera podría escuchar la consulta de otro.
    const perteneceAlCaso =
      (usuario.rol === "CLIENTE" && caso.clienteId === usuario.id) ||
      (usuario.rol === "VETERINARIO" && caso.veterinarioId === usuario.id);
    if (!perteneceAlCaso) throw new ForbiddenException("No formás parte de este asesoramiento");

    if (caso.estado !== "EN_SESION") {
      throw new BadRequestException("Este asesoramiento todavía no arrancó del lado del veterinario");
    }

    try {
      // El canal es el id del caso directo — ya es único y sirve como
      // nombre de canal de Agora sin transformarlo.
      const { appId, token, uid, expiraEl } = generarTokenAgora(casoId);
      return { appId, channel: casoId, token, uid, expiraEl };
    } catch (e) {
      if (e instanceof VideoNoConfiguradoError) throw new ServiceUnavailableException(e.message);
      throw e;
    }
  }
}
