import { ParceiroInstalador, TipoParceiro } from '@/types/parceiros'
import { cleanPhoneNumber } from '@/lib/format'
import { fetchOverpassJson, type OverpassElement } from './overpassClient'

const NAME_REGEX =
  'cftv|cctv|c[aâ]mera|camera|alarme|eletric|el[eé]tric|seguran[cç]a|monitoramento|vigil[aâ]ncia|circuito fechado|chaveiro'

const NOISE_NAME =
  /americanas|magazine\s*luiza|magalu|casas\s*bahia|carrefour|polishop|sam'?s\s*club|atacad|extra\s*hiper|i\s*place/i

function buildAddress(tags: Record<string, string> = {}): string {
  const street = tags['addr:street'] || tags['addr:road'] || tags['addr:place'] || ''
  const num = tags['addr:housenumber'] || ''
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || ''
  const parts: string[] = []
  if (street) parts.push(num ? `${street}, ${num}` : street)
  if (suburb) parts.push(suburb)
  return parts.join(' - ') || 'Endereço não informado via OSM'
}

function textBlob(tags: Record<string, string> = {}): string {
  return [
    tags.craft,
    tags.shop,
    tags.office,
    tags.amenity,
    tags.name,
    tags['name:pt'],
    tags.operator,
    tags.brand,
    tags.description,
    tags['company'],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function mapTipoParceiro(tags: Record<string, string> = {}): TipoParceiro {
  const craft = (tags.craft || '').toLowerCase()
  const shop = (tags.shop || '').toLowerCase()
  const office = (tags.office || '').toLowerCase()
  const all = textBlob(tags)

  if (craft === 'electrician' || all.includes('eletric') || all.includes('elétrica') || all.includes('eletrica')) {
    return 'Eletricista'
  }

  if (
    /cftv|cctv|c[aâ]mera|camera|monitoramento|circuito fechado/.test(all) ||
    (shop === 'security' && /camera|c[aâ]mera|cftv|cctv/.test(all))
  ) {
    return 'Instalador de Câmeras / CFTV'
  }

  if (
    shop === 'security' ||
    office === 'security' ||
    craft === 'locksmith' ||
    /alarme|seguran[cç]a|vigil[aâ]ncia|chaveiro/.test(all)
  ) {
    return 'Instalador de Segurança'
  }

  return 'Instalador de Câmeras / CFTV'
}

function resolveName(tags: Record<string, string>, type: string, id: number): string {
  const candidate =
    tags.name ||
    tags['name:pt'] ||
    tags.official_name ||
    tags.alt_name ||
    tags.operator ||
    tags.brand ||
    ''
  if (candidate.trim()) return candidate.trim()
  const craft = tags.craft ? tags.craft.replace(/_/g, ' ') : ''
  if (craft) return `Profissional (${craft})`
  const shop = tags.shop ? tags.shop.replace(/_/g, ' ') : ''
  if (shop) return `Loja (${shop})`
  return `Parceiro OSM (${type} #${id})`
}

function extractPhone(tags: Record<string, string>): string {
  const candidates = [
    tags['contact:whatsapp'],
    tags.whatsapp,
    tags['contact:mobile'],
    tags.mobile,
    tags['phone:mobile'],
    tags['contact:phone'],
    tags.phone,
    tags['phone:1'],
    tags['contact:phone:mobile'],
  ]
  for (const raw of candidates) {
    const cleaned = cleanPhoneNumber(raw)
    if (cleaned) return cleaned
  }
  return ''
}

function extractWebsite(tags: Record<string, string>): string {
  const raw = tags.website || tags['contact:website'] || tags.url || tags['contact:facebook'] || ''
  return raw.trim()
}

function isNoise(nome: string): boolean {
  return NOISE_NAME.test(nome)
}

function hasUsefulIdentity(tags: Record<string, string>): boolean {
  return Boolean(
    tags.name ||
      tags['name:pt'] ||
      tags.official_name ||
      tags.operator ||
      tags.brand ||
      tags.craft ||
      tags.shop ||
      tags.office,
  )
}

async function geocodeCity(
  cidade: string,
  estado: string,
): Promise<{
  bbox: [number, number, number, number] | null
  city: string
  uf: string
}> {
  let bbox: [number, number, number, number] | null = null
  let resolvedCity = cidade
  let resolvedUf = estado.toUpperCase()

  const geoQuery = encodeURIComponent(`${cidade}${estado ? `, ${estado}` : ''}, Brasil`)
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=5&addressdetails=1&countrycodes=br`,
    {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'ReplayLeadCRM/1.0 (https://www.sistemascuesta.com.br; contato@replaylead.com.br)',
      },
    },
  )

  if (!geoRes.ok) return { bbox, city: resolvedCity, uf: resolvedUf }

  const geoData = await geoRes.json()
  if (!Array.isArray(geoData) || geoData.length === 0) {
    throw new Error(
      `Cidade "${cidade}${estado ? ` - ${estado}` : ''}" não foi encontrada no mapa.`,
    )
  }

  const place =
    geoData.find(
      (p: { type?: string; class?: string }) =>
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
    if (![south, north, west, east].some(Number.isNaN)) {
      bbox = [south, west, north, east]
    }
  }

  if (place?.address) {
    resolvedCity =
      place.address.city || place.address.town || place.address.municipality || resolvedCity
    if (place.address['ISO3166-2-lvl4']) {
      resolvedUf = place.address['ISO3166-2-lvl4'].replace('BR-', '')
    }
  }

  return { bbox, city: resolvedCity, uf: resolvedUf }
}

function buildSelectors(areaOrBbox: string, mode: 'light' | 'full'): string {
  const core = `
      node["craft"="electrician"]${areaOrBbox};
      way["craft"="electrician"]${areaOrBbox};
      node["shop"="security"]${areaOrBbox};
      way["shop"="security"]${areaOrBbox};
      node["office"="security"]${areaOrBbox};
      way["office"="security"]${areaOrBbox};
      node["craft"="electronics"]${areaOrBbox};
      way["craft"="electronics"]${areaOrBbox};
      node["craft"="locksmith"]${areaOrBbox};
      way["craft"="locksmith"]${areaOrBbox};
      node["shop"="electrical"]${areaOrBbox};
      way["shop"="electrical"]${areaOrBbox};
  `
  if (mode === 'light') return core
  return `
      ${core}
      node["shop"="electronics"]${areaOrBbox};
      way["shop"="electronics"]${areaOrBbox};
      node["name"~"${NAME_REGEX}",i]${areaOrBbox};
      way["name"~"${NAME_REGEX}",i]${areaOrBbox};
  `
}

function buildQuery(
  bbox: [number, number, number, number] | null,
  cidade: string,
  mode: 'light' | 'full' = 'light',
): string {
  const limit = mode === 'full' ? 160 : 100
  if (bbox) {
    const [s, w, n, e] = bbox
    const area = `(${s},${w},${n},${e})`
    return `
      [out:json][timeout:50];
      (
        ${buildSelectors(area, mode)}
      );
      out center tags ${limit};
    `
  }

  const safeCity = cidade.replace(/["\\]/g, '')
  return `
    [out:json][timeout:50];
    area["name"="${safeCity}"]["boundary"="administrative"]->.searchArea;
    (
      ${buildSelectors('(area.searchArea)', mode)}
    );
    out center tags ${limit};
  `
}

function contactScore(p: ParceiroInstalador): number {
  let score = 0
  if (p.whatsApp) score += 3
  if (p.email) score += 1
  if (p.observacoes?.includes('Site:')) score += 1
  if (p.endereco && !p.endereco.includes('não informado')) score += 1
  return score
}

export async function searchOverpassParceiros({
  cidade,
  estado,
  tipo,
  onlyWithPhone = false,
}: {
  cidade: string
  estado: string
  tipo?: string
  onlyWithPhone?: boolean
}): Promise<ParceiroInstalador[]> {
  const trimmedCity = cidade.trim()
  const trimmedState = estado.trim()
  if (!trimmedCity) throw new Error('Informe a cidade para realizar a busca no mapa.')

  let geo: { bbox: [number, number, number, number] | null; city: string; uf: string }
  try {
    geo = await geocodeCity(trimmedCity, trimmedState)
  } catch (err) {
    if (err instanceof Error && err.message.includes('não foi encontrada')) throw err
    geo = { bbox: null, city: trimmedCity, uf: trimmedState.toUpperCase() || 'BR' }
  }

  const overpassQuery = buildQuery(geo.bbox, trimmedCity, 'light')
  let data = await fetchOverpassJson(overpassQuery)
  if ((data.elements?.length || 0) < 5) {
    try {
      const fuller = await fetchOverpassJson(buildQuery(geo.bbox, trimmedCity, 'full'))
      if ((fuller.elements?.length || 0) > (data.elements?.length || 0)) {
        data = fuller
      }
    } catch (err) {
      console.warn('Consulta Overpass ampliada de parceiros falhou; mantendo resultado leve:', err)
    }
  }

  if (!data?.elements) {
    throw new Error('Não foi possível obter dados do OpenStreetMap. Tente novamente.')
  }

  const results: ParceiroInstalador[] = []
  const seen = new Set<string>()

  for (const el of data.elements) {
    const tags = el.tags || {}
    if (!hasUsefulIdentity(tags)) continue

    const nome = resolveName(tags, el.type, el.id)
    if (isNoise(nome)) continue

    const dedupeKey = `${nome.toLowerCase()}__${(tags['addr:street'] || '').toLowerCase()}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const detectedTipo = mapTipoParceiro(tags)
    const phone = extractPhone(tags)
    const email = tags['contact:email'] || tags.email || ''
    const website = extractWebsite(tags)
    const city = tags['addr:city'] || geo.city
    const uf = (tags['addr:state'] || geo.uf || 'BR').toUpperCase().replace(/^BR-/, '')

    const extras = [
      website ? `Site: ${website}` : '',
      email ? `E-mail OSM: ${email}` : '',
      phone ? 'Telefone encontrado no mapa.' : 'Sem telefone no OSM — complete no cadastro se necessário.',
    ]
      .filter(Boolean)
      .join(' ')

    results.push({
      id: `osm-parceiro-${el.type}-${el.id}`,
      nome,
      tipo: detectedTipo,
      whatsApp: phone,
      email,
      endereco: buildAddress(tags),
      cidade: city,
      estado: uf,
      regioesAtendimento: [city],
      observacoes: `Capturado via OpenStreetMap (${el.type} #${el.id}). ${extras}`,
      status: 'A Contatar',
      origem: 'osm',
      createdAt: new Date().toISOString(),
    })
  }

  let filtered = results
  if (tipo && tipo !== 'Todos') {
    filtered = results.filter((r) => r.tipo === tipo)
  }

  if (onlyWithPhone) {
    const withPhone = filtered.filter((r) => Boolean(r.whatsApp))
    // Soft fallback: se o filtro esvaziar, devolve todos ordenados
    filtered = withPhone.length > 0 ? withPhone : filtered
  }

  filtered.sort((a, b) => {
    const scoreDiff = contactScore(b) - contactScore(a)
    if (scoreDiff !== 0) return scoreDiff
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  return filtered
}
