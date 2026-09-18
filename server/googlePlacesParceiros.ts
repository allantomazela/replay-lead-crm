export type TipoParceiroBusca =
  | 'Instalador de Câmeras / CFTV'
  | 'Eletricista'
  | 'Instalador de Segurança'
  | 'Todos'

export interface ParceiroGoogleResult {
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
  origem: 'google'
  website?: string
  createdAt: string
}

interface PlacesTextSearchResponse {
  places?: Array<{
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
    nationalPhoneNumber?: string
    internationalPhoneNumber?: string
    websiteUri?: string
    businessStatus?: string
  }>
  error?: { message?: string; status?: string }
}

const QUERY_BY_TIPO: Record<Exclude<TipoParceiroBusca, 'Todos'>, string[]> = {
  'Instalador de Câmeras / CFTV': [
    'instalação de câmeras CFTV',
    'empresa de CFTV monitoramento',
  ],
  Eletricista: ['eletricista', 'eletricista residencial predial'],
  'Instalador de Segurança': [
    'instalação de alarmes',
    'segurança eletrônica',
  ],
}

function cleanPhone(phone?: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits
  return digits
}

function detectTipo(nome: string, queryTipo: string): string {
  if (queryTipo !== 'Todos') return queryTipo
  const n = nome.toLowerCase()
  if (n.includes('eletric')) return 'Eletricista'
  if (
    n.includes('alarme') ||
    n.includes('segurança') ||
    n.includes('seguranca') ||
    n.includes('vigil')
  ) {
    return 'Instalador de Segurança'
  }
  return 'Instalador de Câmeras / CFTV'
}

function buildQueries(cidade: string, estado: string, tipo: TipoParceiroBusca): string[] {
  const loc = `${cidade.trim()}${estado.trim() ? ` ${estado.trim().toUpperCase()}` : ''} Brasil`
  const tipos: Array<Exclude<TipoParceiroBusca, 'Todos'>> =
    tipo === 'Todos'
      ? ['Instalador de Câmeras / CFTV', 'Eletricista', 'Instalador de Segurança']
      : [tipo]

  const queries: string[] = []
  for (const t of tipos) {
    for (const term of QUERY_BY_TIPO[t]) {
      queries.push(`${term} em ${loc}`)
    }
  }
  return queries
}

async function searchTextOnce(apiKey: string, textQuery: string): Promise<PlacesTextSearchResponse> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.businessStatus',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'pt-BR',
      regionCode: 'BR',
      maxResultCount: 20,
    }),
  })

  const data = (await res.json()) as PlacesTextSearchResponse
  if (!res.ok) {
    const msg = data.error?.message || `Google Places respondeu HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

export async function searchGoogleParceiros(params: {
  cidade: string
  estado: string
  tipo?: string
  onlyWithPhone?: boolean
}): Promise<{ results: ParceiroGoogleResult[]; queries: string[]; withPhone: number }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error(
      'GOOGLE_PLACES_API_KEY não configurada. Adicione a chave da Places API (New) no .env-dev ou .env-prod.',
    )
  }

  const cidade = params.cidade.trim()
  const estado = params.estado.trim()
  if (!cidade) throw new Error('Informe a cidade para buscar no Google.')

  const tipo = (params.tipo || 'Todos') as TipoParceiroBusca
  // Só filtra telefone quando o cliente pede explicitamente
  const onlyWithPhone = params.onlyWithPhone === true
  const queries = buildQueries(cidade, estado, tipo)
  const seen = new Set<string>()
  const allResults: ParceiroGoogleResult[] = []

  for (const textQuery of queries) {
    const data = await searchTextOnce(apiKey, textQuery)
    for (const place of data.places || []) {
      if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue

      const nome = place.displayName?.text?.trim()
      if (!nome) continue

      const placeId = place.id || `name-${nome.toLowerCase()}`
      if (seen.has(placeId)) continue
      seen.add(placeId)

      const phone = cleanPhone(place.internationalPhoneNumber || place.nationalPhoneNumber)

      const mappedTipo = detectTipo(nome, tipo === 'Todos' ? 'Todos' : tipo)
      allResults.push({
        id: `google-${placeId.replace(/\//g, '-')}`,
        nome,
        tipo: mappedTipo,
        whatsApp: phone,
        email: '',
        endereco: place.formattedAddress || '',
        cidade,
        estado: estado.toUpperCase() || '',
        regioesAtendimento: [cidade],
        observacoes: `Capturado via Google Places. Query: "${textQuery}".${
          place.websiteUri ? ` Site: ${place.websiteUri}` : ''
        }`,
        status: 'A Contatar',
        origem: 'google',
        website: place.websiteUri,
        createdAt: new Date().toISOString(),
      })
    }
  }

  allResults.sort((a, b) => {
    if (Boolean(a.whatsApp) === Boolean(b.whatsApp)) return a.nome.localeCompare(b.nome, 'pt-BR')
    return a.whatsApp ? -1 : 1
  })

  const withPhoneCount = allResults.filter((r) => Boolean(r.whatsApp)).length
  let results = allResults
  if (onlyWithPhone) {
    results = allResults.filter((r) => Boolean(r.whatsApp))
    if (results.length === 0 && allResults.length > 0) {
      results = allResults
      queries.push(
        `aviso: nenhum telefone disponível no Google para esta busca; exibindo ${allResults.length} profissionais sem telefone`,
      )
    }
  }

  console.info('[google-parceiros]', {
    cidade,
    estado,
    tipo,
    onlyWithPhone,
    queries: queries.length,
    withPhone: withPhoneCount,
    returned: results.length,
  })

  return {
    results,
    queries,
    withPhone: withPhoneCount,
  }
}
