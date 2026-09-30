import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";

const ID_FILA_UNICA = "global";

// Valores por defecto — SOLO se usan si, por el motivo que sea, la fila
// "global" no existe todavía (no debería pasar: la migración
// 20260930090000_precios_configurables_y_bonus_veterano ya la crea con
// estos mismos números, definidos por Sergio el 2026-09-30). Tenerlos acá
// también es una red de seguridad, no la fuente de verdad — la fuente de
// verdad es siempre la fila en la base.
const VALORES_POR_DEFECTO = {
  cargoPlataformaDiurna: 2200,
  cargoPlataformaNocturna: 3200,
  honorarioBaseNormal: 20000,
  honorarioBaseUrgencia: 35000,
  umbralSesionesVeterano: 50,
  bonusVeteranoPorcentaje: 10,
};

export type CambiosConfiguracion = Partial<ConfiguracionPlataforma>;

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  // upsert en vez de un simple findUnique: si por lo que sea la fila no
  // existe (base nueva sin migrar con seed, o alguien la borró a mano),
  // esto la crea con los valores por defecto en vez de que toda la app se
  // caiga la primera vez que alguien intenta calcular un precio.
  async obtener(): Promise<ConfiguracionPlataforma> {
    const fila = await this.prisma.configuracionPlataforma.upsert({
      where: { id: ID_FILA_UNICA },
      update: {},
      create: { id: ID_FILA_UNICA, ...VALORES_POR_DEFECTO },
    });
    return this.aTipo(fila);
  }

  async actualizar(cambios: CambiosConfiguracion): Promise<ConfiguracionPlataforma> {
    this.validar(cambios);

    // Asegura que la fila exista antes de actualizarla — mismo motivo que
    // en obtener().
    await this.obtener();

    const fila = await this.prisma.configuracionPlataforma.update({
      where: { id: ID_FILA_UNICA },
      data: {
        ...cambios,
        // Strings vacíos desde un <input> del panel se guardan como null,
        // no como "" — así el resto de la app (¿hay email de contacto? ¿hay
        // Instagram?) puede seguir chequeando con un simple `if (valor)`.
        emailContacto: normalizarTextoOpcional(cambios.emailContacto),
        instagramUrl: normalizarTextoOpcional(cambios.instagramUrl),
        facebookUrl: normalizarTextoOpcional(cambios.facebookUrl),
        tiktokUrl: normalizarTextoOpcional(cambios.tiktokUrl),
      },
    });
    return this.aTipo(fila);
  }

  private validar(cambios: CambiosConfiguracion) {
    const numericos: Array<[keyof CambiosConfiguracion, string]> = [
      ["cargoPlataformaDiurna", "El cargo de plataforma diurno"],
      ["cargoPlataformaNocturna", "El cargo de plataforma nocturno"],
      ["honorarioBaseNormal", "El honorario base normal"],
      ["honorarioBaseUrgencia", "El honorario base de urgencia"],
    ];
    for (const [campo, etiqueta] of numericos) {
      const valor = cambios[campo];
      if (valor === undefined) continue;
      if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
        throw new BadRequestException(`${etiqueta} tiene que ser un número mayor o igual a 0`);
      }
    }

    if (cambios.umbralSesionesVeterano !== undefined) {
      if (!Number.isInteger(cambios.umbralSesionesVeterano) || cambios.umbralSesionesVeterano < 0) {
        throw new BadRequestException("El umbral de sesiones para el premio por volumen tiene que ser un entero mayor o igual a 0");
      }
    }

    if (cambios.bonusVeteranoPorcentaje !== undefined) {
      const v = cambios.bonusVeteranoPorcentaje;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
        throw new BadRequestException("El premio por volumen tiene que ser un porcentaje entre 0 y 100");
      }
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (cambios.emailContacto && !EMAIL_RE.test(cambios.emailContacto)) {
      throw new BadRequestException("El email de contacto no tiene un formato válido");
    }

    const URL_RE = /^https?:\/\/.+/i;
    for (const [campo, etiqueta] of [
      ["instagramUrl", "El link de Instagram"],
      ["facebookUrl", "El link de Facebook"],
      ["tiktokUrl", "El link de TikTok"],
    ] as const) {
      const valor = cambios[campo];
      if (valor && !URL_RE.test(valor)) {
        throw new BadRequestException(`${etiqueta} tiene que empezar con http:// o https://`);
      }
    }
  }

  private aTipo(fila: {
    cargoPlataformaDiurna: { toNumber(): number };
    cargoPlataformaNocturna: { toNumber(): number };
    honorarioBaseNormal: { toNumber(): number };
    honorarioBaseUrgencia: { toNumber(): number };
    umbralSesionesVeterano: number;
    bonusVeteranoPorcentaje: { toNumber(): number };
    emailContacto: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
  }): ConfiguracionPlataforma {
    return {
      cargoPlataformaDiurna: fila.cargoPlataformaDiurna.toNumber(),
      cargoPlataformaNocturna: fila.cargoPlataformaNocturna.toNumber(),
      honorarioBaseNormal: fila.honorarioBaseNormal.toNumber(),
      honorarioBaseUrgencia: fila.honorarioBaseUrgencia.toNumber(),
      umbralSesionesVeterano: fila.umbralSesionesVeterano,
      bonusVeteranoPorcentaje: fila.bonusVeteranoPorcentaje.toNumber(),
      emailContacto: fila.emailContacto,
      instagramUrl: fila.instagramUrl,
      facebookUrl: fila.facebookUrl,
      tiktokUrl: fila.tiktokUrl,
    };
  }
}

function normalizarTextoOpcional(valor: string | null | undefined): string | null | undefined {
  if (valor === undefined) return undefined; // no vino en el body — no tocar ese campo
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}
