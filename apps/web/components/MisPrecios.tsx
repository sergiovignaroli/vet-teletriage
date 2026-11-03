"use client";

// Precios propios del veterinario (Sergio, 2026-11-03). Cuatro precios —
// consulta normal y urgencia, diurno y nocturno— dentro de la banda que
// define la plataforma. Antes de poner el propio, el veterinario lee y acepta
// un aviso sobre qué tipo de servicio es (solo lo ve él, nunca el tutor).
// El texto del aviso viene del servidor: no está escrito acá.
import { useCallback, useEffect, useState } from "react";
import { cargoPlataformaPorcentual } from "@vet-teletriage/types";
import type { ClaveTarifa, MisPreciosVeterinario } from "@vet-teletriage/types";
import { apiGet, apiPostAuth, apiPut, ApiError } from "../lib/api";

const GRUPOS: Array<{ titulo: string; ayuda: string; claves: Array<{ clave: ClaveTarifa; etiqueta: string }> }> = [
  {
    titulo: "Orientación normal",
    ayuda: "Consultas sin señales de emergencia.",
    claves: [
      { clave: "NORMAL_DIURNA", etiqueta: "Diurno" },
      { clave: "NORMAL_NOCTURNA", etiqueta: "Nocturno (noche, domingos y feriados)" },
    ],
  },
  {
    titulo: "Urgencia",
    ayuda: "Consultas con alguna señal de emergencia.",
    claves: [
      { clave: "URGENCIA_DIURNA", etiqueta: "Diurno" },
      { clave: "URGENCIA_NOCTURNA", etiqueta: "Nocturno (noche, domingos y feriados)" },
    ],
  },
];

const moneda = (n: number) => `$${n.toLocaleString("es-AR")}`;

export function MisPrecios({ token }: { token: string }) {
  const [datos, setDatos] = useState<MisPreciosVeterinario | null>(null);
  const [valores, setValores] = useState<Partial<Record<ClaveTarifa, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [leyo, setLeyo] = useState(false);

  const aplicar = useCallback((d: MisPreciosVeterinario) => {
    setDatos(d);
    setValores(Object.fromEntries(d.celdas.map((c) => [c.clave, c.propio == null ? "" : String(c.propio)])));
  }, []);

  useEffect(() => {
    let cancelado = false;
    apiGet<MisPreciosVeterinario>("/precios/mis-precios", token)
      .then((d) => !cancelado && aplicar(d))
      .catch((e) => !cancelado && setError(e instanceof ApiError ? e.message : "No pudimos cargar tus precios."));
    return () => {
      cancelado = true;
    };
  }, [token, aplicar]);

  async function aceptarAviso() {
    if (!datos) return;
    setError(null);
    try {
      aplicar(await apiPostAuth<MisPreciosVeterinario>("/precios/mis-precios/aviso", token, { version: datos.aviso.version }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos registrar la aceptación. Probá de nuevo.");
    }
  }

  async function guardar() {
    if (!datos) return;
    setError(null);
    setGuardado(false);
    const cuerpo: Partial<Record<ClaveTarifa, number | null>> = {};
    for (const c of datos.celdas) {
      const texto = (valores[c.clave] ?? "").trim();
      cuerpo[c.clave] = texto === "" ? null : Number(texto);
      if (texto !== "" && !Number.isFinite(Number(texto))) {
        setError("Poné solo números en los precios.");
        return;
      }
    }
    setGuardando(true);
    try {
      aplicar(await apiPut<MisPreciosVeterinario>("/precios/mis-precios", token, cuerpo));
      setGuardado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar tus precios. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const caja: React.CSSProperties = {
    border: "1px solid var(--borde)",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 24,
    background: "var(--card)",
  };

  if (!datos) {
    return (
      <div style={caja}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Tus precios</div>
        <p style={{ fontSize: 12.5, opacity: 0.75, margin: "6px 0 0" }}>{error ?? "Cargando…"}</p>
      </div>
    );
  }

  const aceptado = datos.aviso.aceptado;

  return (
    <div style={caja}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Tus precios</div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 12px" }}>
        Elegís cuánto cobrar dentro del rango. El tutor ve tu precio más un cargo de servicio de la plataforma
        ({datos.porcentajePlataforma} %, con un mínimo). Ahora rige la tarifa{" "}
        <b>{datos.franjaAhora === "NOCTURNA" ? "nocturna" : "diurna"}</b>.
      </p>

      {!aceptado && (
        <div
          style={{
            border: "1px solid var(--alerta-borde)",
            background: "var(--alerta-fondo)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Antes de poner tu precio</div>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: "0 0 10px" }}>{datos.aviso.texto}</p>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
            <input type="checkbox" checked={leyo} onChange={(e) => setLeyo(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Lo leí y lo entiendo.</span>
          </label>
          <button
            type="button"
            className="va-boton"
            style={{ width: "auto", padding: "0 18px", marginTop: 10 }}
            disabled={!leyo}
            onClick={aceptarAviso}
          >
            Aceptar y continuar
          </button>
        </div>
      )}

      {GRUPOS.map((g) => (
        <div key={g.titulo} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{g.titulo}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{g.ayuda}</div>
          {g.claves.map(({ clave, etiqueta }) => {
            const celda = datos.celdas.find((c) => c.clave === clave)!;
            const texto = (valores[clave] ?? "").trim();
            const numero = texto === "" ? celda.aconsejado : Number(texto);
            const fuera = Number.isFinite(numero) && (numero < celda.piso || numero > celda.techo);
            const minimo = clave.endsWith("DIURNA") ? datos.cargoMinimoDiurno : datos.cargoMinimoNocturno;
            const cargo = Number.isFinite(numero) ? cargoPlataformaPorcentual(numero, datos.porcentajePlataforma, minimo) : 0;
            return (
              <div key={clave} style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{etiqueta}</label>
                <input
                  className="va-input"
                  type="number"
                  inputMode="numeric"
                  value={valores[clave] ?? ""}
                  placeholder={`Aconsejado ${celda.aconsejado}`}
                  disabled={!aceptado}
                  onChange={(e) => {
                    setValores((v) => ({ ...v, [clave]: e.target.value }));
                    setGuardado(false);
                  }}
                />
                <div style={{ fontSize: 11.5, color: fuera ? "var(--terracota)" : "var(--muted)", marginTop: 4 }}>
                  Aconsejado {moneda(celda.aconsejado)} · rango {moneda(celda.piso)} a {moneda(celda.techo)}
                  {fuera && " — fuera del rango"}
                </div>
                {!fuera && Number.isFinite(numero) && (
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    El tutor paga {moneda(numero + cargo)}: tu honorario {moneda(numero)} + {moneda(cargo)} de cargo de
                    servicio. Mercado Pago descuenta su propia comisión de tu cobro.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px" }}>
        Si dejás un precio vacío, rige el aconsejado.
      </p>
      <button
        type="button"
        className="va-boton"
        style={{ width: "auto", padding: "0 20px" }}
        onClick={guardar}
        disabled={!aceptado || guardando}
      >
        {guardando ? "…" : "Guardar precios"}
      </button>
      {guardado && <span style={{ fontSize: 12.5, marginLeft: 10 }}>Guardado.</span>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 12.5, marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
