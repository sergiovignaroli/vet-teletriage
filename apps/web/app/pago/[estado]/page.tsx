"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { CasoParaCliente } from "@vet-teletriage/types";
import { apiGet, apiPostAuth, ApiError } from "../../../lib/api";
import { useSesionCliente } from "../../../lib/sesion";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

// Pantallas de resultado post-Mercado Pago (Sergio, 2026-09-29) — antes los
// tres back_urls (éxito/pendiente/fallo) de la preferencia apuntaban los
// tres a /panel sin distinción (ver PagosService.crearCheckout). El
// segmento de ruta acá (exito/pendiente/fallo) es lo que Mercado Pago le
// dijo al NAVEGADOR justo en este instante — no necesariamente lo mismo
// que ya confirmó el webhook. Por eso esta pantalla muestra dos cosas: el
// mensaje principal según la ruta, y una línea con el estado REAL de
// Pago.estado (vía GET /casos/mios-cliente), que puede tardar unos
// segundos en alcanzar al redirect.
//
// `useSearchParams` exige un límite <Suspense> — la envoltura de abajo es
// solo por eso, no cambia nada del comportamiento.
export default function ResultadoPagoPage() {
  return (
    <Suspense fallback={null}>
      <ResultadoPagoContenido />
    </Suspense>
  );
}

const COPY: Record<string, { titulo: string; texto: string }> = {
  exito: {
    titulo: "¡Listo! Tu pago se confirmó",
    texto: "Guardamos tu consulta — ya podés esperar a que tu veterinario te contacte para la videollamada.",
  },
  pendiente: {
    titulo: "Tu pago quedó pendiente de acreditación",
    texto:
      "Es normal con algunos medios de pago (efectivo, transferencia) — te avisamos apenas se acredite. Tu consulta ya está reservada.",
  },
  fallo: {
    titulo: "No pudimos procesar tu pago",
    texto: "Podés intentarlo de nuevo cuando quieras — tu veterinario elegido sigue reservado para vos.",
  },
};

function ResultadoPagoContenido() {
  const router = useRouter();
  const params = useParams<{ estado: string }>();
  const searchParams = useSearchParams();
  const casoId = searchParams.get("casoId");
  const { sesion } = useSesionCliente();

  // undefined = todavía cargando, null = no se encontró ese caso
  const [caso, setCaso] = useState<CasoParaCliente | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reintentando, setReintentando] = useState(false);
  const [errorReintento, setErrorReintento] = useState<string | null>(null);

  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion || !casoId) return;
    let cancelado = false;
    apiGet<CasoParaCliente[]>("/casos/mios-cliente", sesion.accessToken)
      .then((casos) => {
        if (cancelado) return;
        setCaso(casos.find((c) => c.id === casoId) ?? null);
      })
      .catch((e) => {
        if (cancelado) return;
        setError(e instanceof ApiError ? e.message : "No pudimos confirmar el estado de tu pago. Probá de nuevo.");
        setCaso(null);
      });
    return () => {
      cancelado = true;
    };
  }, [sesion, casoId]);

  // Reutiliza el mismo endpoint que /elegir-veterinario/:casoId — ahora
  // PagosService.crearCheckout() acepta reintentar cuando el pago anterior
  // quedó CANCELADO, generando una preferencia nueva (ver comentario ahí).
  async function reintentar() {
    if (!sesion || !casoId) return;
    setReintentando(true);
    setErrorReintento(null);
    try {
      const { initPoint } = await apiPostAuth<{ initPoint: string }>(
        `/pagos/${casoId}/checkout`,
        sesion.accessToken,
      );
      window.location.href = initPoint;
    } catch (e) {
      setErrorReintento(e instanceof ApiError ? e.message : "No pudimos reintentar el pago. Probá de nuevo.");
      setReintentando(false);
    }
  }

  if (!sesion) return null;

  const copy = COPY[params.estado] ?? COPY.fallo;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 22px", textAlign: "center" }}>
      <Logo size="md" marginBottom={28} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }}>
        {copy.titulo}
      </h1>
      <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>{copy.texto}</p>

      {!casoId && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 16 }} role="alert">
          No pudimos identificar de qué consulta se trata este pago.
        </p>
      )}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}
      {caso === undefined && casoId && <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>Confirmando…</p>}
      {caso === null && !error && casoId && (
        <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>No encontramos esa consulta en tu cuenta.</p>
      )}

      {caso && (
        <div
          style={{
            background: "rgba(122, 139, 104, 0.12)",
            borderRadius: 14,
            padding: "14px 16px",
            fontSize: 13,
            marginBottom: 20,
            textAlign: "left",
          }}
        >
          <EstadoRealPago pago={caso.pago} veterinario={caso.veterinario} />
        </div>
      )}

      {params.estado === "fallo" && casoId && (
        <>
          <button type="button" className="va-boton" onClick={reintentar} disabled={reintentando}>
            {reintentando ? "Un momento…" : "Reintentar pago"}
          </button>
          {errorReintento && (
            <p style={{ color: "var(--terracota)", fontSize: 13, marginTop: 10 }} role="alert">
              {errorReintento}
            </p>
          )}
        </>
      )}

      <p style={{ marginTop: 20 }}>
        <a href="/panel" style={{ fontSize: 13 }}>
          Ver mis consultas
        </a>
      </p>

      <LegalFooter />
    </main>
  );
}

// La fuente de verdad — separada del mensaje de arriba porque el redirect
// de Mercado Pago puede llegar antes de que el webhook haya actualizado
// Pago.estado (ver comentario grande al principio del archivo).
function EstadoRealPago({
  pago,
  veterinario,
}: {
  pago: CasoParaCliente["pago"];
  veterinario: CasoParaCliente["veterinario"];
}) {
  if (!pago) return <>Todavía no encontramos un cobro asociado a esta consulta.</>;
  const nombreVet = veterinario ? `${veterinario.nombre} ${veterinario.apellido}` : "tu veterinario";
  switch (pago.estado) {
    case "AUTORIZADO":
    case "CAPTURADO":
      return (
        <>
          ✓ Pago confirmado (${Number(pago.montoTotal)}) — consulta con {nombreVet} reservada.
        </>
      );
    case "REEMBOLSADO_TOTAL":
      return <>Este pago ya fue reembolsado — la consulta no se llegó a completar.</>;
    case "REEMBOLSADO_PARCIAL":
      return <>Se reembolsó parte de este pago.</>;
    case "CANCELADO":
      return <>El pago no se acreditó.</>;
    case "PENDIENTE":
    default:
      return <>Estamos confirmando el pago con Mercado Pago — puede tardar unos minutos.</>;
  }
}
