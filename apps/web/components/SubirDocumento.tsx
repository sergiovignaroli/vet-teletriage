"use client";

// Un documento para subir (identidad, título, matrícula/habilitación). Se saca
// la foto con el celular o se elige una imagen; se reduce en el navegador y se
// muestra una miniatura. Simple a propósito: un solo botón por documento.
import { useId, useRef, useState } from "react";
import { reducirDocumento } from "../lib/imagen";

interface Props {
  etiqueta: string;
  ayuda?: string;
  opcional?: boolean;
  valor: string | null;
  onChange: (imagen: string | null) => void;
  // Mensaje en rojo (por ejemplo "Falta este documento"). Si hay, el recuadro se marca.
  error?: string;
  deshabilitado?: boolean;
  id?: string;
}

export function SubirDocumento({ etiqueta, ayuda, opcional, valor, onChange, error, deshabilitado, id }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const auto = useId();
  const idCampo = id ?? `doc-${auto.replace(/:/g, "")}`;
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const mensaje = errorLocal ?? error;

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorLocal(null);
    if (!archivo.type.startsWith("image/")) {
      setErrorLocal("Elegí una imagen (foto JPG o PNG). Si tenés un PDF, sacale una captura o una foto.");
      return;
    }
    setProcesando(true);
    try {
      onChange(await reducirDocumento(archivo));
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "No pudimos procesar la imagen.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div
      id={idCampo}
      data-campo-error={mensaje ? "1" : undefined}
      className={`va-doc${mensaje ? " va-doc-error" : ""}`}
      tabIndex={-1}
    >
      <div className="va-doc-miniatura" aria-hidden={!valor}>
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={valor} alt={`Vista previa: ${etiqueta}`} />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {etiqueta}
          {opcional && <span style={{ fontWeight: 400, color: "var(--muted)" }}> (opcional)</span>}
        </div>
        {ayuda && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "2px 0 8px", lineHeight: 1.4 }}>{ayuda}</p>}
        <input ref={ref} type="file" accept="image/*" onChange={elegir} hidden aria-label={etiqueta} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="va-chip-boton" onClick={() => ref.current?.click()} disabled={procesando || deshabilitado}>
            {procesando ? "Procesando…" : valor ? "Cambiar" : "Sacar foto o elegir imagen"}
          </button>
          {valor && !deshabilitado && (
            <button type="button" className="va-chip-boton" onClick={() => onChange(null)}>
              Quitar
            </button>
          )}
        </div>
        {mensaje && (
          <p role="alert" className="va-error-texto">
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}
