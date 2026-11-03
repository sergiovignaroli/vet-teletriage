"use client";

// Foto de perfil del veterinario (Sergio, 2026-11-03). Se elige un archivo, se
// recorta al centro en cuadrado, se reduce a 320 px y se comprime a JPEG en el
// propio navegador (queda en unos 20-40 KB): no se sube la foto original. La
// foto se ve en el directorio y en la lista que mira el tutor.
import { useRef, useState } from "react";
import { Avatar } from "./Veterinario";

const LADO = 320;
const MAX_CARACTERES = 85_000;

async function reducir(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No pudimos leer esa imagen. Probá con una foto JPG o PNG."));
      i.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const lienzo = document.createElement("canvas");
    lienzo.width = LADO;
    lienzo.height = LADO;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no puede procesar la foto.");
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, LADO, LADO);
    for (const calidad of [0.85, 0.75, 0.65, 0.5]) {
      const dato = lienzo.toDataURL("image/jpeg", calidad);
      if (dato.length <= MAX_CARACTERES) return dato;
    }
    throw new Error("La foto es demasiado pesada. Probá con otra.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  valor: string | null;
  onChange: (foto: string | null) => void;
  nombre: string;
  apellido: string;
  idBase?: string;
  deshabilitado?: boolean;
}

export function SelectorFoto({ valor, onChange, nombre, apellido, idBase = "foto", deshabilitado }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    if (!archivo.type.startsWith("image/")) {
      setError("Elegí una imagen (JPG o PNG).");
      return;
    }
    setProcesando(true);
    try {
      onChange(await reducir(archivo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos procesar la foto.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="va-foto-sel">
      <Avatar nombre={nombre || "?"} apellido={apellido || "?"} size={84} foto={valor} />
      <div style={{ minWidth: 0 }}>
        <input id={`${idBase}-archivo`} ref={ref} type="file" accept="image/*" onChange={elegir} hidden />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="va-chip-boton"
            onClick={() => ref.current?.click()}
            disabled={procesando || deshabilitado}
          >
            {procesando ? "Procesando…" : valor ? "Cambiar foto" : "Elegir foto"}
          </button>
          {valor && (
            <button type="button" className="va-chip-boton" onClick={() => onChange(null)} disabled={deshabilitado}>
              Quitar
            </button>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.45 }}>
          Una foto tuya, de frente y con buena luz. La ven los tutores en la lista, junto a tu nombre.
        </p>
        {error && (
          <p role="alert" style={{ color: "var(--terracota)", fontSize: 13, margin: "6px 0 0" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
