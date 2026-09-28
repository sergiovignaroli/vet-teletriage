-- CreateEnum
CREATE TYPE "EstadoVeterinario" AS ENUM ('PENDIENTE_VERIFICACION', 'HABILITADO', 'SUSPENDIDO_MATRICULA_VENCIDA', 'SUSPENDIDO_SEGURO_VENCIDO', 'SUSPENDIDO_DISPUTA_IDENTIDAD', 'SUSPENDIDO_INCUMPLIMIENTO', 'DESVINCULADO');

-- CreateEnum
CREATE TYPE "MedioDeCobroVeterinario" AS ENUM ('MERCADO_PAGO', 'PAYONEER');

-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('INTAKE', 'BANDERA_ROJA_MOSTRADA', 'ASIGNADO', 'EN_SESION', 'CERRADO', 'CANCELADO_FALLA_PLATAFORMA');

-- CreateEnum
CREATE TYPE "FranjaHoraria" AS ENUM ('DIURNA', 'NOCTURNA');

-- CreateEnum
CREATE TYPE "ClasificacionCierre" AS ENUM ('RESUELTO_POR_ORIENTACION', 'DERIVADO_A_EMERGENCIA', 'NO_COMPLETADO');

-- CreateEnum
CREATE TYPE "ResultadoVerificacion" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'INCONSISTENTE');

-- CreateEnum
CREATE TYPE "MedioDeCobroCliente" AS ENUM ('MERCADO_PAGO', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('AUTORIZADO', 'CAPTURADO', 'REEMBOLSADO_PARCIAL', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoDisputa" AS ENUM ('ABIERTA', 'EN_REVISION', 'RESUELTA');

-- CreateTable
CREATE TABLE "Veterinario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "passwordHash" TEXT NOT NULL,
    "dniONumero" TEXT NOT NULL,
    "matriculaNumero" TEXT NOT NULL,
    "matriculaColegio" TEXT NOT NULL,
    "matriculaVenceEl" TIMESTAMP(3) NOT NULL,
    "seguroAseguradora" TEXT NOT NULL,
    "seguroPoliza" TEXT NOT NULL,
    "seguroVenceEl" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoVeterinario" NOT NULL DEFAULT 'PENDIENTE_VERIFICACION',
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "medioDeCobro" "MedioDeCobroVeterinario" NOT NULL DEFAULT 'MERCADO_PAGO',
    "mercadoPagoOAuthId" TEXT,
    "mercadoPagoAccessToken" TEXT,
    "mercadoPagoRefreshToken" TEXT,
    "mercadoPagoTokenVenceEl" TIMESTAMP(3),
    "payoneerEmail" TEXT,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Veterinario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT,
    "email" TEXT,
    "telefono" TEXT NOT NULL,
    "paisDePago" TEXT,
    "otpCodeHash" TEXT,
    "otpExpiraEl" TIMESTAMP(3),
    "otpIntentos" INTEGER NOT NULL DEFAULT 0,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caso" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veterinarioId" TEXT,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'INTAKE',
    "franjaHoraria" "FranjaHoraria" NOT NULL,
    "honorarioDeclarado" DECIMAL(10,2) NOT NULL,
    "cargoPlataforma" DECIMAL(10,2) NOT NULL,
    "grabacionUrl" TEXT,
    "grabacionExpiraEl" TIMESTAMP(3),
    "iniciadoEl" TIMESTAMP(3),
    "finalizadoEl" TIMESTAMP(3),
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeFormulario" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "dificultadRespiratoria" BOOLEAN NOT NULL DEFAULT false,
    "inconsciente" BOOLEAN NOT NULL DEFAULT false,
    "sangradoActivo" BOOLEAN NOT NULL DEFAULT false,
    "sospechaIngestaToxico" BOOLEAN NOT NULL DEFAULT false,
    "convulsionEnCurso" BOOLEAN NOT NULL DEFAULT false,
    "noPuedeParseCaminar" BOOLEAN NOT NULL DEFAULT false,
    "distensionAbdominal" BOOLEAN NOT NULL DEFAULT false,
    "traumatismoMayor" BOOLEAN NOT NULL DEFAULT false,
    "especie" TEXT NOT NULL,
    "raza" TEXT,
    "edadAproximada" TEXT,
    "pesoAproximadoKg" DOUBLE PRECISION,
    "motivoConsulta" TEXT NOT NULL,
    "tiempoEvolucion" TEXT,
    "medicacionActual" TEXT,
    "antecedentes" TEXT,
    "fotosUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "completadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeFormulario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreCaso" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "clasificacion" "ClasificacionCierre" NOT NULL,
    "notas" TEXT,
    "registradoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreCaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificacionIdentidad" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "casoId" TEXT,
    "resultado" "ResultadoVerificacion" NOT NULL DEFAULT 'PENDIENTE',
    "proveedor" TEXT NOT NULL DEFAULT 'truora',
    "proveedorRefId" TEXT,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificacionIdentidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "medioDeCobro" "MedioDeCobroCliente" NOT NULL,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "montoHonorarioVet" DECIMAL(10,2) NOT NULL,
    "montoCargoPlataforma" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'AUTORIZADO',
    "mercadoPagoPaymentId" TEXT,
    "paypalOrderId" TEXT,
    "paypalPayoutId" TEXT,
    "autorizadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturadoEl" TIMESTAMP(3),
    "reembolsadoEl" TIMESTAMP(3),
    "montoReembolsado" DECIMAL(10,2),

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputaIdentidad" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoDisputa" NOT NULL DEFAULT 'ABIERTA',
    "resolucion" TEXT,
    "abiertaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEl" TIMESTAMP(3),

    CONSTRAINT "DisputaIdentidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputaCalidad" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoDisputa" NOT NULL DEFAULT 'ABIERTA',
    "resolucion" TEXT,
    "abiertaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEl" TIMESTAMP(3),

    CONSTRAINT "DisputaCalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "estrellas" INTEGER NOT NULL,
    "comentario" TEXT,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntoPremio" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuntoPremio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Veterinario_email_key" ON "Veterinario"("email");

-- CreateIndex
CREATE INDEX "Veterinario_disponible_latitud_longitud_idx" ON "Veterinario"("disponible", "latitud", "longitud");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefono_key" ON "Cliente"("telefono");

-- CreateIndex
CREATE INDEX "Caso_veterinarioId_estado_idx" ON "Caso"("veterinarioId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeFormulario_casoId_key" ON "IntakeFormulario"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "CierreCaso_casoId_key" ON "CierreCaso"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificacionIdentidad_casoId_key" ON "VerificacionIdentidad"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_casoId_key" ON "Pago"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "DisputaCalidad_casoId_key" ON "DisputaCalidad"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_casoId_key" ON "Calificacion"("casoId");

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeFormulario" ADD CONSTRAINT "IntakeFormulario_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreCaso" ADD CONSTRAINT "CierreCaso_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionIdentidad" ADD CONSTRAINT "VerificacionIdentidad_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacionIdentidad" ADD CONSTRAINT "VerificacionIdentidad_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputaIdentidad" ADD CONSTRAINT "DisputaIdentidad_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputaCalidad" ADD CONSTRAINT "DisputaCalidad_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuntoPremio" ADD CONSTRAINT "PuntoPremio_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
