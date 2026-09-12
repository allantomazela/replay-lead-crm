/**
 * Validação unitária da lógica de contato.
 * Rode: node scripts/validate-contact.mjs
 */

function cleanPhoneNumber(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function splitRawContactValues(raw) {
  if (!raw?.trim()) return []
  return raw
    .split(/[;,|/]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

function isValidEmail(email) {
  const value = normalizeEmail(email)
  return Boolean(value) && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)
}

function isValidBrazilianWhatsApp(digits) {
  if (!digits) return false
  const clean = digits.replace(/\D/g, '')
  return clean.startsWith('55') && clean.length === 13 && clean[4] === '9'
}

function isValidBrazilianPhone(digits) {
  if (!digits) return false
  const clean = digits.replace(/\D/g, '')
  if (!clean.startsWith('55')) return clean.length === 10 || clean.length === 11
  return clean.length === 12 || clean.length === 13
}

function pickBestWhatsApp(rawCandidates) {
  const normalized = []
  for (const raw of rawCandidates) {
    for (const part of splitRawContactValues(raw)) {
      const digits = cleanPhoneNumber(part)
      if (digits) normalized.push(digits)
    }
  }
  const unique = [...new Set(normalized)]
  const mobiles = unique.filter(isValidBrazilianWhatsApp)
  if (mobiles.length) return mobiles[0]
  const phones = unique.filter(isValidBrazilianPhone)
  if (phones.length) return phones[0]
  return unique[0] || ''
}

function pickBestEmail(rawCandidates) {
  for (const raw of rawCandidates) {
    for (const part of splitRawContactValues(raw)) {
      const email = normalizeEmail(part)
      if (isValidEmail(email)) return email
    }
  }
  return ''
}

function assessContactQuality(input) {
  const whatsApp = (input.whatsApp || '').replace(/\D/g, '')
  const email = normalizeEmail(input.email)
  const hasValidWhatsApp = isValidBrazilianWhatsApp(whatsApp)
  const hasValidEmail = isValidEmail(email)
  let score = 0
  if (hasValidWhatsApp) score += 45
  else if (whatsApp) score += 15
  if (hasValidEmail) score += 30
  if (input.website) score += 15
  if (input.endereco && !String(input.endereco).toLowerCase().includes('não informado')) score += 10
  return {
    score,
    readyToContact: hasValidWhatsApp || hasValidEmail,
    level: score >= 70 ? 'alto' : score >= 40 ? 'medio' : score > 0 ? 'baixo' : 'sem_contato',
  }
}

const asserts = []
function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    asserts.push(`FAIL ${label}: got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`)
  } else {
    asserts.push(`OK   ${label}`)
  }
}

assertEqual(pickBestWhatsApp(['(11) 3333-4444; (11) 98888-7777']), '5511988887777', 'prioriza celular')
assertEqual(isValidBrazilianWhatsApp('5511988887777'), true, 'whatsapp válido')
assertEqual(isValidBrazilianWhatsApp('551133334444'), false, 'fixo não é whatsapp')
assertEqual(pickBestEmail(['foo@bar', 'arena@replay.com.br']), 'arena@replay.com.br', 'e-mail válido')
assertEqual(
  assessContactQuality({
    whatsApp: '5511988887777',
    email: 'arena@replay.com.br',
    website: 'https://x.com',
    endereco: 'Rua A',
  }).level,
  'alto',
  'score alto',
)
assertEqual(
  assessContactQuality({ whatsApp: '', email: '', endereco: 'Endereço não informado via OSM' })
    .readyToContact,
  false,
  'sem contato',
)

const failed = asserts.filter((a) => a.startsWith('FAIL'))
console.log(asserts.join('\n'))
if (failed.length) {
  console.error(`\n${failed.length} falha(s)`)
  process.exit(1)
}
console.log('\nValidação unitária OK')
