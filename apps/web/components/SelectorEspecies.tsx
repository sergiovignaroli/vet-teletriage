"use client";

// Casillas de las especies que atiende un veterinario (Sergio, 2026-11-03).
// Se usa en el registro y en el panel del veterinario. Agrupadas para que se
// lea rápido; cada grupo tiene "marcar todo el grupo".
import { ESPECIES, GRUPOS_ESPECIES } from "@vet-teletriage/types";

interface Props {
  valor: string[];
  onChange: (nuevo: string[]) => void;
  idBase?: string;
}

export function SelectorEspecies({ valor, onChange, idBase = "esp" }: Props) {
  function alternar(id: string) {
    onChange(valor.includes(id) ? valor.filter((x) => x !== id) : [...valor, id]);
  }
  function alternarGrupo(ids: string[]) {
    const todas = ids.every((i) => valor.includes(i));
    onChange(todas ? valor.filter((x) => !ids.includes(x)) : Array.from(new Set([...valor, ...ids])));
  }
  return (
    <div className="va-esp">
      {GRUPOS_ESPECIES.map((g) => {
        const items = ESPECIES.filter((e) => e.grupo === g.id);
        const ids = items.map((e) => e.id);
        const todas = ids.every((i) => valor.includes(i));
        return (
          <fieldset key={g.id} className="va-esp-grupo">
            <legend>{g.nombre}</legend>
            <button type="button" className="va-esp-todo" onClick={() => alternarGrupo(ids)}>
              {todas ? "Quitar todas" : "Marcar todas"}
            </button>
            <div className="va-esp-lista">
              {items.map((e) => (
                <label key={e.id} htmlFor={`${idBase}-${e.id}`} className={`va-esp-item${valor.includes(e.id) ? " on" : ""}`}>
                  <input
                    id={`${idBase}-${e.id}`}
                    type="checkbox"
                    checked={valor.includes(e.id)}
                    onChange={() => alternar(e.id)}
                  />
                  <span>
                    <strong>{e.nombre}</strong>
                    {e.ejemplos && <small>{e.ejemplos}</small>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
