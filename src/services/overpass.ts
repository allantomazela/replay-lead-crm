import { Arena } from '../types/crm'
import { cleanPhoneNumber } from '@/lib/format'

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

function mapModalidade(tags: Record<string, string> = {}): string {
  const sport = (tags.sport || '').toLowerCase()
  const leisure = (tags.leisure || '').toLowerCase()
  const name = (tags.name || tags['name:pt'] || tags.operator || '').toLowerCase()
  const description = (tags.description || '').toLowerCase()
  const allText = `${sport} ${leisure} ${name} ${description}`

  // Beach tennis and sand sports take precedence
  if (
    allText.includes('beach tennis') ||
    allText.includes('beachtennis') ||
    allText.includes('beach_tennis') ||
    allText.includes('beach') ||
    allText.includes('areia') ||
    allText.includes('futevolei') ||
    allText.includes('futevôlei') ||
    allText.includes('footvolley') ||
    sport.includes('beach_volleyball')
  ) {
    return 'Beach Tennis'
  }

  // Soccer / society sports
  if (
    allText.includes('society') ||
    allText.includes('futebol') ||
    allText.includes('soccer') ||
    allText.includes('futsal') ||
    sport.includes('soccer') ||
    sport.includes('football')
  ) {
    return 'Futebol Society'
  }

  // Volleyball
  if (
    allText.includes('volei') ||
    allText.includes('vôlei') ||
    allText.includes('volleyball') ||
    sport.includes('volleyball')
  ) {
    return 'Vôlei'
  }

  // General racket/tennis sports mapped to Beach Tennis for this CRM
  if (
    sport.includes('tennis') ||
    allText.includes('tenis') ||
    allText.includes('tênis') ||
    sport.includes('padel')
  ) {
    return 'Beach Tennis'
  }

  return 'Beach Tennis'
}

function buildAddress(tags: Record<string, string> = {}): string {
  const street = tags['addr:street'] || tags['addr:road'] || tags['addr:place'] || ''
  const num = tags['addr:housenumber'] || ''
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:district'] || ''
  const postcode = tags['addr:postcode'] || ''

  const parts: string[] = []
  if (street) {
    parts.push(num ? `${street}, ${num}` : street)
  }
  if (suburb) {
    parts.push(suburb)
  }
  if (postcode) {
    parts.push(`CEP ${postcode}`)
  }
  return parts.join(' - ')
}

function resolveArenaName(tags: Record<string, string>, type: string, id: number): string {
  const candidate =
    tags.name ||
    tags['name:pt'] ||
    tags['official_name'] ||
    tags['alt_name'] ||
    tags.operator ||
    tags.brand ||
    ''

  if (candidate.trim()) {
    return candidate.trim()
  }

  // Descriptive fallback if OSM tag has no explicit name
  const sport = tags.sport ? tags.sport.replace(/_/g, ' ') : ''
  const leisure = tags.leisure ? tags.leisure.replace(/_/g, ' ') : ''
  const street = tags['addr:street'] || ''

  if (sport && street) {
    return `Centro Esportivo de ${sport} (${street})`
  }
  if (street) {
    return `Arena Esportiva (${street})`
  }
  if (sport) {
    return `Centro Esportivo (${sport})`
  }
  if (leisure === 'sports_centre') {
    return `Centro Esportivo (#${id})`
  }
  return `Arena sem nome (OSM ${type} #${id})`
}

export async function searchOverpassArenas({
  cidade,
  estado,
  modalidade,
}: {
  cidade: string
  estado: string
  modalidade?: string
}): Promise<Arena[]> {
  const trimmedCity = cidade.trim()
  const trimmedState = estado.trim()

  if (!trimmedCity) {
    throw new Error('Informe a cidade para realizar a busca no mapa.')
  }

  // Endpoints públicos da Overpass API com fallbacks confiáveis
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ]

  // 1. Nominatim Geocoding para obter o bounding box exato da cidade no Brasil
  let bbox: [number, number, number, number] | null = null
  let resolvedCityName = trimmedCity
  let resolvedStateCode = trimmedState.toUpperCase()

  try {
    const geoQuery = encodeURIComponent(
      `${trimmedCity}${trimmedState ? `, ${trimmedState}` : ''}, Brasil`,
    )
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=3&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent': 'ReplayLeadCRM/1.0 (https://replaylead.com.br; contato@replaylead.com.br)',
        },
      },
    )

    if (geoRes.ok) {
      const geoData = await geoRes.json()
      if (Array.isArray(geoData) && geoData.length > 0) {
        // Encontra o resultado que seja cidade/município ou o primeiro
        const place =
          geoData.find(
            (p) =>
              p.type === 'administrative' ||
              p.class === 'boundary' ||
              p.type === 'city' ||
              p.type === 'town' ||
              p.type === 'municipality',
          ) || geoData[0]

        if (place && place.boundingbox && place.boundingbox.length === 4) {
          // Nominatim boundingbox format: [south_lat, north_lat, west_lon, east_lon]
          const south = parseFloat(place.boundingbox[0])
          const north = parseFloat(place.boundingbox[1])
          const west = parseFloat(place.boundingbox[2])
          const east = parseFloat(place.boundingbox[3])
          if (!isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east)) {
            // Overpass bbox convention: (south, west, north, east)
            bbox = [south, west, north, east]
          }
        }

        if (place && place.address) {
          if (place.address.city || place.address.town || place.address.municipality) {
            resolvedCityName =
              place.address.city || place.address.town || place.address.municipality
          }
          if (place.address['ISO3166-2-lvl4']) {
            resolvedStateCode = place.address['ISO3166-2-lvl4'].replace('BR-', '')
          } else if (place.address.state) {
            resolvedStateCode = place.address.state
          }
        }
      } else {
        // Nominatim retornou lista vazia
        throw new Error(
          `Cidade "${trimmedCity}${trimmedState ? ` - ${trimmedState}` : ''}" não foi encontrada no mapa. Verifique a ortografia ou a sigla do estado.`,
        )
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('não foi encontrada no mapa')) {
      throw err
    }
    console.warn('Nominatim geocode falhou, tentando fallback com busca por área no Overpass:', err)
  }

  // 2. Construir consulta Overpass QL
  // Busca leisure=sports_centre (centros esportivos) e leisure=pitch (quadras esportivas)
  // além de club=sport e leisure=stadium para máxima fidelidade real.
  let overpassQuery = ''
  if (bbox) {
    const [s, w, n, e] = bbox
    overpassQuery = `
      [out:json][timeout:30];
      (
        node["leisure"="sports_centre"](${s},${w},${n},${e});
        way["leisure"="sports_centre"](${s},${w},${n},${e});
        relation["leisure"="sports_centre"](${s},${w},${n},${e});
        node["leisure"="pitch"](${s},${w},${n},${e});
        way["leisure"="pitch"](${s},${w},${n},${e});
        node["club"="sport"](${s},${w},${n},${e});
        way["club"="sport"](${s},${w},${n},${e});
      );
      out center tags 120;
    `
  } else {
    // Fallback: busca por área administrativa no Overpass
    const safeCity = trimmedCity.replace(/["\\]/g, '')
    overpassQuery = `
      [out:json][timeout:30];
      area["name"="${safeCity}"]["boundary"="administrative"]->.searchArea;
      (
        node["leisure"="sports_centre"](area.searchArea);
        way["leisure"="sports_centre"](area.searchArea);
        relation["leisure"="sports_centre"](area.searchArea);
        node["leisure"="pitch"](area.searchArea);
        way["leisure"="pitch"](area.searchArea);
        node["club"="sport"](area.searchArea);
        way["club"="sport"](area.searchArea);
      );
      out center tags 120;
    `
  }

  let lastError: unknown = null
  let data: OverpassResponse | null = null

  // Tenta os endpoints em sequência
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`Status HTTP ${res.status} ao consultar ${endpoint}`)
      }

      data = await res.json()
      if (data && Array.isArray(data.elements)) {
        break
      }
    } catch (err) {
      lastError = err
      console.warn(`Tentativa no endpoint Overpass ${endpoint} falhou:`, err)
    }
  }

  if (!data || !Array.isArray(data.elements)) {
    throw (
      lastError ||
      new Error(
        'Não foi possível obter dados dos servidores do OpenStreetMap neste momento. Verifique sua conexão e tente novamente.',
      )
    )
  }

  const results: Arena[] = []
  const seenKeys = new Set<string>()

  for (const el of data.elements) {
    const tags = el.tags || {}

    // Resolve o nome real ou gera um descritivo fiel
    const nome = resolveArenaName(tags, el.type, el.id)

    // Deduplicação inteligente: ignora duplicatas com mesmo nome na mesma cidade
    const dedupeKey = `${nome.toLowerCase()}__${(tags['addr:street'] || '').toLowerCase()}`
    if (seenKeys.has(dedupeKey)) continue
    seenKeys.add(dedupeKey)

    const detectedModalidade = mapModalidade(tags)

    // Extração fiel de contatos e telefones
    const rawPhone =
      tags['contact:whatsapp'] ||
      tags.whatsapp ||
      tags['contact:phone'] ||
      tags.phone ||
      tags['contact:mobile'] ||
      tags.mobile ||
      tags['phone:mobile'] ||
      ''

    const email = tags['contact:email'] || tags.email || ''

    const endereco =
      buildAddress(tags) ||
      (tags.description ? tags.description.slice(0, 80) : 'Endereço não informado via OSM')

    const city = tags['addr:city'] || resolvedCityName
    const uf = tags['addr:state'] || resolvedStateCode || 'BR'

    results.push({
      id: `osm-${el.type}-${el.id}`,
      nome,
      modalidade: detectedModalidade,
      whatsApp: cleanPhoneNumber(rawPhone),
      email,
      endereco,
      cidade: city,
      estado: uf,
      status: 'A Contatar',
      ultimoContato: null,
      observacoes: `Capturado via OpenStreetMap (${el.type} #${el.id}) com dados reais da comunidade OSM.`,
      createdAt: new Date().toISOString(),
    })
  }

  // Filtrar por modalidade selecionada pelo usuário se diferente de 'Todos'
  if (modalidade && modalidade !== 'Todos') {
    const filtered = results.filter((r) => r.modalidade === modalidade)
    return filtered
  }

  return results
}
