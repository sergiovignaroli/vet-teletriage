import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { DisputasService } from "../disputas/disputas.service";
import { consultarEstadoProcesoIdentidad, crearProcesoIdentidad } from "../../common/truora.util";

@Injectable()
export class IdentidadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disputas: DisputasService,
  ) {}

  // Sección 6 del contrato: arranca el proceso de KYC en Truora. La captura
  // de documento/selfie la hace el propio Truora (SDK/hosted flow) del lado
  // del veterinario — acá solo se abre el proceso y se guarda la referencia
  // para poder consultarlo después.
  async iniciarVerificacion(veterinarioId: string) {
    const proceso = await crearProcesoIdentidad(veterinarioId);

    return this.prisma.verificacionIdentidad.create({
      data: {
        veterinarioId,
        proveedor: "truora",
        proveedorRefId: proceso.process_id,
        resultado: "PENDIENTE",
      },
    });
  }

  // Polling manual (Truora no confirmó tener webhooks en la doc consultada —
  // ver comentario en truora.util.ts). Si el resultado queda INCONSISTENTE,
  // dispara automáticamente el circuito de disputa de identidad de la
  // Sección 10: suspensión cautelar inmediata, no una habilitación con dudas.
  async consultarEstado(verificacionId: string, veterinarioId: string) {
    const verificacion = await this.prisma.verificacionIdentidad.findUnique({
      where: { id: verificacionId },
    });
    if (!verificacion) throw new BadRequestException("Verificación no encontrada");
    if (verificacion.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("Esta verificación no te pertenece");
    }
    if (!verificacion.proveedorRefId) {
      throw new BadRequestException("La verificación no tiene proceso de Truora asociado");
    }
    if (verificacion.resultado !== "PENDIENTE") {
      return verificacion; // ya resuelta, no volver a pegarle a la API
    }

    const estado = await consultarEstadoProcesoIdentidad(verificacion.proveedorRefId);
    const status = estado.verification_output?.status;

    // Mapeo deliberadamente conservador (ver nota [Probable] en truora.util.ts):
    // "success" → aprobada; cualquier otra cosa que no sea "sigue en curso"
    // → INCONSISTENTE, nunca RECHAZADA directo, para que pase por revisión
    // humana en vez de cerrarse solo. Ajustar cuando se confirmen los
    // valores reales de status contra la documentación viva de Truora.
    let resultado: "PENDIENTE" | "APROBADA" | "INCONSISTENTE" = "PENDIENTE";
    if (status === "success") {
      resultado = "APROBADA";
    } else if (status && status !== "in_progress" && status !== "pending") {
      resultado = "INCONSISTENTE";
    }

    const actualizada = await this.prisma.verificacionIdentidad.update({
      where: { id: verificacionId },
      data: { resultado },
    });

    if (resultado === "INCONSISTENTE") {
      await this.disputas.abrirDisputaIdentidad(
        veterinarioId,
        `Verificación de identidad Truora inconsistente (process_id ${verificacion.proveedorRefId})`,
      );
    }

    return actualizada;
  }
}
