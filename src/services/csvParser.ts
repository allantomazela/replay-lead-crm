import { Arena } from '../types/crm'
import { cleanPhoneNumber } from './storage'

export interface CSVParseResult {
  arenas: Arena[]
  headers: string[]
  totalRows: number
}

export function parseArenaCSV(csvContent: string): CSVParseResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { arenas: [], headers: [], totalRows: 0 }
  }

  // Detect delimiter: comma, semicolon or tab
  const headerLine = lines[0]
  let delimiter = ','
  if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';'
  } else if (headerLine.includes('\t')) {
    delimiter = '\t'
  }

  const rawHeaders = splitCSVLine(headerLine, delimiter).map((h) =>
    h.trim().replace(/^["']|["']$/g, ''),
  )

  const normalizeHeader = (h: string) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')

  const headerMap: Record<string, number> = {}
  rawHeaders.forEach((h, index) => {
    headerMap[normalizeHeader(h)] = index
  })

  const findIndex = (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const norm = normalizeHeader(name)
      if (headerMap[norm] !== undefined) {
        return headerMap[norm]
      }
    }
    return -1
  }

  const idxNome = findIndex(['Nome', 'Arena', 'Nome da Arena', 'Estabelecimento'])
  const idxModalidade = findIndex(['Modalidade', 'Esporte', 'Tipo'])
  const idxWhatsApp = findIndex(['WhatsApp', 'Whatsapp', 'Telefone', 'Celular', 'Contato'])
  const idxEmail = findIndex(['Email', 'E-mail', 'Correio'])
  const idxEndereco = findIndex(['Endereco', 'Endereço', 'Logradouro', 'Rua'])
  const idxCidade = findIndex(['Cidade', 'Municipio', 'Município'])
  const idxEstado = findIndex(['Estado', 'UF'])

  const arenas: Arena[] = []

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]
    if (!rawLine.trim()) continue

    const cols = splitCSVLine(rawLine, delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''))

    const getVal = (idx: number) => (idx >= 0 && cols[idx] ? cols[idx].trim() : '')

    const nome = getVal(idxNome) || (idxNome === -1 && cols[0] ? cols[0] : '')
    if (!nome) continue // Skip lines with no name

    const modalidade = getVal(idxModalidade) || 'Beach Tennis'
    const rawPhone = getVal(idxWhatsApp)
    const email = getVal(idxEmail)
    const endereco = getVal(idxEndereco)
    const cidade = getVal(idxCidade)
    const estado = getVal(idxEstado)

    arenas.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      nome,
      modalidade: modalidade || 'Beach Tennis',
      whatsApp: cleanPhoneNumber(rawPhone),
      email: email || '',
      endereco: endereco || '',
      cidade: cidade || '',
      estado: estado ? estado.toUpperCase().slice(0, 2) : '',
      status: 'A Contatar',
      ultimoContato: null,
      observacoes: 'Importado via planilha CSV.',
      createdAt: new Date().toISOString(),
    })
  }

  return {
    arenas,
    headers: rawHeaders,
    totalRows: lines.length - 1,
  }
}

// Simple CSV parser handling quotes
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function exportArenasToCSV(arenas: Arena[], filename = 'replaylead_export.csv'): void {
  const headers = [
    'Nome',
    'Modalidade',
    'WhatsApp',
    'Email',
    'Endereco',
    'Cidade',
    'Estado',
    'Status',
  ]
  const rows = arenas.map((a) => [
    `"${(a.nome || '').replace(/"/g, '""')}"`,
    `"${(a.modalidade || '').replace(/"/g, '""')}"`,
    `"${a.whatsApp || ''}"`,
    `"${(a.email || '').replace(/"/g, '""')}"`,
    `"${(a.endereco || '').replace(/"/g, '""')}"`,
    `"${(a.cidade || '').replace(/"/g, '""')}"`,
    `"${(a.estado || '').replace(/"/g, '""')}"`,
    `"${(a.status || 'A Contatar').replace(/"/g, '""')}"`,
  ])

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
