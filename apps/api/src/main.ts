import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás del proxy de Render, sin esto todos los pedidos parecen venir de
  // la misma IP y el límite de intentos castigaría a todos juntos (o a nadie).
  app.set("trust proxy", 1);

  // Cabeceras de seguridad estándar (anti clickjacking, sniffing de tipo de
  // contenido, HSTS, etc.). Es una API JSON: no sirve páginas, así que la
  // política de contenido más estricta no rompe nada.
  app.use(helmet());

  // CORS: solo el sitio web propio puede llamar a la API desde un navegador.
  // CORS_ORIGIN = lista separada por comas (ej: https://videollamadaanimal.com,https://www.videollamadaanimal.com).
  // Si falta, se mantiene el comportamiento anterior (abierto) para no romper
  // el despliegue actual, pero avisa fuerte en el log: hay que configurarla.
  const origenes = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (origenes.length > 0) {
    app.enableCors({ origin: origenes, credentials: false });
  } else {
    // eslint-disable-next-line no-console
    console.warn("[SEGURIDAD] CORS_ORIGIN no está configurada: la API acepta pedidos de cualquier sitio. Configurala en Render.");
    app.enableCors();
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}`);
}

bootstrap();
