import { BadRequestException } from "@nestjs/common";
import { IDS_ESPECIES } from "@vet-teletriage/types";

// Valida y limpia la lista de especies que declara un veterinario: al menos una,
// todas del catálogo, sin repetidas. Nunca confiar en lo que llega del front.
export function especiesValidas(entrada: unknown): string[] {
  if (!Array.isArray(entrada) || entrada.length === 0) {
    throw new BadRequestException("Indicá al menos una especie que atendés");
  }
  const limpias = Array.from(new Set(entrada.map((x) => String(x))));
  const invalida = limpias.find((x) => !IDS_ESPECIES.includes(x));
  if (invalida) throw new BadRequestException("Hay una especie que no es válida — elegí de la lista");
  return limpias;
}
