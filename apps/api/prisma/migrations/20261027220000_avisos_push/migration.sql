-- CreateTable
CREATE TABLE "PushSuscripcion" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "creadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSuscripcion_endpoint_key" ON "PushSuscripcion"("endpoint");

-- CreateIndex
CREATE INDEX "PushSuscripcion_veterinarioId_idx" ON "PushSuscripcion"("veterinarioId");

-- AddForeignKey
ALTER TABLE "PushSuscripcion" ADD CONSTRAINT "PushSuscripcion_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
