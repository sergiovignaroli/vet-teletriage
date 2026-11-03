"use client";

// Las especies que atiende el veterinario, editables desde su panel (Sergio,
// 2026-11-03). Si es un alta anterior a este dato todavía no las declaró: se le
// pide que las confirme (mientras tanto se lo trata como perros y gatos).
import { useEffect, useState } from "react";
import { apiGet, apiPatch, ApiError } from "../lib/api";
import { SelectorEspecies } from "./SelectorEspecies";

export function MisEspecies({ token }: { token: string }) {
  const [especies, setEspecies] = useState<string[]>([]);
  const [guardadas, setGuardadas] = useState<string[]>([]);
  const [declaradas, setDeclaradas] = useState<boolean | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelado = false;
    apiGet<{ especies: string[]; declaradas: boolean }>("/veterinarios/mis-especies", token)
      .then((r) => {
        if (cancelado) return;
        setEspecies(r.especies);
        setGuardadas(r.especies);
        setDeclaradas(r.declaradas);
        setAbierto(!r.declaradas);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function guardar() {
    setError(null);
    setOk(false);
    setGuardando(true);
    try {
      const r = await apiPatch<{ especies: string[] }>("/veterinarios/especies", token, { especies });
      setGuardadas(r.especies);
      setDeclaradas(true);
      setOk(true);
      setAbierto(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (declaradas === null) return null;
  const sinCambios = especies.length === guardadas.length && especies.every((e) => guardadas.includes(e));

  return (
    <section className="va-tarjeta" style={{ padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 className="va-etiqueta" style={{ margin: 0 }}>
          Especies que atendés
        </h2>
        {!abierto && (
          <button type="button" className="va-chip-boton" onClick={() => setAbierto(true)}>
            Cambiar
          </button>
        )}
      </div>
      {!declaradas && (
        <p style={{ fontSize: 13.5, color: "var(--terracota)", margin: "8px 0 0", fontWeight: 600 }}>
          Confirmá qué especies atendés. Hasta que lo hagas te llegan consultas de perros y gatos.
        </p>
      )}
      {!abierto && declaradas && (
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "8px 0 0" }}>
          {guardadas.length} {guardadas.length === 1 ? "especie" : "especies"} marcadas. Solo te llegan consultas de esas especies.
        </p>
      )}
      {abierto && (
        <div style={{ marginTop: 12 }}>
          <SelectorEspecies valor={especies} onChange={setEspecies} idBase="mis-esp" />
          {error && (
            <p style={{ color: "var(--terracota)", fontSize: 13, marginTop: 10 }} role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="va-boton"
            onClick={guardar}
            disabled={guardando || especies.length === 0 || (declaradas && sinCambios)}
            style={{ marginTop: 14 }}
          >
            {guardando ? "Guardando…" : "Guardar especies"}
          </button>
        </div>
      )}
      {ok && !abierto && (
        <p role="status" style={{ fontSize: 13, color: "var(--esmeralda)", fontWeight: 700, margin: "8px 0 0" }}>
          Listo, guardamos tus especies.
        </p>
      )}
    </section>
  );
}
