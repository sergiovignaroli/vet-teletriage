"use client";

// Tu foto, en el panel del veterinario: se ve, se cambia o se quita.
import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPut, ApiError } from "../lib/api";
import { SelectorFoto } from "./SelectorFoto";

export function MiFoto({ token, nombre, apellido }: { token: string; nombre: string; apellido: string }) {
  const [foto, setFoto] = useState<string | null>(null);
  const [cargada, setCargada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelado = false;
    apiGet<{ foto: string | null }>("/veterinarios/mi-foto", token)
      .then((r) => {
        if (!cancelado) {
          setFoto(r.foto);
          setCargada(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function cambiar(nueva: string | null) {
    setError(null);
    setOk(false);
    setGuardando(true);
    try {
      if (nueva) await apiPut("/veterinarios/foto", token, { foto: nueva });
      else await apiDelete("/veterinarios/foto", token);
      setFoto(nueva);
      setOk(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar la foto. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (!cargada) return null;
  return (
    <section className="va-tarjeta" style={{ padding: "14px 16px", marginBottom: 20 }}>
      <h2 className="va-etiqueta" style={{ margin: "0 0 12px" }}>
        Tu foto
      </h2>
      <SelectorFoto valor={foto} onChange={cambiar} nombre={nombre} apellido={apellido} idBase="mi-foto" deshabilitado={guardando} />
      {error && (
        <p role="alert" style={{ color: "var(--terracota)", fontSize: 13, margin: "8px 0 0" }}>
          {error}
        </p>
      )}
      {ok && !error && (
        <p role="status" style={{ color: "var(--esmeralda)", fontSize: 13, fontWeight: 700, margin: "8px 0 0" }}>
          Listo, guardamos tu foto.
        </p>
      )}
    </section>
  );
}
