"use client";

// Aviso del panel del veterinario cuando todavía no subió su documentación
// (identidad, título, matrícula/habilitación): cubre a quien se registró antes
// de que se pidiera y a quien no pudo subir alguna foto al registrarse.
// Cada imagen se sube apenas se elige. Cuando no falta nada, no muestra nada.
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut, ApiError } from "../lib/api";
import { SubirDocumento } from "./SubirDocumento";

type Tipo = "DOCUMENTO_FRENTE" | "DOCUMENTO_DORSO" | "TITULO" | "HABILITACION";

const TEXTOS: Record<Tipo, { etiqueta: string; ayuda: string }> = {
  DOCUMENTO_FRENTE: { etiqueta: "DNI o pasaporte (frente)", ayuda: "Que se lea bien y se vea completo." },
  DOCUMENTO_DORSO: { etiqueta: "DNI (dorso)", ayuda: "Solo si es DNI." },
  TITULO: { etiqueta: "Título habilitante", ayuda: "Foto del título de Médico Veterinario." },
  HABILITACION: {
    etiqueta: "Carnet del Colegio de Médicos Veterinarios o certificado de habilitación",
    ayuda: "El que tengas: alcanza con uno.",
  },
};

export function DocumentacionVeterinario({ token }: { token: string }) {
  const [faltan, setFaltan] = useState<Tipo[] | null>(null);
  const [errores, setErrores] = useState<Partial<Record<Tipo, string>>>({});
  const [enviando, setEnviando] = useState<Tipo | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await apiGet<{ cargados: Tipo[]; faltan: Tipo[] }>("/veterinarios/documentos/mios", token);
      setFaltan(r.faltan);
    } catch {
      setFaltan([]); // si no se puede consultar, no se molesta con un aviso falso
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function subir(tipo: Tipo, imagen: string | null) {
    if (!imagen) return;
    setEnviando(tipo);
    setErrores((e) => ({ ...e, [tipo]: undefined }));
    try {
      await apiPut(`/veterinarios/documentos/${tipo}`, token, { imagen });
      await cargar();
    } catch (e) {
      setErrores((x) => ({ ...x, [tipo]: e instanceof ApiError ? e.message : "No pudimos subir la imagen. Probá de nuevo." }));
    } finally {
      setEnviando(null);
    }
  }

  if (!faltan || faltan.length === 0) return null;

  return (
    <div className="va-tarjeta" style={{ padding: 16, marginBottom: 12, borderColor: "var(--alerta-borde)" }}>
      <div className="va-etiqueta" style={{ color: "var(--alerta)" }}>Falta tu documentación</div>
      <p style={{ fontSize: 14, margin: "6px 0 4px", lineHeight: 1.5 }}>
        Para habilitarte necesitamos ver estos documentos. Sacale una foto con el celular o subí una imagen: solo la ve nuestro equipo.
      </p>
      {faltan.map((t) => (
        <SubirDocumento
          key={t}
          id={`doc-panel-${t}`}
          etiqueta={TEXTOS[t].etiqueta}
          ayuda={TEXTOS[t].ayuda}
          valor={null}
          onChange={(img) => subir(t, img)}
          deshabilitado={enviando !== null}
          error={errores[t]}
        />
      ))}
    </div>
  );
}
