// Reduce una foto de documento en el propio navegador (Sergio, 2026-11-06: el
// veterinario no tiene que preocuparse por el peso ni el formato). Lado mayor
// 1600 px, JPEG: queda legible para revisar un DNI o un título y pesa unos
// 200-500 KB. Si igual es muy pesada, se achica más.
const MAX_CARACTERES = 1_200_000; // el servidor acepta hasta 1.3 M de caracteres

export async function reducirDocumento(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No pudimos leer esa imagen. Probá sacando una foto nueva o con un archivo JPG o PNG."));
      i.src = url;
    });
    for (const [ladoMax, calidad] of [
      [1600, 0.8],
      [1600, 0.65],
      [1280, 0.6],
      [1000, 0.55],
    ] as const) {
      const escala = Math.min(1, ladoMax / Math.max(img.naturalWidth, img.naturalHeight));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.max(1, Math.round(img.naturalWidth * escala));
      lienzo.height = Math.max(1, Math.round(img.naturalHeight * escala));
      const ctx = lienzo.getContext("2d");
      if (!ctx) throw new Error("Tu navegador no puede procesar la imagen.");
      ctx.fillStyle = "#fff"; // los PNG con transparencia no quedan negros
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      const dato = lienzo.toDataURL("image/jpeg", calidad);
      if (dato.length <= MAX_CARACTERES) return dato;
    }
    throw new Error("La imagen es demasiado pesada. Probá con otra foto.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
