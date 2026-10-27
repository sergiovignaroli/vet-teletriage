# Fotos del sitio

Todas las imágenes las generó Sergio con ChatGPT (27/10/2026). Están en WebP y pesan menos de 100 KB cada una.

| Archivo | Dónde aparece | Qué muestra |
|---|---|---|
| `hero-celular.webp` | Home, arriba (en celular, debajo del título) | Una mujer con su gato en brazos, en una videollamada con un veterinario desde el celular |
| `paso-1.webp` | Home, «Cómo funciona», paso 01 | Celular con preguntas tildadas y un gatito (recorte del collage) |
| `paso-3.webp` | Home, «Cómo funciona», paso 03 | Laptop con perro y veterinario en videollamada (recorte del collage) |
| `de-noche.webp` | Home, franja «¿Se complicó de noche?» | Un hombre con su perro en el sillón, de noche, en videollamada |
| `mascotas.webp` | Directorio de veterinarios, banner superior | Perro, gato, cobayo y periquito juntos |
| `veterinario-escritorio.webp` | «Sumate como veterinario» (registro), banner | Manos de un veterinario en su escritorio durante una videollamada |
| `gato-dormido.webp` | Estados vacíos: directorio sin veterinarios y «Elegí con quién hablar» sin nadie conectado | Gatito dormido sobre un almohadón, con luna (fondo transparente) |
| `../og.jpg` | Imagen al compartir el link (WhatsApp, redes), 1200 × 630 | Gato en el sillón con el texto «Hablá con un veterinario por video» |

El paso 02 del home no lleva foto: es un dibujo propio hecho en código (tres filas con un círculo para elegir), sin caras ni estrellas.

## Imagen para compartir (`og.jpg`)

Se declara solo si el sitio sabe su dirección pública: variable `NEXT_PUBLIC_SITE_URL` (la del dominio propio, cuando exista) o, mientras tanto, la que Render inyecta (`RENDER_EXTERNAL_URL`). Sin ninguna de las dos no se declara, para no publicar una dirección de localhost. Si cambia el texto de la imagen, hay que regenerarla.

## Reglas para cualquier foto que se agregue

- Tiene que ser propia o tener licencia que permita uso comercial. Guardá la licencia o el permiso por escrito.
- Las imágenes generadas con IA que muestren una persona con aspecto de veterinario son **ilustrativas**: el sitio las rotula «Imagen ilustrativa» y no deben acompañarse de un nombre, una matrícula ni un testimonio. Los veterinarios reales de la plataforma se muestran con su foto propia, con su consentimiento y su matrícula verificada.
- No usar imágenes que muestren calificaciones (estrellas) o testimonios de personas que no existen. Por eso no se usó el recorte con tres veterinarios y cinco estrellas.
- Si aparece una persona reconocible real, necesitás su autorización por escrito para usar su imagen.
- Evitar imágenes con íconos o pantallas que sugieran funciones que la plataforma no tiene (agenda de turnos, chat, historia clínica).
- Comprimir antes de subir (idealmente menos de 300 KB) y dejar los originales fuera del repositorio.

Para cambiar una foto, reemplazá el archivo conservando el nombre. El sitio no se rompe si falta: queda un fondo de marca con una huella.
