"use client";

// Administración: las fotos de perfil que cargaron los veterinarios, con la
// opción de quitar una que no corresponda (se ve en el directorio y en la
// lista del tutor, así que alguien tiene que poder revisarla).
import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, ApiError } from "../lib/api";
import { Avatar } from "./Veterinario";

interface FilaFoto {
  id: string;
  nombre: string;
  apellido: string;
  foto: string;
}

export function FotosAdmin({ token }: { token: string }) {
  const [filas, setFilas] = useState<FilaFoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);

  const cargar = useCallback(() => {
    apiGet<FilaFoto[]>("/veterinarios/fotos-admin", token)
      .then(setFilas)
      .catch(() => setFilas([]));
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function quitar(id: string) {
    setError(null);
    setQuitando(id);
    try {
      await apiDelete(`/veterinarios/${id}/foto`, token);
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos quitar la foto.");
    } finally {
      setQuitando(null);
    }
  }

  return (
    <section>
      <h2 className="va-etiqueta" style={{ marginTop: 28, marginBottom: 10 }}>
        Fotos de perfil {filas && `(${filas.length})`}
      </h2>
      {filas && filas.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.75 }}>Ningún veterinario cargó foto todavía.</p>
      )}
      {error && (
        <p role="alert" style={{ color: "var(--terracota)", fontSize: 13 }}>
          {error}
        </p>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {filas?.map((f) => (
          <div key={f.id} className="va-tarjeta" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar nombre={f.nombre} apellido={f.apellido} size={44} foto={f.foto} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
              {f.nombre} {f.apellido}
            </div>
            <button type="button" className="va-chip-boton" onClick={() => quitar(f.id)} disabled={quitando === f.id}>
              {quitando === f.id ? "Quitando…" : "Quitar foto"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
