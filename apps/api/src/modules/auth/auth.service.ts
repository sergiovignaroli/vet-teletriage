import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomInt } from "crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma.service";
import { enviarWhatsApp, normalizarTelefono } from "../../common/whatsapp-cloud-api.util";

const RONDAS_BCRYPT = 12;
const OTP_TTL_MINUTOS = 5;
const OTP_INTENTOS_MAXIMOS = 5;

interface RegistrarVeterinarioInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  dniONumero: string;
  matriculaNumero: string;
  matriculaColegio: string;
  matriculaVenceEl: Date;
  seguroAseguradora: string;
  seguroPoliza: string;
  seguroVenceEl: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // -------------------------------------------------------------------------
  // Veterinarios — email + contraseña (Sección 2 del contrato: el alta pide
  // los mismos datos de habilitación que ya modela Prisma; queda en
  // PENDIENTE_VERIFICACION hasta que Truora apruebe la identidad).
  // -------------------------------------------------------------------------
  async registrarVeterinario(input: RegistrarVeterinarioInput) {
    const yaExiste = await this.prisma.veterinario.findUnique({ where: { email: input.email } });
    if (yaExiste) throw new BadRequestException("Ya existe un veterinario con ese email");

    const passwordHash = await bcrypt.hash(input.password, RONDAS_BCRYPT);

    const veterinario = await this.prisma.veterinario.create({
      data: {
        nombre: input.nombre,
        apellido: input.apellido,
        email: input.email,
        telefono: input.telefono,
        passwordHash,
        dniONumero: input.dniONumero,
        matriculaNumero: input.matriculaNumero,
        matriculaColegio: input.matriculaColegio,
        matriculaVenceEl: input.matriculaVenceEl,
        seguroAseguradora: input.seguroAseguradora,
        seguroPoliza: input.seguroPoliza,
        seguroVenceEl: input.seguroVenceEl,
      },
    });

    return this.emitirToken(veterinario.id, "VETERINARIO", veterinario.tokenVersion, {
      veterinarioId: veterinario.id,
      nombre: veterinario.nombre,
      apellido: veterinario.apellido,
      estado: veterinario.estado,
      disponible: veterinario.disponible,
      margenPorcentaje: veterinario.margenPorcentaje,
      onboardingCompletado: veterinario.onboardingCompletado,
    });
  }

  async loginVeterinario(email: string, password: string) {
    const veterinario = await this.prisma.veterinario.findUnique({ where: { email } });
    // Mismo mensaje de error exista o no el email — no darle a un atacante
    // una forma de enumerar qué emails están registrados.
    if (!veterinario) throw new UnauthorizedException("Credenciales inválidas");

    const passwordValida = await bcrypt.compare(password, veterinario.passwordHash);
    if (!passwordValida) throw new UnauthorizedException("Credenciales inválidas");

    // veterinarioId/nombre/apellido van acá explícitos por el mismo motivo
    // que clienteId en verificarOtpCliente: el JWT no se decodifica en el
    // front, así que si el front necesita el id o el nombre para mostrar
    // algo, tiene que venir en la respuesta.
    return this.emitirToken(veterinario.id, "VETERINARIO", veterinario.tokenVersion, {
      veterinarioId: veterinario.id,
      nombre: veterinario.nombre,
      apellido: veterinario.apellido,
      estado: veterinario.estado,
      disponible: veterinario.disponible,
      margenPorcentaje: veterinario.margenPorcentaje,
      onboardingCompletado: veterinario.onboardingCompletado,
    });
  }

  // Invalida TODOS los JWT de veterinario emitidos hasta ahora (password
  // filtrada, dispositivo perdido, etc.) sin blacklist — sube tokenVersion,
  // y jwt.strategy.ts rechaza cualquier token firmado con un valor anterior.
  async revocarSesionesVeterinario(veterinarioId: string) {
    await this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { revocado: true };
  }

  // -------------------------------------------------------------------------
  // Clientes — OTP por WhatsApp (doc de proveedores: WhatsApp Cloud API ya
  // en uso). El teléfono es el identificador; no hace falta email/nombre
  // para pedir el código, así el flujo de emergencia no tiene fricción.
  // -------------------------------------------------------------------------
  async solicitarOtpCliente(telefonoCrudo: string) {
    const telefono = normalizarTelefono(telefonoCrudo);
    if (telefono.length < 10) {
      throw new BadRequestException("Número de teléfono inválido");
    }

    const codigo = randomInt(100000, 999999).toString();
    const otpCodeHash = await bcrypt.hash(codigo, RONDAS_BCRYPT);
    const otpExpiraEl = new Date(Date.now() + OTP_TTL_MINUTOS * 60 * 1000);

    await this.prisma.cliente.upsert({
      where: { telefono },
      create: { telefono, otpCodeHash, otpExpiraEl, otpIntentos: 0 },
      update: { otpCodeHash, otpExpiraEl, otpIntentos: 0 },
    });

    await enviarWhatsApp({
      telefono,
      texto: `Tu código para ingresar a la plataforma es ${codigo}. Vence en ${OTP_TTL_MINUTOS} minutos. Si no lo pediste vos, ignorá este mensaje.`,
    });

    return { enviado: true, expiraEnMinutos: OTP_TTL_MINUTOS };
  }

  async verificarOtpCliente(telefonoCrudo: string, codigo: string) {
    const telefono = normalizarTelefono(telefonoCrudo);
    const cliente = await this.prisma.cliente.findUnique({ where: { telefono } });

    if (!cliente || !cliente.otpCodeHash || !cliente.otpExpiraEl) {
      throw new UnauthorizedException("Pedí un código nuevo");
    }
    if (cliente.otpIntentos >= OTP_INTENTOS_MAXIMOS) {
      throw new UnauthorizedException("Demasiados intentos fallidos — pedí un código nuevo");
    }
    if (cliente.otpExpiraEl < new Date()) {
      throw new UnauthorizedException("El código venció — pedí uno nuevo");
    }

    const codigoValido = await bcrypt.compare(codigo, cliente.otpCodeHash);
    if (!codigoValido) {
      await this.prisma.cliente.update({
        where: { id: cliente.id },
        data: { otpIntentos: { increment: 1 } },
      });
      throw new UnauthorizedException("Código incorrecto");
    }

    // Éxito: invalidar el código para que no se pueda reusar.
    const actualizado = await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { otpCodeHash: null, otpExpiraEl: null, otpIntentos: 0 },
    });

    return this.emitirToken(cliente.id, "CLIENTE", actualizado.tokenVersion, {
      clienteId: cliente.id,
      onboardingCompletado: actualizado.onboardingCompletado,
    });
  }

  // -------------------------------------------------------------------------
  // Onboarding de producto — recorrido guiado de 3 pantallas la primera vez
  // que se entra a la app (landing/marketing es aparte, esto es dentro del
  // producto). Un solo endpoint para ambos roles: cada uno pega a su propia
  // tabla según el rol que ya viene autenticado en el JWT, nunca a criterio
  // del body (mismo criterio que el resto de la app — ver current-user.decorator.ts).
  // -------------------------------------------------------------------------
  async marcarOnboardingCompletado(usuario: { id: string; rol: "VETERINARIO" | "CLIENTE" | "ADMIN" }) {
    // RolesGuard ya restringe este endpoint a CLIENTE/VETERINARIO (ver
    // auth.controller.ts) — este chequeo es defensivo, no el único filtro.
    if (usuario.rol === "ADMIN") {
      throw new BadRequestException("El onboarding de producto no aplica a cuentas de staff");
    }

    if (usuario.rol === "CLIENTE") {
      await this.prisma.cliente.update({
        where: { id: usuario.id },
        data: { onboardingCompletado: true },
      });
    } else {
      await this.prisma.veterinario.update({
        where: { id: usuario.id },
        data: { onboardingCompletado: true },
      });
    }
    return { onboardingCompletado: true };
  }

  // -------------------------------------------------------------------------
  // Admin — SIN alta pública. registrarAdmin solo se puede llamar detrás de
  // AdminKeyGuard (ver auth.controller.ts): la clave compartida de .env deja
  // de usarse para operar el día a día (eso ahora es JWT + rol ADMIN) y
  // queda reducida a "quién puede crear la primera cuenta de staff".
  // -------------------------------------------------------------------------
  async registrarAdmin(nombre: string, email: string, password: string) {
    const yaExiste = await this.prisma.admin.findUnique({ where: { email } });
    if (yaExiste) throw new BadRequestException("Ya existe un admin con ese email");

    const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
    const admin = await this.prisma.admin.create({ data: { nombre, email, passwordHash } });

    return this.emitirToken(admin.id, "ADMIN", admin.tokenVersion, {});
  }

  async loginAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException("Credenciales inválidas");

    const passwordValida = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValida) throw new UnauthorizedException("Credenciales inválidas");

    return this.emitirToken(admin.id, "ADMIN", admin.tokenVersion, {});
  }

  private emitirToken(
    sub: string,
    rol: "VETERINARIO" | "CLIENTE" | "ADMIN",
    tokenVersion: number,
    extra: Record<string, unknown>,
  ) {
    const accessToken = this.jwt.sign({ sub, rol, tv: tokenVersion });
    return { accessToken, rol, ...extra };
  }
}
