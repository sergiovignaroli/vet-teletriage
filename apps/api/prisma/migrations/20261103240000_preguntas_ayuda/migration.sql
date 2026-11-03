-- CreateTable
CREATE TABLE "PreguntaAyuda" (
    "id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "respuesta" TEXT,
    "atendidaEl" TIMESTAMP(3),
    "atendidaPorAdminId" TEXT,
    "creadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreguntaAyuda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreguntaAyuda_usuarioId_idx" ON "PreguntaAyuda"("usuarioId");

-- CreateIndex
CREATE INDEX "PreguntaAyuda_atendidaEl_creadaEl_idx" ON "PreguntaAyuda"("atendidaEl", "creadaEl");
