export type TipoParceiroBusca =
  | 'Instalador de Câmeras / CFTV'
  | 'Eletricista'
  | 'Instalador de Segurança'
  | 'Todos'

export interface ParceiroGeoapifyResult {
  id: string
  nome: string
  tipo: string
  whatsApp: string
  email: string
  endereco: string
  cidade: string
  estado: string
  regioesAtendimento: string[]
  observacoes?: string
  status: 'A Contatar'
  origem: 'geoapify'
  website?: string
  createdAt: string
}

interface GeocodeResult {
  place_id?: string
  formatted?: string
  city?: string
  state?: string
  state_code?: string
  country_code?: string
  bbox?: { lon1: number; lat1: number; lon2: number; lat2: number }
  lon?: number
  lat?: number
}

interface PlacesFeature {
  properties?: {
    place_id?: string
    name?: string
    formatted?: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    state_code?: string
    categories?: string[]
    website?: string
    contact?: {
      phone?: string
      phone_other?: string[]
      email?: string
    }
  }
}

interface PlaceDetailsFeature {
  properties?: {
    place_id?: string
    name?: string
    formatted?: string
    website?: string
    contact?: {
      phone?: string
      phone_other?: string[]
      email?: string
    }
    datasource?: { raw?: Record<string, unknown> }
  }
}

/** Categorias Geoapify por tipo de parceiro. */
const CATEGORIES_BY_TIPO: Record<Exclude<TipoParceiroBusca, 'Todos'>, string[]> = {
  Eletricista: ['service.electrician'],
  'Instalador de Segurança': ['office.security', 'service.locksmith'],
  'Instalador de Câmeras / CFTV': [
    'office.security',
    'commercial.elektronics',
    'service.locksmith',
  ],
}

const CFTV_NAME_HINT =
  /cftv|c\.?f\.?t\.?v|c[aâ]mera|camera|alarme|monitoramento|seguran[cç]a eletr|circuito fechado/i

const NOISE_NAME =
  /americanas|polishop|i\s*place|magazine\s*luiza|magalu|casas\s*bahia|extra\s*hiper|carrefour|sam'?s\s*club|atacad/i

function cleanPhone(phone?: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  // BR local (10/11) → prefixa 55; já internacional (12/13 com 55) mantém
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits
  return digits
}

function isNoisePlace(nome: string, _categories: string[]): boolean {
  // Só remove grandes redes de varejo óbvias — não descarta eletrônicos/serviços locais
  return NOISE_NAME.test(nome)
}

function phoneFromRaw(raw?: Record<string, unknown> | null): string {
  if (!raw) return ''
  const keys = [
    'phone',
    'contact:phone',
    'contact:mobile',
    'mobile',
    'phone_1',
    'telephone',
    'whatsapp',
    'contact:whatsapp',
  ]
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) {
      const cleaned = cleanPhone(value)
      if (cleaned) return cleaned
    }
  }
  return ''
}

function getApiKey(): string {
  const apiKey = process.env.GEOAPIFY_API_KEY || process.env.GEOAPIFY_KEY
  if (!apiKey) {
    throw new Error(
      'GEOAPIFY_API_KEY não configurada. Adicione a chave no .env-dev ou .env-prod.',
    )
  }
  return apiKey
}

function detectTipo(nome: string, categories: string[], queryTipo: string): string {
  if (queryTipo !== 'Todos') return queryTipo
  const n = nome.toLowerCase()
  const cats = categories.join(' ').toLowerCase()
  if (cats.includes('electrician') || n.includes('eletric')) return 'Eletricista'
  if (CFTV_NAME_HINT.test(nome) || n.includes('cftv')) return 'Instalador de Câmeras / CFTV'
  if (
    cats.includes('security') ||
    cats.includes('locksmith') ||
    n.includes('alarme') ||
    n.includes('segurança') ||
    n.includes('seguranca')
  ) {
    return 'Instalador de Segurança'
  }
  return 'Instalador de Câmeras / CFTV'
}

async function geocodeCity(
  apiKey: string,
  cidade: string,
  estado: string,
): Promise<GeocodeResult> {
  const text = `${cidade}${estado ? `, ${estado}` : ''}, Brasil`
  const url = new URL('https://api.geoapify.com/v1/geocode/search')
  url.searchParams.set('text', text)
  url.searchParams.set('type', 'city')
  url.searchParams.set('filter', 'countrycode:br')
  url.searchParams.set('limit', '1')
  url.searchParams.set('lang', 'pt')
  url.searchParams.set('format', 'json')
  url.searchParams.set('apiKey', apiKey)

  const res = await fetch(url)
  const data = (await res.json()) as { results?: GeocodeResult[]; message?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.message || data.error || `Geoapify Geocoding HTTP ${res.status}`)
  }
  const place = data.results?.[0]
  if (!place?.place_id && !(place?.lon && place?.lat)) {
    throw new Error(
      `Cidade "${cidade}${estado ? ` - ${estado}` : ''}" não encontrada no Geoapify. Verifique o nome/UF.`,
    )
  }
  return place
}

function buildPlacesFilter(geo: GeocodeResult): { filter: string; bias?: string } {
  if (geo.place_id) {
    return { filter: `place:${geo.place_id}` }
  }
  if (geo.bbox) {
    const { lon1, lat1, lon2, lat2 } = geo.bbox
    return { filter: `rect:${lon1},${lat1},${lon2},${lat2}` }
  }
  if (geo.lon != null && geo.lat != null) {
    return {
      filter: `circle:${geo.lon},${geo.lat},15000`,
      bias: `proximity:${geo.lon},${geo.lat}`,
    }
  }
  throw new Error('Não foi possível delimitar a área da cidade no Geoapify.')
}

async function searchPlacesByCategory(
  apiKey: string,
  categories: string[],
  geo: GeocodeResult,
  limit: number,
): Promise<PlacesFeature[]> {
  const { filter, bias } = buildPlacesFilter(geo)
  // Busca por categoria separada: o Places limita o total por request e misturar
  // várias categorias favorece varejo e esconde profissionais.
  const perCategory = Math.max(10, Math.ceil(limit / Math.max(categories.length, 1)))
  const batches = await Promise.all(
    categories.map(async (category) => {
      const url = new URL('https://api.geoapify.com/v2/places')
      url.searchParams.set('categories', category)
      url.searchParams.set('filter', filter)
      if (bias) url.searchParams.set('bias', bias)
      url.searchParams.set('limit', String(perCategory))
      url.searchParams.set('lang', 'pt')
      url.searchParams.set('apiKey', apiKey)

      const res = await fetch(url)
      const data = (await res.json()) as {
        features?: PlacesFeature[]
        message?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.message || data.error || `Geoapify Places HTTP ${res.status}`)
      }
      return data.features || []
    }),
  )

  const seen = new Set<string>()
  const merged: PlacesFeature[] = []
  for (const feature of batches.flat()) {
    const id = feature.properties?.place_id || feature.properties?.name
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(feature)
  }
  return merged
}

async function fetchPlaceDetails(
  apiKey: string,
  placeId: string,
): Promise<PlaceDetailsFeature | null> {
  const url = new URL('https://api.geoapify.com/v2/place-details')
  url.searchParams.set('id', placeId)
  url.searchParams.set('features', 'details')
  url.searchParams.set('lang', 'pt')
  url.searchParams.set('apiKey', apiKey)

  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as { features?: PlaceDetailsFeature[] }
  return data.features?.[0] || null
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index++
      results[current] = await mapper(items[current])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

function extractPhone(contact?: {
  phone?: string
  phone_other?: string[]
}): string {
  if (!contact) return ''
  const candidates = [contact.phone, ...(contact.phone_other || [])]
  for (const raw of candidates) {
    const cleaned = cleanPhone(raw)
    if (cleaned) return cleaned
  }
  return ''
}

export async function searchGeoapifyParceiros(params: {
  cidade: string
  estado: string
  tipo?: string
  onlyWithPhone?: boolean
}): Promise<{
  results: ParceiroGeoapifyResult[]
  queries: string[]
  withPhone: number
}> {
  const apiKey = getApiKey()
  const cidade = params.cidade.trim()
  const estado = params.estado.trim()
  if (!cidade) throw new Error('Informe a cidade para buscar no Geoapify.')

  const tipo = (params.tipo || 'Todos') as TipoParceiroBusca
  // Só filtra telefone quando o cliente pede explicitamente (padrão: mostrar todos)
  const onlyWithPhone = params.onlyWithPhone === true
  const geo = await geocodeCity(apiKey, cidade, estado)

  const tipos: Array<Exclude<TipoParceiroBusca, 'Todos'>> =
    tipo === 'Todos'
      ? ['Instalador de Câmeras / CFTV', 'Eletricista', 'Instalador de Segurança']
      : [tipo]

  const categorySet = new Set<string>()
  for (const t of tipos) {
    for (const cat of CATEGORIES_BY_TIPO[t]) categorySet.add(cat)
  }
  const categories = Array.from(categorySet)
  const queries = categories.map(
    (cat) => `${cat} em ${cidade}${estado ? `/${estado.toUpperCase()}` : ''}`,
  )

  const features = await searchPlacesByCategory(apiKey, categories, geo, 40)
  const resolvedCity = geo.city || cidade
  const resolvedState = (geo.state_code || estado || '').toUpperCase().replace(/^BR-/, '')

  const enriched = await mapWithConcurrency(features, 4, async (feature) => {
    const props = feature.properties || {}
    const nome = props.name?.trim()
    if (!nome) return null

    const cats = props.categories || []
    if (isNoisePlace(nome, cats)) return null

    const placeId = props.place_id
    let phone = extractPhone(props.contact)
    let email = props.contact?.email || ''
    let website = props.website || ''

    // Place Details traz telefone/e-mail com bem mais frequência
    if (placeId && (!phone || !email || !website)) {
      const details = await fetchPlaceDetails(apiKey, placeId)
      const dprops = details?.properties
      if (dprops) {
        phone = phone || extractPhone(dprops.contact) || phoneFromRaw(dprops.datasource?.raw)
        email = email || dprops.contact?.email || ''
        website = website || dprops.website || ''
      }
    }

    const mappedTipo = detectTipo(nome, cats, tipo === 'Todos' ? 'Todos' : tipo)

    return {
      id: `geoapify-${(placeId || nome).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)}`,
      nome,
      tipo: mappedTipo,
      whatsApp: phone,
      email,
      endereco: props.formatted || props.address_line1 || '',
      cidade: props.city || resolvedCity,
      estado: (props.state_code || resolvedState || '').toUpperCase(),
      regioesAtendimento: [props.city || resolvedCity],
      observacoes: `Capturado via Geoapify Places.${website ? ` Site: ${website}` : ''}${
        cats.length ? ` Categorias: ${cats.slice(0, 4).join(', ')}` : ''
      }`,
      status: 'A Contatar' as const,
      origem: 'geoapify' as const,
      website: website || undefined,
      createdAt: new Date().toISOString(),
    } satisfies ParceiroGeoapifyResult
  })

  const seen = new Set<string>()
  const allResults: ParceiroGeoapifyResult[] = []
  for (const item of enriched) {
    if (!item) continue
    const key = item.nome.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    allResults.push(item)
  }

  allResults.sort((a, b) => {
    if (Boolean(a.whatsApp) === Boolean(b.whatsApp)) return a.nome.localeCompare(b.nome, 'pt-BR')
    return a.whatsApp ? -1 : 1
  })

  const withPhoneCount = allResults.filter((r) => Boolean(r.whatsApp)).length
  let results = allResults
  if (onlyWithPhone) {
    results = allResults.filter((r) => Boolean(r.whatsApp))
    // Soft fallback: se o filtro esvaziar a lista, devolve todos e avisa via queries
    if (results.length === 0 && allResults.length > 0) {
      results = allResults
      queries.push(
        `aviso: nenhum telefone disponível no Geoapify para esta busca; exibindo ${allResults.length} profissionais sem telefone`,
      )
    }
  }

  console.info('[geoapify-parceiros]', {
    cidade,
    estado,
    tipo,
    onlyWithPhone,
    features: features.length,
    afterEnrich: allResults.length,
    withPhone: withPhoneCount,
    returned: results.length,
  })

  return {
    results,
    queries,
    withPhone: withPhoneCount,
  }
}
