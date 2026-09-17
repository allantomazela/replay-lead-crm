import { ParceiroInstalador, TipoParceiro } from '@/types/parceiros'
import { cleanPhoneNumber } from '@/lib/format'

interface OverpassElement {
  type: string
  id: number
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

function buildAddress(tags: Record<string, string> = {}): string {
  const street = tags['addr:street'] || tags['addr:road'] || tags['addr:place'] || ''
  const num = tags['addr:housenumber'] || ''
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || ''
  const parts: string[] = []
  if (street) parts.push(num ? `${street}, ${num}` : street)
  if (suburb) parts.push(suburb)
  return parts.join(' - ') || 'Endereço não informado via OSM'
}

function mapTipoParceiro(tags: Record<string, string> = {}): TipoParceiro {
  const craft = (tags.craft || '').toLowerCase()
  const shop = (tags.shop || '').toLowerCase()
  const office = (tags.office || '').toLowerCase()
  const name = (
    tags.name ||
    tags['name:pt'] ||
    tags.operator ||
    tags.description ||
    ''
  ).toLowerCase()
  const all = `${craft} ${shop} ${office} ${name}`

  if (craft === 'electrician' || all.includes('eletric') || all.includes('elétrica')) {
    return 'Eletricista'
  }

  if (
    all.includes('cftv') ||
    all.includes('cctv') ||
    all.includes('câmera') ||
    all.includes('camera') ||
    all.includes('monitoramento') ||
    (shop === 'security' &&
      (all.includes('camera') || all.includes('câmera') || all.includes('cftv')))
  ) {
    return 'Instalador de Câmeras / CFTV'
  }

  if (
    shop === 'security' ||
    office === 'security' ||
    all.includes('alarme') ||
    all.includes('segurança') ||
    all.includes('seguranca') ||
    all.includes('vigilância') ||
    craft === 'locksmith'
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
  return `Parceiro OSM (${type} #${id})`
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
    `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=3&addressdetails=1`,
    {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'ReplayLeadCRM/1.0 (https://replaylead.com.br; contato@replaylead.com.br)',
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

function buildQuery(bbox: [number, number, number, number] | null, cidade: string): string {
  if (bbox) {
    const [s, w, n, e] = bbox
    return `
      [out:json][timeout:30];
      (
        node["craft"="electrician"](${s},${w},${n},${e});
        way["craft"="electrician"](${s},${w},${n},${e});
        node["shop"="security"](${s},${w},${n},${e});
        way["shop"="security"](${s},${w},${n},${e});
        node["office"="security"](${s},${w},${n},${e});
        way["office"="security"](${s},${w},${n},${e});
        node["craft"="electronics"](${s},${w},${n},${e});
        way["craft"="electronics"](${s},${w},${n},${e});
        node["craft"="locksmith"](${s},${w},${n},${e});
        way["craft"="locksmith"](${s},${w},${n},${e});
        node["name"~"cftv|cctv|câmera|camera|alarme|eletricista|segurança",i](${s},${w},${n},${e});
        way["name"~"cftv|cctv|câmera|camera|alarme|eletricista|segurança",i](${s},${w},${n},${e});
      );
      out center tags 120;
    `
  }

  const safeCity = cidade.replace(/["\\]/g, '')
  return `
    [out:json][timeout:30];
    area["name"="${safeCity}"]["boundary"="administrative"]->.searchArea;
    (
      node["craft"="electrician"](area.searchArea);
      way["craft"="electrician"](area.searchArea);
      node["shop"="security"](area.searchArea);
      way["shop"="security"](area.searchArea);
      node["office"="security"](area.searchArea);
      way["office"="security"](area.searchArea);
      node["craft"="electronics"](area.searchArea);
      way["craft"="electronics"](area.searchArea);
      node["craft"="locksmith"](area.searchArea);
      way["craft"="locksmith"](area.searchArea);
      node["name"~"cftv|cctv|câmera|camera|alarme|eletricista|segurança",i](area.searchArea);
      way["name"~"cftv|cctv|câmera|camera|alarme|eletricista|segurança",i](area.searchArea);
    );
    out center tags 120;
  `
}

export async function searchOverpassParceiros({
  cidade,
  estado,
  tipo,
}: {
  cidade: string
  estado: string
  tipo?: string
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

  const overpassQuery = buildQuery(geo.bbox, trimmedCity)
  let lastError: unknown = null
  let data: OverpassResponse | null = null

  for (const endpoint of ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error(`Status HTTP ${res.status}`)
      data = await res.json()
      if (data && Array.isArray(data.elements)) break
    } catch (err) {
      lastError = err
    }
  }

  if (!data?.elements) {
    throw (
      lastError ||
      new Error('Não foi possível obter dados do OpenStreetMap. Tente novamente.')
    )
  }

  const results: ParceiroInstalador[] = []
  const seen = new Set<string>()

  for (const el of data.elements) {
    const tags = el.tags || {}
    const nome = resolveName(tags, el.type, el.id)
    const dedupeKey = `${nome.toLowerCase()}__${(tags['addr:street'] || '').toLowerCase()}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const detectedTipo = mapTipoParceiro(tags)
    const rawPhone =
      tags['contact:whatsapp'] ||
      tags.whatsapp ||
      tags['contact:phone'] ||
      tags.phone ||
      tags['contact:mobile'] ||
      tags.mobile ||
      ''
    const city = tags['addr:city'] || geo.city
    const uf = tags['addr:state'] || geo.uf || 'BR'

    results.push({
      id: `osm-parceiro-${el.type}-${el.id}`,
      nome,
      tipo: detectedTipo,
      whatsApp: cleanPhoneNumber(rawPhone),
      email: tags['contact:email'] || tags.email || '',
      endereco: buildAddress(tags),
      cidade: city,
      estado: uf,
      regioesAtendimento: [city],
      observacoes: `Capturado via OpenStreetMap (${el.type} #${el.id}).`,
      status: 'A Contatar',
      origem: 'osm',
      createdAt: new Date().toISOString(),
    })
  }

  if (tipo && tipo !== 'Todos') {
    return results.filter((r) => r.tipo === tipo)
  }
  return results
}
