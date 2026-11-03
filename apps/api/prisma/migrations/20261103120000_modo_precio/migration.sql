-- Modo de precios por país (aditivo). LIBRE: el veterinario elige su precio y la
-- banda piso/techo es una zona sugerida. El dueño puede pasar a BANDA o FIJO
-- desde el panel en cualquier momento, sin tocar código.
CREATE TYPE "ModoPrecio" AS ENUM ('FIJO', 'BANDA', 'LIBRE');
ALTER TABLE "ReglaPais" ADD COLUMN "modoPrecio" "ModoPrecio" NOT NULL DEFAULT 'LIBRE';
