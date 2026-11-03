"use client";

// Panel del dueño: tarifas por franja, comisión, ventana día/noche y
// feriados (Sergio, 2026-11-03). Todo se guarda en vivo y cada cambio queda
// en el historial (quién, cuándo, antes y después).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CLAVES_TARIFA } from "@vet-teletriage/types";
import type { ClaveTarifa, ModoPrecio, TarifaCelda, TarifasPais } from "@vet-teletriage/types";
import { apiDelete, apiGet, apiPostAuth, apiPut, ApiError } from "../../../lib/api";
import { useSesionAdmin } from "../../../lib/sesion-admin";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

interface PanelTarifas {
  pais: string;
  moneda: string;
  modo: ModoPrecio;
  regla: { zonaHoraria: string; inicioDiurno: string; finDiurno: string; domingoNocturno: boolean; feriadoNocturno: boolean };
  tarifas: TarifasPais;
  porcentajePlataforma: number;
  cargoMinimoDiurno: number;
  cargoMinimoNocturno: number;
  feriados: Array<{ id: string; fecha: string; nombre: string }>;
  faltanFeriadosFuturos: boolean;
}
interface Cambio {
  id: string;
  creadoEl: string;
  resumen: string;
}
type Vista = Partial<Record<ClaveTarifa, TarifaCelda>>;

const ETIQUETAS: Record<ClaveTarifa, string> = {
  NORMAL_DIURNA: "Orientación normal · diurno",
  NORMAL_NOCTURNA: "Orientación normal · nocturno",
  URGENCIA_DIURNA: "Urgencia · diurno",
  URGENCIA_NOCTURNA: "Urgencia · nocturno",
};

const MODOS: Array<{ valor: ModoPrecio; titulo: string; detalle: string }> = [
  { valor: "LIBRE", titulo: "Libre (recomendado)", detalle: "Cada veterinario fija su precio. Piso y techo son una zona sugerida: salirse pide confirmación, no se prohíbe. Es el modo que mejor sostiene que la plataforma solo intermedia." },
  { valor: "BANDA", titulo: "Banda", detalle: "El veterinario elige, pero solo entre el piso y el techo. Más control de accesibilidad, más riesgo de que se vea como fijación de precios." },
  { valor: "FIJO", titulo: "Fijo", detalle: "Un solo precio por franja (el aconsejado), igual para todos. Es el más simple y previsible, pero es el modo con más riesgo de que se considere que la plataforma presta el servicio." },
];

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--borde)", borderRadius: 14, padding: 16, background: "var(--card)", marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{titulo}</div>
      {ayuda && <p style={{ fontSize: 11.5, opacity: 0.75, margin: "0 0 10px" }}>{ayuda}</p>}
      {children}
    </div>
  );
}

export default function AdminTarifasPage() {
  const router = useRouter();
  const { sesion } = useSesionAdmin();
  const [panel, setPanel] = useState<PanelTarifas | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [historial, setHistorial] = useState<Cambio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [porcentaje, setPorcentaje] = useState("10");
  const [vista, setVista] = useState<{ antes: Vista; despues: Vista } | null>(null);
  const [feriadoFecha, setFeriadoFecha] = useState("");
  const [feriadoNombre, setFeriadoNombre] = useState("");

  useEffect(() => {
    if (sesion === null) router.replace("/admin/ingresar");
  }, [sesion, router]);

  const cargarHistorial = useCallback(async () => {
    if (!sesion) return;
    try {
      setHistorial(await apiGet<Cambio[]>("/precios/admin/historial", sesion.accessToken));
    } catch {
      // el historial es informativo: si falla, el resto del panel sigue andando
    }
  }, [sesion]);

  const aplicar = useCallback(
    (p: PanelTarifas) => {
      setPanel(p);
      const f: Record<string, string> = {
        porcentajePlataforma: String(p.porcentajePlataforma),
        cargoMinimoDiurno: String(p.cargoMinimoDiurno),
        cargoMinimoNocturno: String(p.cargoMinimoNocturno),
        inicioDiurno: p.regla.inicioDiurno,
        finDiurno: p.regla.finDiurno,
      };
      for (const c of CLAVES_TARIFA) {
        f[`${c}.piso`] = String(p.tarifas[c].piso);
        f[`${c}.aconsejado`] = String(p.tarifas[c].aconsejado);
        f[`${c}.techo`] = String(p.tarifas[c].techo);
      }
      setForm(f);
      void cargarHistorial();
    },
    [cargarHistorial],
  );

  useEffect(() => {
    if (!sesion) return;
    apiGet<PanelTarifas>("/precios/admin?pais=AR", sesion.accessToken)
      .then(aplicar)
      .catch((e) => setError(e instanceof ApiError ? e.message : "No pudimos cargar las tarifas."));
  }, [sesion, aplicar]);

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setError(null);
    setAviso(null);
    try {
      await accion();
      setAviso(ok);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar. Probá de nuevo.");
    }
  }

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setAviso(null);
  };

  if (!sesion) return null;
  const token = sesion.accessToken;

  const nocturnasIguales =
    panel != null &&
    (panel.tarifas.NORMAL_NOCTURNA.aconsejado === panel.tarifas.NORMAL_DIURNA.aconsejado ||
      panel.tarifas.URGENCIA_NOCTURNA.aconsejado === panel.tarifas.URGENCIA_DIURNA.aconsejado);

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <Link href="/admin/precios" style={{ fontSize: 12, opacity: 0.75, display: "inline-block", marginBottom: 14 }}>
        ← Volver a Precios y configuración
      </Link>
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Tarifas
      </h1>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0, marginBottom: 16 }}>
        Argentina · {panel?.moneda ?? "ARS"}. Se aplica en vivo; lo que ya está en una solicitud o en un caso no cambia.
      </p>

      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      {aviso && <p style={{ fontSize: 13, marginBottom: 12 }}>{aviso}</p>}

      {panel && (
        <>
          {nocturnasIguales && (
            <p style={{ fontSize: 12.5, padding: "10px 12px", borderRadius: 12, background: "var(--alerta-fondo)", border: "1px solid var(--alerta-borde)", marginBottom: 16 }}>
              Algún precio nocturno es igual al diurno. Antes de lanzar, cargá los nocturnos: así el tutor ve la diferencia.
            </p>
          )}

          <Seccion titulo="Cómo se fijan los precios" ayuda="Se puede cambiar cuando quieras; cada cambio queda en el historial. Los precios que cada veterinario ya guardó no se pierden: si volvés a un modo anterior, rigen otra vez.">
            {MODOS.map((m) => (
              <label key={m.valor} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid var(--borde)", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="modo-precio"
                  checked={panel.modo === m.valor}
                  onChange={() => ejecutar(async () => aplicar(await apiPut<PanelTarifas>("/precios/admin/modo", token, { pais: "AR", modo: m.valor })), "Modo de precios guardado.")}
                  style={{ marginTop: 3 }}
                />
                <span style={{ fontSize: 13 }}>
                  <b>{m.titulo}</b>
                  <br />
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{m.detalle}</span>
                </span>
              </label>
            ))}
          </Seccion>

          <Seccion
            titulo="Precio por franja"
            ayuda="Piso, aconsejado y techo. En modo Libre son una zona sugerida; en Banda son límites; en Fijo rige solo el aconsejado. El aconsejado es lo que se muestra si el veterinario no puso el suyo."
          >
            {CLAVES_TARIFA.map((c) => (
              <div key={c} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ETIQUETAS[c]}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {(["piso", "aconsejado", "techo"] as const).map((campo) => (
                    <label key={campo} style={{ fontSize: 11.5 }}>
                      {campo[0].toUpperCase() + campo.slice(1)}
                      <input className="va-input" type="number" value={form[`${c}.${campo}`] ?? ""} onChange={(e) => set(`${c}.${campo}`, e.target.value)} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="va-boton"
              style={{ width: "auto", padding: "0 18px" }}
              onClick={() =>
                ejecutar(async () => {
                  const tarifas: Vista = {};
                  for (const c of CLAVES_TARIFA) {
                    tarifas[c] = { piso: Number(form[`${c}.piso`]), aconsejado: Number(form[`${c}.aconsejado`]), techo: Number(form[`${c}.techo`]) };
                  }
                  aplicar(await apiPut<PanelTarifas>("/precios/admin/tarifas", token, { pais: "AR", tarifas }));
                }, "Tarifas guardadas.")
              }
            >
              Guardar tarifas
            </button>
          </Seccion>

          <Seccion titulo="Subir o bajar todo por porcentaje" ayuda="Mueve piso, aconsejado y techo de las cuatro franjas. Primero mirás cómo queda; recién después lo aplicás.">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <input className="va-input" type="number" value={porcentaje} onChange={(e) => { setPorcentaje(e.target.value); setVista(null); }} style={{ maxWidth: 110 }} />
              <span style={{ fontSize: 14 }}>%</span>
              <button
                type="button"
                className="va-boton va-boton-ghost"
                style={{ width: "auto", padding: "0 16px" }}
                onClick={() =>
                  ejecutar(async () => {
                    setVista(await apiPostAuth<{ antes: Vista; despues: Vista }>("/precios/admin/ajuste", token, { pais: "AR", porcentaje: Number(porcentaje), aplicar: false }));
                  }, "Así quedaría (todavía no se aplicó).")
                }
              >
                Ver cómo queda
              </button>
            </div>
            {vista && (
              <>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginBottom: 10 }}>
                  <tbody>
                    {CLAVES_TARIFA.map((c) => (
                      <tr key={c} style={{ borderTop: "1px solid var(--borde)" }}>
                        <td style={{ padding: "4px 0" }}>{ETIQUETAS[c]}</td>
                        <td style={{ textAlign: "right" }}>
                          {vista.antes[c]?.aconsejado} → <b>{vista.despues[c]?.aconsejado}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="va-boton"
                  style={{ width: "auto", padding: "0 18px" }}
                  onClick={() =>
                    ejecutar(async () => {
                      await apiPostAuth("/precios/admin/ajuste", token, { pais: "AR", porcentaje: Number(porcentaje), aplicar: true });
                      aplicar(await apiGet<PanelTarifas>("/precios/admin?pais=AR", token));
                      setVista(null);
                    }, "Ajuste aplicado.")
                  }
                >
                  Aplicar {Number(porcentaje) > 0 ? "+" : ""}
                  {porcentaje} %
                </button>
              </>
            )}
          </Seccion>

          <Seccion titulo="Comisión de la plataforma" ayuda="Porcentaje del honorario del veterinario, con un mínimo fijo. Si el veterinario sube su precio, la comisión sube con él.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 11.5 }}>
                Porcentaje (%)
                <input className="va-input" type="number" value={form.porcentajePlataforma ?? ""} onChange={(e) => set("porcentajePlataforma", e.target.value)} />
              </label>
              <label style={{ fontSize: 11.5 }}>
                Mínimo diurno ($)
                <input className="va-input" type="number" value={form.cargoMinimoDiurno ?? ""} onChange={(e) => set("cargoMinimoDiurno", e.target.value)} />
              </label>
              <label style={{ fontSize: 11.5 }}>
                Mínimo nocturno ($)
                <input className="va-input" type="number" value={form.cargoMinimoNocturno ?? ""} onChange={(e) => set("cargoMinimoNocturno", e.target.value)} />
              </label>
            </div>
            <button
              type="button"
              className="va-boton"
              style={{ width: "auto", padding: "0 18px" }}
              onClick={() =>
                ejecutar(async () => {
                  aplicar(
                    await apiPut<PanelTarifas>("/precios/admin/comision", token, {
                      porcentajePlataforma: Number(form.porcentajePlataforma),
                      cargoMinimoDiurno: Number(form.cargoMinimoDiurno),
                      cargoMinimoNocturno: Number(form.cargoMinimoNocturno),
                    }),
                  );
                }, "Comisión guardada.")
              }
            >
              Guardar comisión
            </button>
          </Seccion>

          <Seccion titulo="Día y noche" ayuda={`Se calcula con la hora local del veterinario (${panel.regla.zonaHoraria}). El sábado es diurno.`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 11.5 }}>
                El día empieza
                <input className="va-input" type="time" value={form.inicioDiurno ?? ""} onChange={(e) => set("inicioDiurno", e.target.value)} />
              </label>
              <label style={{ fontSize: 11.5 }}>
                El día termina
                <input className="va-input" type="time" value={form.finDiurno ?? ""} onChange={(e) => set("finDiurno", e.target.value)} />
              </label>
            </div>
            <label style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 6 }}>
              <input type="checkbox" checked={panel.regla.domingoNocturno} onChange={(e) => ejecutar(async () => aplicar(await apiPut<PanelTarifas>("/precios/admin/regla", token, { pais: "AR", domingoNocturno: e.target.checked })), "Guardado.")} />
              El domingo cuenta como nocturno
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={panel.regla.feriadoNocturno} onChange={(e) => ejecutar(async () => aplicar(await apiPut<PanelTarifas>("/precios/admin/regla", token, { pais: "AR", feriadoNocturno: e.target.checked })), "Guardado.")} />
              Los feriados cuentan como nocturnos
            </label>
            <button
              type="button"
              className="va-boton"
              style={{ width: "auto", padding: "0 18px" }}
              onClick={() => ejecutar(async () => aplicar(await apiPut<PanelTarifas>("/precios/admin/regla", token, { pais: "AR", inicioDiurno: form.inicioDiurno, finDiurno: form.finDiurno })), "Horario guardado.")}
            >
              Guardar horario
            </button>
          </Seccion>

          <Seccion titulo="Feriados" ayuda="Se cobran como nocturnos. Los de cada año los cargás vos cuando se publican.">
            {panel.faltanFeriadosFuturos && (
              <p style={{ fontSize: 12.5, padding: "10px 12px", borderRadius: 12, background: "var(--alerta-fondo)", border: "1px solid var(--alerta-borde)", marginBottom: 10 }}>
                No quedan feriados futuros cargados: un feriado se cobraría como día común. Cargá los próximos.
              </p>
            )}
            {panel.feriados.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderTop: "1px solid var(--borde)" }}>
                <span>
                  {f.fecha} · {f.nombre}
                </span>
                <button
                  type="button"
                  style={{ fontSize: 12, textDecoration: "underline", background: "none", border: 0, cursor: "pointer", color: "var(--terracota)" }}
                  onClick={() => ejecutar(async () => aplicar(await apiDelete<PanelTarifas>(`/precios/admin/feriados/${f.id}`, token)), "Feriado quitado.")}
                >
                  Quitar
                </button>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: 8, marginTop: 10, alignItems: "end" }}>
              <label style={{ fontSize: 11.5 }}>
                Fecha
                <input className="va-input" type="date" value={feriadoFecha} onChange={(e) => setFeriadoFecha(e.target.value)} />
              </label>
              <label style={{ fontSize: 11.5 }}>
                Nombre
                <input className="va-input" type="text" value={feriadoNombre} onChange={(e) => setFeriadoNombre(e.target.value)} />
              </label>
              <button
                type="button"
                className="va-boton"
                style={{ width: "auto", padding: "0 14px" }}
                onClick={() =>
                  ejecutar(async () => {
                    aplicar(await apiPostAuth<PanelTarifas>("/precios/admin/feriados", token, { pais: "AR", fecha: feriadoFecha, nombre: feriadoNombre }));
                    setFeriadoFecha("");
                    setFeriadoNombre("");
                  }, "Feriado agregado.")
                }
              >
                Agregar
              </button>
            </div>
          </Seccion>

          <Seccion titulo="Historial de cambios" ayuda="Cada cambio de precios queda registrado y no se puede editar ni borrar.">
            {historial.length === 0 && <p style={{ fontSize: 12.5, opacity: 0.75, margin: 0 }}>Todavía no hay cambios.</p>}
            {historial.slice(0, 15).map((h) => (
              <div key={h.id} style={{ fontSize: 12.5, padding: "4px 0", borderTop: "1px solid var(--borde)" }}>
                {new Date(h.creadoEl).toLocaleString("es-AR")} · {h.resumen}
              </div>
            ))}
          </Seccion>
        </>
      )}
      <LegalFooter />
    </main>
  );
}
