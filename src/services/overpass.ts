import { Arena } from '../types/crm'
import {
  assessContactQuality,
  normalizeWebsite,
  pickBestEmail,
  pickBestWhatsApp,
} from '@/lib/contact-validation'
import { fetchOverpassJson, type OverpassElement } from './overpassClient'

function mapModalidade(tags: Record<string, string> = {}): string {
  const sport = (tags.sport || '').toLowerCase()
  const leisure = (tags.leisure || '').toLowerCase()
  const name = (tags.name || tags['name:pt'] || tags.operator || '').toLowerCase()
  const description = (tags.description || '').toLowerCase()
  const allText = `${sport} ${leisure} ${name} ${description}`

  if (
    allText.includes('beach tennis') ||
    allText.includes('beachtennis') ||
    allText.includes('beach_tennis') ||
    allText.includes('futevolei') ||
    allText.includes('futevôlei') ||
    allText.includes('footvolley') ||
    sport.includes('beach_volleyball') ||
    (allText.includes('beach') && allText.includes('tennis')) ||
    (allText.includes('areia') && (allText.includes('tennis') || allText.includes('tenis')))
  ) {
    return 'Beach Tennis'
  }

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

  if (
    allText.includes('volei') ||
    allText.includes('vôlei') ||
    allText.includes('volleyball') ||
    sport.includes('volleyball')
  ) {
    return 'Vôlei'
  }

  if (
    sport.includes('tennis') ||
    allText.includes('tenis') ||
    allText.includes('tênis') ||
    sport.includes('padel')
  ) {
    return 'Beach Tennis'
  }

  return 'Outro'
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
  if (leisure === 'sports_centre' || leisure === 'stadium') {
    return `Centro Esportivo (#${id})`
  }
  return `Arena sem nome (OSM ${type} #${id})`
}

function extractWebsite(tags: Record<string, string>): string {
  return normalizeWebsite(
    tags['contact:website'] || tags.website || tags.url || tags['contact:facebook'] || '',
  )
}

function buildObservacoes(params: {
  type: string
  id: number
  website?: string
  instagram?: string
  qualityLabel: string
  issues: string[]
}): string {
  const lines = [
    `Capturado via OpenStreetMap (${params.type} #${params.id}).`,
    `Qualidade de contato: ${params.qualityLabel}.`,
  ]
  if (params.website) lines.push(`Website: ${params.website}`)
  if (params.instagram) lines.push(`Instagram: ${params.instagram}`)
  if (params.issues.length > 0) {
    lines.push(`Alertas: ${params.issues.join('; ')}`)
  }
  return lines.join(' ')
}

function buildOverpassQuery(
  bbox: [number, number, number, number] | null,
  city: string,
  mode: 'light' | 'full' = 'light',
): string {
  const lightBlocks = `
        node["leisure"="sports_centre"](__AREA__);
        way["leisure"="sports_centre"](__AREA__);
        relation["leisure"="sports_centre"](__AREA__);
        node["leisure"="stadium"](__AREA__);
        way["leisure"="stadium"](__AREA__);
        node["club"="sport"](__AREA__);
        way["club"="sport"](__AREA__);
  `
  const fullExtra = `
        node["leisure"="pitch"](__AREA__);
        way["leisure"="pitch"](__AREA__);
        node["leisure"="fitness_centre"](__AREA__);
        way["leisure"="fitness_centre"](__AREA__);
  `
  const blocks = mode === 'full' ? `${lightBlocks}${fullExtra}` : lightBlocks
  const limit = mode === 'full' ? 200 : 120

  if (bbox) {
    const [s, w, n, e] = bbox
    const area = `${s},${w},${n},${e}`
    return `
      [out:json][timeout:50];
      (
        ${blocks.replaceAll('__AREA__', area)}
      );
      out center tags ${limit};
    `
  }

  const safeCity = city.replace(/["\\]/g, '')
  return `
    [out:json][timeout:50];
    area["name"="${safeCity}"]["boundary"="administrative"]->.searchArea;
    (
      ${blocks.replaceAll('__AREA__', 'area.searchArea')}
    );
    out center tags ${limit};
  `
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
        const place =
          geoData.find(
            (p) =>
              p.type === 'administrative' ||
              p.class === 'boundary' ||
              p.type === 'city' ||
              p.type === 'town' ||
              p.type === 'municipality',
          ) || geoData[0]

        if (place?.boundingbox?.length === 4) {
          const south = parseFloat(place.boundingbox[0])
          const north = parseFloat(place.boundingbox[1])
          const west = parseFloat(place.boundingbox[2])
          const east = parseFloat(place.boundingbox[3])
          if (!isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east)) {
            bbox = [south, west, north, east]
          }
        }

        if (place?.address) {
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

  // Consulta leve primeiro (evita 504 em cidades grandes); amplia se vier pouco resultado
  let data = await fetchOverpassJson(buildOverpassQuery(bbox, trimmedCity, 'light'))
  if ((data.elements?.length || 0) < 8) {
    try {
      const fuller = await fetchOverpassJson(buildOverpassQuery(bbox, trimmedCity, 'full'))
      if ((fuller.elements?.length || 0) > (data.elements?.length || 0)) {
        data = fuller
      }
    } catch (err) {
      console.warn('Consulta Overpass ampliada falhou; mantendo resultado leve:', err)
    }
  }

  if (!data || !Array.isArray(data.elements)) {
    throw new Error(
      'Não foi possível obter dados dos servidores do OpenStreetMap neste momento. Verifique sua conexão e tente novamente.',
    )
  }

  const results: Arena[] = []
  const seenKeys = new Set<string>()

  for (const el of data.elements) {
    const tags = el.tags || {}
    const nome = resolveArenaName(tags, el.type, el.id)
    const dedupeKey = `${nome.toLowerCase()}__${(tags['addr:street'] || '').toLowerCase()}`
    if (seenKeys.has(dedupeKey)) continue
    seenKeys.add(dedupeKey)

    const whatsApp = pickBestWhatsApp([
      tags['contact:whatsapp'],
      tags.whatsapp,
      tags['contact:mobile'],
      tags.mobile,
      tags['phone:mobile'],
      tags['contact:phone'],
      tags.phone,
    ])

    const email = pickBestEmail([tags['contact:email'], tags.email])
    const website = extractWebsite(tags)
    const instagram = tags['contact:instagram'] || tags.instagram || ''

    const endereco =
      buildAddress(tags) ||
      (tags.description ? tags.description.slice(0, 80) : 'Endereço não informado via OSM')

    const contactQuality = assessContactQuality({
      whatsApp,
      email,
      website,
      endereco,
    })

    results.push({
      id: `osm-${el.type}-${el.id}`,
      osmId: `${el.type}/${el.id}`,
      nome,
      modalidade: mapModalidade(tags),
      whatsApp,
      email,
      website: website || undefined,
      endereco,
      cidade: tags['addr:city'] || resolvedCityName,
      estado: tags['addr:state'] || resolvedStateCode || 'BR',
      status: 'A Contatar',
      ultimoContato: null,
      observacoes: buildObservacoes({
        type: el.type,
        id: el.id,
        website,
        instagram,
        qualityLabel: `${contactQuality.level} (${contactQuality.score}/100)`,
        issues: contactQuality.issues,
      }),
      contactQuality,
      createdAt: new Date().toISOString(),
    })
  }

  results.sort((a, b) => (b.contactQuality?.score || 0) - (a.contactQuality?.score || 0))

  if (modalidade && modalidade !== 'Todos') {
    return results.filter((r) => r.modalidade === modalidade)
  }

  return results
}
