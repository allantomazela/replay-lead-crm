export interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export interface OverpassResponse {
  elements: OverpassElement[]
}

/** Mirrors públicos — ordem embaralhada a cada busca para diluir carga. */
const OVERPASS_ENDPOINTS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
]

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function isTransientFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return true
  const msg = err.message.toLowerCase()
  return (
    msg.includes('504') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('abort') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('network')
  )
}

/**
 * Consulta Overpass com vários mirrors, timeout longo e tolerância a 504.
 */
export async function fetchOverpassJson(
  query: string,
  options?: { clientTimeoutMs?: number },
): Promise<OverpassResponse> {
  const clientTimeoutMs = options?.clientTimeoutMs ?? 55000
  const endpoints = shuffle(OVERPASS_ENDPOINTS)
  let lastError: unknown = null

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), clientTimeoutMs)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`Status HTTP ${res.status} ao consultar ${endpoint}`)
      }

      const data = (await res.json()) as OverpassResponse
      if (data && Array.isArray(data.elements)) {
        return data
      }
      throw new Error(`Resposta inválida de ${endpoint}`)
    } catch (err) {
      lastError = err
      console.warn(`Tentativa no endpoint Overpass ${endpoint} falhou:`, err)
      if (!isTransientFailure(err)) {
        // Erro inesperado: ainda tenta outros mirrors
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const detail =
    lastError instanceof Error
      ? lastError.message
      : 'servidores do OpenStreetMap indisponíveis'
  throw new Error(
    `Os servidores de mapa estão lentos ou sobrecarregados (${detail}). Aguarde alguns segundos e tente novamente.`,
  )
}
