// Cliente HTTP mínimo hacia apps/api. Sin librerías (axios/swr) todavía —
// el frontend es greenfield, se agregan cuando haga falta algo que esto no
// resuelva (revalidación, caché, etc.).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Renovación de la sesión del veterinario (Sergio, 2026-10-27): si un pedido
// con token vuelve 401 (por ejemplo, porque la laptop estuvo dormida y el
// token de 15 minutos venció), se pide una renovación y se reintenta UNA vez.
// El renovador devuelve el token nuevo, o null si no corresponde renovar
// (otro rol, o la sesión ya no es válida). Lo registra lib/sesion-veterinario.
type Renovador = (tokenViejo: string) => Promise<string | null>;
let renovadorVeterinario: Renovador | null = null;
export function registrarRenovadorVeterinario(fn: Renovador | null) {
  renovadorVeterinario = fn;
}

async function pedido<T>(path: string, init?: RequestInit, yaReintentado = false): Promise<T> {
  const respuesta = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (respuesta.status === 401 && !yaReintentado && renovadorVeterinario) {
    const autorizacion = (init?.headers as Record<string, string> | undefined)?.Authorization;
    const tokenViejo = autorizacion?.startsWith("Bearer ") ? autorizacion.slice(7) : null;
    if (tokenViejo) {
      const tokenNuevo = await renovadorVeterinario(tokenViejo).catch(() => null);
      if (tokenNuevo) {
        return pedido<T>(
          path,
          { ...init, headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${tokenNuevo}` } },
          true,
        );
      }
    }
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new ApiError(cuerpo?.message ?? "Ocurrió un error inesperado", respuesta.status);
  }

  // Algunos endpoints (ej. PATCH de confirmación) devuelven 200 sin body útil.
  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : (undefined as T);
}

export function apiPost<T>(path: string, body?: unknown) {
  return pedido<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

// Variante autenticada — mismo criterio que apiPatch: el token va en el
// header, nunca en el body, para que no haya forma de "armar" un caso a
// nombre de otro cliente desde el cliente HTTP.
export function apiPostAuth<T>(path: string, token: string, body?: unknown) {
  return pedido<T>(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, token: string, body?: unknown) {
  return pedido<T>(path, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiGet<T>(path: string, token?: string) {
  return pedido<T>(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
