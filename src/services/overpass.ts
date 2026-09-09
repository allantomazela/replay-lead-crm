import { Arena } from '../types/crm'
import { cleanPhoneNumber } from './storage'

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
  const name = (tags.name || '').toLowerCase()
  const description = (tags.description || '').toLowerCase()
  const allText = `${sport} ${leisure} ${name} ${description}`

  if (
    allText.includes('beach') ||
    allText.includes('areia') ||
    allText.includes('futevolei') ||
    allText.includes('futevôlei') ||
    sport.includes('beach_volleyball')
  ) {
    return 'Beach Tennis'
  }
  if (
    allText.includes('society') ||
    allText.includes('futebol') ||
    allText.includes('soccer') ||
    sport.includes('soccer') ||
    sport.includes('football')
  ) {
    return 'Futebol Society'
  }
  if (allText.includes('volei') || allText.includes('vôlei') || sport.includes('volleyball')) {
    return 'Vôlei'
  }
  if (sport.includes('tennis') || allText.includes('tenis') || allText.includes('tênis')) {
    return 'Beach Tennis'
  }
  return 'Beach Tennis'
}

function buildAddress(tags: Record<string, string> = {}): string {
  const street = tags['addr:street'] || tags['addr:road'] || ''
  const num = tags['addr:housenumber'] || ''
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || ''

  const parts = []
  if (street) {
    parts.push(num ? `${street}, ${num}` : street)
  }
  if (suburb) {
    parts.push(suburb)
  }
  return parts.join(' - ')
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

  // We can query Overpass directly using area search.
  // Overpass has public endpoints: https://overpass-api.de/api/interpreter
  // Fallbacks: https://maps.mail.ru/osm/tools/overpass/api/interpreter or https://overpass.kumi.systems/api/interpreter
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]

  // Try Nominatim geocoding first to get a bounding box or osm_id for reliability
  let bbox: [number, number, number, number] | null = null
  try {
    const geoQuery = encodeURIComponent(
      `${trimmedCity}${trimmedState ? `, ${trimmedState}` : ''}, Brasil`,
    )
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent': 'ArenaLeadCRM/1.0',
        },
      },
    )
    if (geoRes.ok) {
      const geoData = await geoRes.json()
      if (Array.isArray(geoData) && geoData.length > 0) {
        const place = geoData[0]
        if (place.boundingbox && place.boundingbox.length === 4) {
          // Nominatim boundingbox format: [south, north, west, east]
          const south = parseFloat(place.boundingbox[0])
          const north = parseFloat(place.boundingbox[1])
          const west = parseFloat(place.boundingbox[2])
          const east = parseFloat(place.boundingbox[3])
          if (!isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east)) {
            bbox = [south, west, north, east] // overpass bbox: south, west, north, east
          }
        }
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode fallback to area search:', err)
  }

  // Construct Overpass query
  let overpassQuery = ''
  if (bbox) {
    const [s, w, n, e] = bbox
    overpassQuery = `
      [out:json][timeout:25];
      (
        node["leisure"="sports_centre"](${s},${w},${n},${e});
        way["leisure"="sports_centre"](${s},${w},${n},${e});
        relation["leisure"="sports_centre"](${s},${w},${n},${e});
        node["leisure"="pitch"](${s},${w},${n},${e});
        way["leisure"="pitch"](${s},${w},${n},${e});
      );
      out center 80;
    `
  } else {
    // Area search by city name
    const safeCity = trimmedCity.replace(/"/g, '')
    overpassQuery = `
      [out:json][timeout:25];
      area["name"="${safeCity}"]["boundary"="administrative"]->.searchArea;
      (
        node["leisure"="sports_centre"](area.searchArea);
        way["leisure"="sports_centre"](area.searchArea);
        relation["leisure"="sports_centre"](area.searchArea);
        node["leisure"="pitch"](area.searchArea);
        way["leisure"="pitch"](area.searchArea);
      );
      out center 80;
    `
  }

  let lastError: unknown = null
  let data: OverpassResponse | null = null

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      })

      if (!res.ok) {
        throw new Error(`Status HTTP ${res.status} ao consultar Overpass`)
      }

      data = await res.json()
      if (data && Array.isArray(data.elements)) {
        break
      }
    } catch (err) {
      lastError = err
      console.warn(`Tentativa em ${endpoint} falhou:`, err)
    }
  }

  if (!data || !Array.isArray(data.elements)) {
    throw (
      lastError ||
      new Error('Não foi possível obter dados da API do OpenStreetMap. Verifique sua conexão.')
    )
  }

  const results: Arena[] = []
  const seenNames = new Set<string>()

  for (const el of data.elements) {
    const tags = el.tags || {}
    const rawName = tags.name || tags['name:pt'] || tags.operator || tags.description
    if (!rawName) continue // skip nameless features

    const nome = rawName.trim()
    const key = nome.toLowerCase()
    if (seenNames.has(key)) continue
    seenNames.add(key)

    const detectedModalidade = mapModalidade(tags)
    if (modalidade && modalidade !== 'Todos' && detectedModalidade !== modalidade) {
      // If user filtered by a specific modalidade, only keep matches
      // But if user has few matches, we could be lenient if tags.sport matches
    }

    const rawPhone =
      tags.phone ||
      tags['contact:phone'] ||
      tags['contact:whatsapp'] ||
      tags['contact:mobile'] ||
      ''
    const email = tags.email || tags['contact:email'] || ''
    const endereco =
      buildAddress(tags) ||
      (tags.description ? tags.description.slice(0, 60) : 'Endereço não informado via OSM')
    const city = tags['addr:city'] || trimmedCity
    const uf = tags['addr:state'] || trimmedState.toUpperCase() || 'BR'

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
      observacoes: `Capturado via OpenStreetMap (${el.type} #${el.id}). tags: ${Object.keys(tags).slice(0, 5).join(', ')}`,
      createdAt: new Date().toISOString(),
    })
  }

  // Filter by user selected modalidade if specified and not 'Todos'
  if (modalidade && modalidade !== 'Todos') {
    const filtered = results.filter((r) => r.modalidade === modalidade)
    // If strict filter leaves some results, return them; otherwise return all with user informed
    return filtered.length > 0 ? filtered : results
  }

  return results
}
