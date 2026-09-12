/**
 * Amostra real Overpass (Santos/SP) para medir completude de contato no OSM.
 * Rode: node scripts/sample-overpass-contacts.mjs
 */

async function fetchOverpass(query) {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'ReplayLeadCRM/1.0 (validation@replaylead.com.br)',
    Accept: 'application/json',
  }

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: `data=${encodeURIComponent(query)}`,
    })
    console.log('endpoint', endpoint, 'status', res.status)
    if (res.ok) return res.json()
  }
  throw new Error('Todos os endpoints Overpass falharam')
}

async function main() {
  const geoQuery = encodeURIComponent('Santos, SP, Brasil')
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=1&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'ReplayLeadCRM/1.0 (validation@replaylead.com.br)',
        'Accept-Language': 'pt-BR',
      },
    },
  )
  const geo = await geoRes.json()
  if (!geo[0]) {
    console.error('Geocode falhou')
    process.exit(1)
  }

  const [south, north, west, east] = geo[0].boundingbox.map(Number)
  const area = `${south},${west},${north},${east}`
  const q = `
    [out:json][timeout:35];
    (
      node["leisure"="sports_centre"](${area});
      way["leisure"="sports_centre"](${area});
      node["leisure"="pitch"](${area});
      way["leisure"="pitch"](${area});
      node["club"="sport"](${area});
      way["club"="sport"](${area});
    );
    out center tags 120;
  `

  const data = await fetchOverpass(q)
  const els = data.elements || []
  let withPhone = 0
  let withEmail = 0
  let withWeb = 0
  let withName = 0
  const samples = []

  for (const el of els) {
    const t = el.tags || {}
    if (t.name || t['name:pt'] || t.operator) withName++
    const phone =
      t['contact:whatsapp'] ||
      t.whatsapp ||
      t['contact:phone'] ||
      t.phone ||
      t['contact:mobile'] ||
      t.mobile ||
      ''
    const email = t['contact:email'] || t.email || ''
    const web = t.website || t['contact:website'] || ''
    if (phone) withPhone++
    if (email) withEmail++
    if (web) withWeb++
    if ((phone || email || web) && samples.length < 8) {
      samples.push({
        name: t.name || t.operator || String(el.id),
        phone,
        email,
        web,
        sport: t.sport || '',
        leisure: t.leisure || '',
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        city: 'Santos/SP',
        total: els.length,
        withName,
        withPhone,
        withEmail,
        withWeb,
        pctPhone: els.length ? Math.round((100 * withPhone) / els.length) : 0,
        pctEmail: els.length ? Math.round((100 * withEmail) / els.length) : 0,
        pctWeb: els.length ? Math.round((100 * withWeb) / els.length) : 0,
        samples,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
