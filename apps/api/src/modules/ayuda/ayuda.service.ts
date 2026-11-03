import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

export const LARGO_MIN_PREGUNTA = 8;
export const LARGO_MAX_PREGUNTA = 600;
export const LARGO_MAX_RESPUESTA = 2000;
// Tope de preguntas sin atender por persona: frena el abuso sin molestar a
// quien pregunta de verdad.
const MAX_SIN_ATENDER = 5;

@Injectable()
export class AyudaService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(rol: "CLIENTE" | "VETERINARIO", usuarioId: string, textoCrudo: unknown) {
    const texto = typeof textoCrudo === "string" ? textoCrudo.trim().replace(/\s+/g, " ") : "";
    if (texto.length < LARGO_MIN_PREGUNTA) {
      throw new BadRequestException("Escribí tu pregunta con un poco más de detalle.");
    }
    if (texto.length > LARGO_MAX_PREGUNTA) {
      throw new BadRequestException(`La pregunta puede tener hasta ${LARGO_MAX_PREGUNTA} caracteres.`);
    }
    const sinAtender = await this.prisma.preguntaAyuda.count({ where: { usuarioId, atendidaEl: null } });
    if (sinAtender >= MAX_SIN_ATENDER) {
      throw new BadRequestException("Ya tenés varias preguntas esperando respuesta. Te respondemos en cuanto las veamos.");
    }
    const p = await this.prisma.preguntaAyuda.create({ data: { rol, usuarioId, texto } });
    return this.paraUsuario(p);
  }

  async mias(usuarioId: string) {
    const lista = await this.prisma.preguntaAyuda.findMany({
      where: { usuarioId },
      orderBy: { creadaEl: "desc" },
      take: 20,
    });
    return lista.map((p) => this.paraUsuario(p));
  }

  async listarParaAdmin() {
    const lista = await this.prisma.preguntaAyuda.findMany({
      orderBy: [{ atendidaEl: { sort: "asc", nulls: "first" } }, { creadaEl: "desc" }],
      take: 100,
    });
    const idsVet = lista.filter((p) => p.rol === "VETERINARIO").map((p) => p.usuarioId);
    const idsCli = lista.filter((p) => p.rol === "CLIENTE").map((p) => p.usuarioId);
    const [vets, clientes] = await Promise.all([
      idsVet.length
        ? this.prisma.veterinario.findMany({
            where: { id: { in: idsVet } },
            select: { id: true, nombre: true, apellido: true, email: true },
          })
        : [],
      idsCli.length ? this.prisma.cliente.findMany({ where: { id: { in: idsCli } }, select: { id: true, nombre: true } }) : [],
    ]);
    return lista.map((p) => {
      const v = vets.find((x) => x.id === p.usuarioId);
      const c = clientes.find((x) => x.id === p.usuarioId);
      const autor =
        p.rol === "VETERINARIO"
          ? v
            ? `${v.nombre} ${v.apellido} (${v.email})`
            : "Veterinario"
          : c?.nombre
            ? `${c.nombre} (tutor)`
            : "Tutor";
      return { ...this.paraUsuario(p), rol: p.rol, autor };
    });
  }

  async responder(id: string, adminId: string, respuestaCruda: unknown) {
    const existente = await this.prisma.preguntaAyuda.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException("Pregunta no encontrada");
    const respuesta = typeof respuestaCruda === "string" ? respuestaCruda.trim() : "";
    if (respuesta.length > LARGO_MAX_RESPUESTA) {
      throw new BadRequestException(`La respuesta puede tener hasta ${LARGO_MAX_RESPUESTA} caracteres.`);
    }
    // Sin texto = "marcar como atendida" sin respuesta escrita (por ejemplo, si
    // ya se resolvió por otro lado o se sumó a las preguntas frecuentes).
    const p = await this.prisma.preguntaAyuda.update({
      where: { id },
      data: { respuesta: respuesta || null, atendidaEl: new Date(), atendidaPorAdminId: adminId },
    });
    return this.paraUsuario(p);
  }

  private paraUsuario(p: { id: string; texto: string; respuesta: string | null; atendidaEl: Date | null; creadaEl: Date }) {
    return {
      id: p.id,
      texto: p.texto,
      respuesta: p.respuesta,
      atendida: p.atendidaEl !== null,
      creadaEl: p.creadaEl.toISOString(),
    };
  }
}
