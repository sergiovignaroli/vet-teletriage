import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ajustarCeldaPorPorcentaje,
  CLAVES_TARIFA,
  ClaveTarifa,
  claveTarifa,
  cargoPlataformaPorcentual,
  ConfiguracionPlataforma,
  FranjaHoraria,
  franjaEnZona,
  MisPreciosVeterinario,
  ModoPrecio,
  MODOS_PRECIO,
  motivoCeldaInvalida,
  precioEfectivo,
  ReglaFranja,
  TarifaCelda,
  TarifasPais,
  TEXTO_AVISO_PRECIOS,
  TipoConsulta,
  validarPrecioPropio,
  VERSION_AVISO_PRECIOS,
} from "@vet-teletriage/types";
import { PrismaService } from "../../prisma.service";
import { ConfiguracionService } from "../configuracion/configuracion.service";

// Lo que hace falta para calcular el precio de cualquier veterinario de un
// país. Se arma una sola vez por pedido (no una por veterinario).
export interface ContextoPrecios {
  pais: string;
  moneda: string;
  modo: ModoPrecio;
  regla: ReglaFranja;
  tarifas: TarifasPais;
  config: ConfiguracionPlataforma;
}

export interface PreciosDeVeterinario {
  pais: string;
  zonaHoraria: string;
  precioNormalDiurno: Prisma.Decimal | null;
  precioNormalNocturno: Prisma.Decimal | null;
  precioUrgenciaDiurno: Prisma.Decimal | null;
  precioUrgenciaNocturno: Prisma.Decimal | null;
}

export interface PrecioCalculado {
  franja: FranjaHoraria;
  honorario: number;
  cargo: number;
  total: number;
}

type CampoPrecio = "precioNormalDiurno" | "precioNormalNocturno" | "precioUrgenciaDiurno" | "precioUrgenciaNocturno";
const CAMPO_DE_CLAVE: Record<ClaveTarifa, CampoPrecio> = {
  NORMAL_DIURNA: "precioNormalDiurno",
  NORMAL_NOCTURNA: "precioNormalNocturno",
  URGENCIA_DIURNA: "precioUrgenciaDiurno",
  URGENCIA_NOCTURNA: "precioUrgenciaNocturno",
};

// Banda de arranque: la que ya regía (margen de −20 % a +20 % sobre el
// honorario base). El dueño la cambia desde el panel.
const PISO_INICIAL = 0.8;
const TECHO_INICIAL = 1.2;

const PAIS_RE = /^[A-Z]{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function aNumero(valor: Prisma.Decimal | number | null | undefined): number | null {
  return valor == null ? null : Number(valor);
}

@Injectable()
export class PreciosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  // -------------------------------------------------------------------------
  // Lectura / cálculo
  // -------------------------------------------------------------------------

  // Si el país todavía no tiene sus cuatro bandas, las siembra con los
  // honorarios base que ya existían (el nocturno arranca igual al diurno:
  // no se inventa un recargo — el dueño lo carga desde el panel).
  private async asegurarTarifas(pais: string) {
    const existentes = await this.prisma.tarifaPais.count({ where: { pais } });
    if (existentes >= CLAVES_TARIFA.length) return;
    const config = await this.configuracion.obtener();
    const base: Record<TipoConsulta, number> = { NORMAL: config.honorarioBaseNormal, URGENCIA: config.honorarioBaseUrgencia };
    const filas: Prisma.TarifaPaisCreateManyInput[] = [];
    for (const tipo of ["NORMAL", "URGENCIA"] as const) {
      for (const franja of ["DIURNA", "NOCTURNA"] as const) {
        filas.push({
          pais,
          tipo,
          franja,
          piso: Math.round(base[tipo] * PISO_INICIAL),
          aconsejado: base[tipo],
          techo: Math.round(base[tipo] * TECHO_INICIAL),
        });
      }
    }
    await this.prisma.tarifaPais.createMany({ data: filas, skipDuplicates: true });
  }

  async contexto(pais: string): Promise<ContextoPrecios> {
    const reglaFila = await this.prisma.reglaPais.findUnique({ where: { pais } });
    if (!reglaFila) throw new BadRequestException(`El país ${pais} todavía no está configurado`);
    await this.asegurarTarifas(pais);
    const [filas, feriados, config] = await Promise.all([
      this.prisma.tarifaPais.findMany({ where: { pais } }),
      this.prisma.feriado.findMany({ where: { pais }, select: { fecha: true } }),
      this.configuracion.obtener(),
    ]);
    const tarifas = {} as TarifasPais;
    for (const f of filas) {
      tarifas[claveTarifa(f.tipo, f.franja)] = { piso: Number(f.piso), aconsejado: Number(f.aconsejado), techo: Number(f.techo) };
    }
    return {
      pais,
      moneda: reglaFila.moneda,
      modo: reglaFila.modoPrecio,
      regla: {
        zonaHoraria: reglaFila.zonaHoraria,
        inicioDiurno: reglaFila.inicioDiurno,
        finDiurno: reglaFila.finDiurno,
        domingoNocturno: reglaFila.domingoNocturno,
        feriadoNocturno: reglaFila.feriadoNocturno,
        feriados: feriados.map((f) => f.fecha),
      },
      tarifas,
      config,
    };
  }

  // Precio de un veterinario en un instante. La franja se decide con la hora
  // local DEL VETERINARIO (su zona horaria), con la ventana y los feriados de
  // su país. Puro: no toca la base.
  calcular(ctx: ContextoPrecios, vet: PreciosDeVeterinario, hayUrgencia: boolean, instante: Date): PrecioCalculado {
    const franja = franjaEnZona(instante, { ...ctx.regla, zonaHoraria: vet.zonaHoraria || ctx.regla.zonaHoraria });
    const clave = claveTarifa(hayUrgencia ? "URGENCIA" : "NORMAL", franja);
    const honorario = precioEfectivo(ctx.tarifas[clave], aNumero(vet[CAMPO_DE_CLAVE[clave]]), ctx.modo);
    const minimo = franja === "DIURNA" ? ctx.config.cargoPlataformaDiurna : ctx.config.cargoPlataformaNocturna;
    const cargo = cargoPlataformaPorcentual(honorario, ctx.config.porcentajePlataforma, minimo);
    return { franja, honorario, cargo, total: honorario + cargo };
  }

  // Franja "ahora" para un país (la usa crear() del caso, antes de elegir
  // veterinario). Reemplaza la hora del servidor, que en Render es UTC.
  async franjaAhoraDe(pais: string, instante = new Date()): Promise<FranjaHoraria> {
    const ctx = await this.contexto(pais);
    return franjaEnZona(instante, ctx.regla);
  }

  // -------------------------------------------------------------------------
  // Veterinario
  // -------------------------------------------------------------------------

  async misPrecios(veterinarioId: string): Promise<MisPreciosVeterinario> {
    const vet = await this.prisma.veterinario.findUniqueOrThrow({ where: { id: veterinarioId } });
    const ctx = await this.contexto(vet.pais);
    const ahora = new Date();
    return {
      modo: ctx.modo,
      moneda: ctx.moneda,
      zonaHoraria: vet.zonaHoraria,
      porcentajePlataforma: ctx.config.porcentajePlataforma,
      cargoMinimoDiurno: ctx.config.cargoPlataformaDiurna,
      cargoMinimoNocturno: ctx.config.cargoPlataformaNocturna,
      franjaAhora: franjaEnZona(ahora, { ...ctx.regla, zonaHoraria: vet.zonaHoraria }),
      celdas: CLAVES_TARIFA.map((clave) => {
        const propio = aNumero(vet[CAMPO_DE_CLAVE[clave]]);
        return { clave, ...ctx.tarifas[clave], propio, efectivo: precioEfectivo(ctx.tarifas[clave], propio, ctx.modo) };
      }),
      aviso: {
        version: VERSION_AVISO_PRECIOS,
        texto: TEXTO_AVISO_PRECIOS,
        aceptado: vet.avisoPreciosVersion === VERSION_AVISO_PRECIOS && vet.avisoPreciosAceptadoEl != null,
      },
    };
  }

  async aceptarAviso(veterinarioId: string, version: string) {
    if (version !== VERSION_AVISO_PRECIOS) {
      throw new BadRequestException("El texto del aviso cambió — volvé a abrirlo y leelo de nuevo");
    }
    await this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: { avisoPreciosVersion: VERSION_AVISO_PRECIOS, avisoPreciosAceptadoEl: new Date() },
    });
    return this.misPrecios(veterinarioId);
  }

  // Cada valor: un número, o null para volver al aconsejado. Qué se acepta
  // depende del modo del país:
  //  - FIJO: no se acepta ningún precio propio.
  //  - BANDA: solo dentro de piso–techo (fuera se rechaza).
  //  - LIBRE: cualquier precio razonable; fuera de la zona sugerida se pide
  //    confirmar (`confirmar: true`) y queda asentado que el veterinario lo
  //    confirmó. Hay un tope técnico contra errores de tipeo.
  // Nunca se "arregla" en silencio un precio: el veterinario tiene que saber
  // cuál quedó.
  async guardarMisPrecios(veterinarioId: string, cambios: Partial<Record<ClaveTarifa, number | null>>, confirmar = false) {
    const vet = await this.prisma.veterinario.findUniqueOrThrow({ where: { id: veterinarioId } });
    if (!(vet.avisoPreciosVersion === VERSION_AVISO_PRECIOS && vet.avisoPreciosAceptadoEl)) {
      throw new BadRequestException("Antes de poner tu precio tenés que leer y aceptar el aviso");
    }
    const ctx = await this.contexto(vet.pais);
    const data: Prisma.VeterinarioUpdateInput = {};
    const fueraDeZona: string[] = [];
    const guardados: Partial<Record<ClaveTarifa, number | null>> = {};
    for (const [clave, valor] of Object.entries(cambios)) {
      if (!(CLAVES_TARIFA as string[]).includes(clave)) throw new BadRequestException(`Precio desconocido: ${clave}`);
      const celda = ctx.tarifas[clave as ClaveTarifa];
      if (valor !== null) {
        if (typeof valor !== "number") throw new BadRequestException("El precio tiene que ser un número");
        const r = validarPrecioPropio(celda, valor, ctx.modo);
        if (r.estado === "rechazado") throw new BadRequestException(r.motivo);
        if (r.estado === "pide_confirmacion") fueraDeZona.push(clave);
      }
      guardados[clave as ClaveTarifa] = valor === null ? null : Math.round(valor);
      data[CAMPO_DE_CLAVE[clave as ClaveTarifa]] = guardados[clave as ClaveTarifa];
    }
    if (fueraDeZona.length > 0 && !confirmar) {
      throw new ConflictException(
        "Hay precios fuera de la zona sugerida. Es tu decisión como profesional independiente; confirmá para guardarlos.",
      );
    }
    await this.prisma.veterinario.update({ where: { id: veterinarioId }, data });
    // Queda asentado quién fijó qué precio y si confirmó salirse de la zona
    // sugerida: es la evidencia de que el precio lo decide el profesional.
    await this.registrar(veterinarioId, `Veterinario fijó sus precios (${ctx.modo})${fueraDeZona.length ? " — confirmó precios fuera de la zona sugerida" : ""}`, {}, { guardados, fueraDeZona });
    return this.misPrecios(veterinarioId);
  }

  // -------------------------------------------------------------------------
  // Dueño (admin)
  // -------------------------------------------------------------------------

  private validarPais(pais: unknown): string {
    if (typeof pais !== "string" || !PAIS_RE.test(pais)) throw new BadRequestException("País inválido (código de 2 letras, ej. AR)");
    return pais;
  }

  private async registrar(actorId: string, resumen: string, antes: unknown, despues: unknown) {
    await this.prisma.cambioPrecios.create({
      data: { actorId, resumen, antes: antes as Prisma.InputJsonValue, despues: despues as Prisma.InputJsonValue },
    });
  }

  async panel(paisEntrada: string) {
    const pais = this.validarPais(paisEntrada);
    const ctx = await this.contexto(pais);
    const feriados = await this.prisma.feriado.findMany({ where: { pais }, orderBy: { fecha: "asc" } });
    const hoy = new Date().toISOString().slice(0, 10);
    return {
      pais,
      moneda: ctx.moneda,
      modo: ctx.modo,
      regla: { ...ctx.regla, feriados: undefined },
      tarifas: ctx.tarifas,
      porcentajePlataforma: ctx.config.porcentajePlataforma,
      cargoMinimoDiurno: ctx.config.cargoPlataformaDiurna,
      cargoMinimoNocturno: ctx.config.cargoPlataformaNocturna,
      feriados,
      // Aviso para el panel: sin feriados futuros cargados, un feriado se
      // cobraría como día común.
      faltanFeriadosFuturos: !feriados.some((f) => f.fecha > hoy),
    };
  }

  async guardarTarifas(actorId: string, paisEntrada: string, cambios: Partial<Record<ClaveTarifa, TarifaCelda>>) {
    const pais = this.validarPais(paisEntrada);
    const ctx = await this.contexto(pais);
    const antes: Partial<TarifasPais> = {};
    const despues: Partial<TarifasPais> = {};
    for (const [clave, celda] of Object.entries(cambios)) {
      if (!(CLAVES_TARIFA as string[]).includes(clave)) throw new BadRequestException(`Precio desconocido: ${clave}`);
      const motivo = motivoCeldaInvalida(celda);
      if (motivo) throw new BadRequestException(`${clave}: ${motivo}`);
      antes[clave as ClaveTarifa] = ctx.tarifas[clave as ClaveTarifa];
      despues[clave as ClaveTarifa] = { piso: Math.round(celda.piso), aconsejado: Math.round(celda.aconsejado), techo: Math.round(celda.techo) };
    }
    await this.aplicarCeldas(pais, despues);
    await this.registrar(actorId, `Tarifas ${pais} editadas por número`, antes, despues);
    return this.panel(pais);
  }

  // Sube o baja un % todas las bandas (o las que se indiquen). Con
  // aplicar=false solo muestra cómo quedaría.
  async ajustePorcentual(actorId: string, paisEntrada: string, porcentaje: number, claves: ClaveTarifa[] | undefined, aplicar: boolean) {
    const pais = this.validarPais(paisEntrada);
    if (typeof porcentaje !== "number" || !Number.isFinite(porcentaje) || porcentaje <= -90 || porcentaje > 500) {
      throw new BadRequestException("El porcentaje tiene que ser un número entre −90 y 500");
    }
    const elegidas = claves?.length ? claves : CLAVES_TARIFA;
    for (const c of elegidas) if (!(CLAVES_TARIFA as string[]).includes(c)) throw new BadRequestException(`Precio desconocido: ${c}`);
    const ctx = await this.contexto(pais);
    const antes: Partial<TarifasPais> = {};
    const despues: Partial<TarifasPais> = {};
    for (const c of elegidas) {
      antes[c] = ctx.tarifas[c];
      despues[c] = ajustarCeldaPorPorcentaje(ctx.tarifas[c], porcentaje);
      const motivo = motivoCeldaInvalida(despues[c]!);
      if (motivo) throw new BadRequestException(`${c}: ${motivo}`);
    }
    if (!aplicar) return { antes, despues, aplicado: false };
    await this.aplicarCeldas(pais, despues);
    await this.registrar(actorId, `Tarifas ${pais} ajustadas ${porcentaje > 0 ? "+" : ""}${porcentaje} %`, antes, despues);
    return { antes, despues, aplicado: true };
  }

  private async aplicarCeldas(pais: string, celdas: Partial<TarifasPais>) {
    await this.prisma.$transaction(
      (Object.entries(celdas) as Array<[ClaveTarifa, TarifaCelda]>).map(([clave, c]) => {
        const [tipo, franja] = clave.split("_") as [TipoConsulta, FranjaHoraria];
        return this.prisma.tarifaPais.update({
          where: { pais_tipo_franja: { pais, tipo, franja } },
          data: { piso: c.piso, aconsejado: c.aconsejado, techo: c.techo },
        });
      }),
    );
  }

  // Cambia cómo se fijan los precios en un país. Los precios que cada
  // veterinario ya guardó no se tocan: el modo decide cuáles rigen (por eso
  // volver a un modo anterior los recupera tal como estaban).
  async guardarModo(actorId: string, paisEntrada: string, modo: ModoPrecio) {
    const pais = this.validarPais(paisEntrada);
    if (!MODOS_PRECIO.includes(modo)) throw new BadRequestException("Modo de precios inválido");
    const actual = await this.prisma.reglaPais.findUnique({ where: { pais } });
    if (!actual) throw new BadRequestException(`El país ${pais} todavía no está configurado`);
    if (actual.modoPrecio !== modo) {
      await this.prisma.reglaPais.update({ where: { pais }, data: { modoPrecio: modo } });
      await this.registrar(actorId, `Modo de precios ${pais}: ${actual.modoPrecio} → ${modo}`, { modo: actual.modoPrecio }, { modo });
    }
    return this.panel(pais);
  }

  async guardarComision(actorId: string, cambios: { porcentajePlataforma?: number; cargoMinimoDiurno?: number; cargoMinimoNocturno?: number }) {
    const antes = await this.configuracion.obtener();
    if (cambios.porcentajePlataforma !== undefined) {
      const p = cambios.porcentajePlataforma;
      if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 50) {
        throw new BadRequestException("El porcentaje de la plataforma tiene que estar entre 0 y 50");
      }
    }
    const despues = await this.configuracion.actualizar({
      porcentajePlataforma: cambios.porcentajePlataforma,
      cargoPlataformaDiurna: cambios.cargoMinimoDiurno,
      cargoPlataformaNocturna: cambios.cargoMinimoNocturno,
    });
    await this.registrar(
      actorId,
      "Comisión de la plataforma editada",
      { porcentajePlataforma: antes.porcentajePlataforma, minimoDiurno: antes.cargoPlataformaDiurna, minimoNocturno: antes.cargoPlataformaNocturna },
      { porcentajePlataforma: despues.porcentajePlataforma, minimoDiurno: despues.cargoPlataformaDiurna, minimoNocturno: despues.cargoPlataformaNocturna },
    );
    return this.panel("AR");
  }

  async guardarRegla(
    actorId: string,
    paisEntrada: string,
    cambios: { inicioDiurno?: string; finDiurno?: string; domingoNocturno?: boolean; feriadoNocturno?: boolean },
  ) {
    const pais = this.validarPais(paisEntrada);
    const actual = await this.prisma.reglaPais.findUnique({ where: { pais } });
    if (!actual) throw new BadRequestException(`El país ${pais} todavía no está configurado`);
    const inicio = cambios.inicioDiurno ?? actual.inicioDiurno;
    const fin = cambios.finDiurno ?? actual.finDiurno;
    if (!HORA_RE.test(inicio) || !HORA_RE.test(fin)) throw new BadRequestException("Las horas tienen que tener formato HH:MM");
    if (inicio >= fin) throw new BadRequestException("La hora de inicio del día tiene que ser anterior a la de fin");
    const despues = await this.prisma.reglaPais.update({
      where: { pais },
      data: {
        inicioDiurno: inicio,
        finDiurno: fin,
        domingoNocturno: cambios.domingoNocturno ?? actual.domingoNocturno,
        feriadoNocturno: cambios.feriadoNocturno ?? actual.feriadoNocturno,
      },
    });
    await this.registrar(actorId, `Ventana día/noche ${pais} editada`, actual, despues);
    return this.panel(pais);
  }

  async agregarFeriado(actorId: string, paisEntrada: string, fecha: string, nombre: string) {
    const pais = this.validarPais(paisEntrada);
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) || new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha) {
      throw new BadRequestException("La fecha tiene que ser real y con formato AAAA-MM-DD");
    }
    const limpio = typeof nombre === "string" ? nombre.trim().slice(0, 120) : "";
    if (!limpio) throw new BadRequestException("Falta el nombre del feriado");
    await this.prisma.feriado.upsert({
      where: { pais_fecha: { pais, fecha } },
      update: { nombre: limpio },
      create: { pais, fecha, nombre: limpio },
    });
    await this.registrar(actorId, `Feriado agregado ${pais} ${fecha}`, {}, { fecha, nombre: limpio });
    return this.panel(pais);
  }

  async quitarFeriado(actorId: string, id: string) {
    const f = await this.prisma.feriado.findUnique({ where: { id } });
    if (!f) throw new BadRequestException("Feriado no encontrado");
    await this.prisma.feriado.delete({ where: { id } });
    await this.registrar(actorId, `Feriado quitado ${f.pais} ${f.fecha}`, { fecha: f.fecha, nombre: f.nombre }, {});
    return this.panel(f.pais);
  }

  async historial(limite = 50) {
    return this.prisma.cambioPrecios.findMany({ orderBy: { creadoEl: "desc" }, take: Math.min(Math.max(limite, 1), 200) });
  }
}
