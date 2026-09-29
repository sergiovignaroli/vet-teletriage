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

async function pedido<T>(path: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

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
