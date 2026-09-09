import { Arena, HistoricoInteracao, StatusLead, TipoContato } from '../types/crm'
import { SEED_ARENAS, SEED_INTERACOES } from './seedData'
import { buildDynamicWhatsAppLink } from './templates'

const ARENAS_STORAGE_KEY = 'arenalead_arenas_v1'
const INTERACOES_STORAGE_KEY = 'arenalead_interacoes_v1'
const INITIALIZED_KEY = 'arenalead_initialized_v1'

export function getArenas(): Arena[] {
  try {
    const raw = localStorage.getItem(ARENAS_STORAGE_KEY)
    if (!raw) {
      // Check if initialized before; if not, seed
      const initialized = localStorage.getItem(INITIALIZED_KEY)
      if (!initialized) {
        localStorage.setItem(ARENAS_STORAGE_KEY, JSON.stringify(SEED_ARENAS))
        localStorage.setItem(INTERACOES_STORAGE_KEY, JSON.stringify(SEED_INTERACOES))
        localStorage.setItem(INITIALIZED_KEY, 'true')
        return SEED_ARENAS
      }
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Erro ao ler arenas do localStorage:', err)
    return SEED_ARENAS
  }
}

export function saveArenas(arenas: Arena[]): void {
  try {
    localStorage.setItem(ARENAS_STORAGE_KEY, JSON.stringify(arenas))
    window.dispatchEvent(new CustomEvent('arenalead:arenas-updated', { detail: arenas }))
  } catch (err) {
    console.error('Erro ao salvar arenas no localStorage:', err)
  }
}

export function addArena(arena: Omit<Arena, 'id' | 'createdAt'> & { id?: string }): Arena {
  const all = getArenas()
  const newArena: Arena = {
    ...arena,
    id: arena.id || `arena-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  }
  saveArenas([newArena, ...all])
  return newArena
}

export function addMultipleArenas(
  newItems: Array<Omit<Arena, 'id' | 'createdAt'> & { id?: string }>,
): Arena[] {
  const all = getArenas()
  const createdList: Arena[] = newItems.map((item, index) => ({
    ...item,
    id: item.id || `arena-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  }))
  saveArenas([...createdList, ...all])
  return createdList
}

export function updateArena(id: string, updates: Partial<Arena>): Arena | null {
  const all = getArenas()
  let updated: Arena | null = null
  const next = all.map((item) => {
    if (item.id === id) {
      updated = { ...item, ...updates }
      return updated
    }
    return item
  })
  if (updated) {
    saveArenas(next)
  }
  return updated
}

export function deleteArena(id: string): void {
  const all = getArenas()
  const next = all.filter((a) => a.id !== id)
  saveArenas(next)
  // Also clean up interactions
  const allInteractions = getInteracoes()
  saveInteracoes(allInteractions.filter((i) => i.arenaId !== id))
}

export function getInteracoes(): HistoricoInteracao[] {
  try {
    const raw = localStorage.getItem(INTERACOES_STORAGE_KEY)
    if (!raw) {
      return SEED_INTERACOES
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Erro ao ler interações do localStorage:', err)
    return SEED_INTERACOES
  }
}

export function saveInteracoes(interacoes: HistoricoInteracao[]): void {
  try {
    localStorage.setItem(INTERACOES_STORAGE_KEY, JSON.stringify(interacoes))
    window.dispatchEvent(new CustomEvent('arenalead:interacoes-updated', { detail: interacoes }))
  } catch (err) {
    console.error('Erro ao salvar interações no localStorage:', err)
  }
}

export function addInteracao(
  arenaId: string,
  tipo: TipoContato,
  anotacao: string,
  dataRegistro?: string,
): HistoricoInteracao {
  const all = getInteracoes()
  const recordDate = dataRegistro || new Date().toISOString()
  const newInteracao: HistoricoInteracao = {
    id: `interacao-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    arenaId,
    tipo,
    anotacao,
    dataRegistro: recordDate,
  }
  saveInteracoes([newInteracao, ...all])

  // Update arena's ultimoContato
  updateArena(arenaId, { ultimoContato: recordDate })

  return newInteracao
}

const FOLLOWUP_DAYS_KEY = 'replaylead_followup_days_v1'
const DISMISSED_ALERTS_KEY = 'replaylead_dismissed_alerts_v1'

export function getFollowUpDaysPreference(): number {
  try {
    const raw = localStorage.getItem(FOLLOWUP_DAYS_KEY)
    if (!raw) return 7
    const parsed = parseInt(raw, 10)
    return [7, 14, 30].includes(parsed) ? parsed : 7
  } catch {
    return 7
  }
}

export function setFollowUpDaysPreference(days: number): void {
  try {
    localStorage.setItem(FOLLOWUP_DAYS_KEY, String(days))
    window.dispatchEvent(new CustomEvent('arenalead:followup-config-updated', { detail: { days } }))
  } catch (err) {
    console.error('Erro ao salvar preferência de follow-up:', err)
  }
}

export function getDismissedAlerts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function dismissFollowUpAlert(arenaId: string, lastContactIso: string): void {
  try {
    const current = getDismissedAlerts()
    current[arenaId] = lastContactIso || new Date().toISOString()
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(current))
    window.dispatchEvent(new CustomEvent('arenalead:followup-config-updated'))
  } catch (err) {
    console.error('Erro ao dispensar alerta de follow-up:', err)
  }
}

export function clearDismissedAlerts(): void {
  try {
    localStorage.removeItem(DISMISSED_ALERTS_KEY)
    window.dispatchEvent(new CustomEvent('arenalead:followup-config-updated'))
  } catch (err) {
    console.error('Erro ao limpar alertas dispensados:', err)
  }
}

export function resetToSeedData(): void {
  localStorage.setItem(ARENAS_STORAGE_KEY, JSON.stringify(SEED_ARENAS))
  localStorage.setItem(INTERACOES_STORAGE_KEY, JSON.stringify(SEED_INTERACOES))
  localStorage.setItem(INITIALIZED_KEY, 'true')
  window.dispatchEvent(new CustomEvent('arenalead:arenas-updated', { detail: SEED_ARENAS }))
  window.dispatchEvent(new CustomEvent('arenalead:interacoes-updated', { detail: SEED_INTERACOES }))
}

export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  return digits
}

export function formatPhoneNumber(digits?: string | null): string {
  if (!digits) return ''
  const clean = digits.replace(/\D/g, '')
  if (clean.length === 13 && clean.startsWith('55')) {
    // 55 11 99999-9999
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`
  }
  if (clean.length === 12 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  }
  return digits
}

export function formatDateBr(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return 'Nunca contatado'
  try {
    const d = new Date(isoOrDateString)
    if (isNaN(d.getTime())) return isoOrDateString
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return isoOrDateString
  }
}

export function buildWhatsAppLink(
  arenaName: string,
  phone: string,
  arenaContext?: Partial<Arena>,
): string {
  return buildDynamicWhatsAppLink({
    nome: arenaName,
    whatsApp: phone,
    ...(arenaContext || {}),
  })
}
