import { Arena, HistoricoInteracao, RegiaoSalva, TipoContato } from '../types/crm'
import { apiFetch } from '@/lib/api'
import { cleanPhoneNumber, formatDateBr, formatPhoneNumber } from '@/lib/format'
import { buildDynamicWhatsAppLink } from './templates'

export { cleanPhoneNumber, formatDateBr, formatPhoneNumber }

function emitArenas(detail: Arena[]) {
  window.dispatchEvent(new CustomEvent('arenalead:arenas-updated', { detail }))
}

function emitInteracoes(detail: HistoricoInteracao[]) {
  window.dispatchEvent(new CustomEvent('arenalead:interacoes-updated', { detail }))
}

function emitRegioes(detail: RegiaoSalva[]) {
  window.dispatchEvent(new CustomEvent('replaylead:regioes-updated', { detail }))
  window.dispatchEvent(new CustomEvent('arenalead:regioes-updated', { detail }))
}

function emitFollowUp() {
  window.dispatchEvent(new CustomEvent('arenalead:followup-config-updated'))
}

export async function getArenas(): Promise<Arena[]> {
  return apiFetch<Arena[]>('/api/arenas')
}

export async function saveArenas(_arenas: Arena[]): Promise<void> {
  // Persistência é por item via API; mantido por compatibilidade de eventos.
  emitArenas(_arenas)
}

export async function addArena(
  arena: Omit<Arena, 'id' | 'createdAt'> & { id?: string },
): Promise<Arena> {
  const created = await apiFetch<Arena>('/api/arenas', {
    method: 'POST',
    body: JSON.stringify(arena),
  })
  const all = await getArenas()
  emitArenas(all)
  return created
}

export async function addMultipleArenas(
  newItems: Array<Omit<Arena, 'id' | 'createdAt'> & { id?: string }>,
): Promise<Arena[]> {
  const createdList = await apiFetch<Arena[]>('/api/arenas/bulk', {
    method: 'POST',
    body: JSON.stringify({ items: newItems }),
  })
  const all = await getArenas()
  emitArenas(all)
  return createdList
}

export async function updateArena(id: string, updates: Partial<Arena>): Promise<Arena | null> {
  try {
    const updated = await apiFetch<Arena>(`/api/arenas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const all = await getArenas()
    emitArenas(all)
    return updated
  } catch {
    return null
  }
}

export async function deleteArena(id: string): Promise<void> {
  await apiFetch(`/api/arenas/${id}`, { method: 'DELETE' })
  const all = await getArenas()
  emitArenas(all)
  const interacoes = await getInteracoes()
  emitInteracoes(interacoes)
}

export async function getInteracoes(arenaId?: string): Promise<HistoricoInteracao[]> {
  const query = arenaId ? `?arenaId=${encodeURIComponent(arenaId)}` : ''
  return apiFetch<HistoricoInteracao[]>(`/api/interacoes${query}`)
}

export async function saveInteracoes(interacoes: HistoricoInteracao[]): Promise<void> {
  emitInteracoes(interacoes)
}

export async function addInteracao(
  arenaId: string,
  tipo: TipoContato,
  anotacao: string,
  dataRegistro?: string,
): Promise<HistoricoInteracao> {
  const created = await apiFetch<HistoricoInteracao>('/api/interacoes', {
    method: 'POST',
    body: JSON.stringify({ arenaId, tipo, anotacao, dataRegistro }),
  })
  const interacoes = await getInteracoes()
  emitInteracoes(interacoes)
  const all = await getArenas()
  emitArenas(all)
  return created
}

export async function getFollowUpDaysPreference(): Promise<number> {
  const prefs = await apiFetch<{ followUpDays: number }>('/api/preferences')
  return prefs.followUpDays
}

export async function setFollowUpDaysPreference(days: number): Promise<void> {
  const prefs = await apiFetch<{ followUpDays: number; dismissedAlerts: Record<string, string> }>(
    '/api/preferences',
  )
  await apiFetch('/api/preferences', {
    method: 'PUT',
    body: JSON.stringify({
      followUpDays: days,
      dismissedAlerts: prefs.dismissedAlerts || {},
    }),
  })
  emitFollowUp()
}

export async function getDismissedAlerts(): Promise<Record<string, string>> {
  const prefs = await apiFetch<{ dismissedAlerts: Record<string, string> }>('/api/preferences')
  return prefs.dismissedAlerts || {}
}

export async function dismissFollowUpAlert(arenaId: string, lastContactIso: string): Promise<void> {
  const prefs = await apiFetch<{ followUpDays: number; dismissedAlerts: Record<string, string> }>(
    '/api/preferences',
  )
  const dismissed = { ...(prefs.dismissedAlerts || {}) }
  dismissed[arenaId] = lastContactIso || new Date().toISOString()
  await apiFetch('/api/preferences', {
    method: 'PUT',
    body: JSON.stringify({
      followUpDays: prefs.followUpDays,
      dismissedAlerts: dismissed,
    }),
  })
  emitFollowUp()
}

export async function clearDismissedAlerts(): Promise<void> {
  const prefs = await apiFetch<{ followUpDays: number }>('/api/preferences')
  await apiFetch('/api/preferences', {
    method: 'PUT',
    body: JSON.stringify({
      followUpDays: prefs.followUpDays,
      dismissedAlerts: {},
    }),
  })
  emitFollowUp()
}

export async function getRegioesSalvas(): Promise<RegiaoSalva[]> {
  return apiFetch<RegiaoSalva[]>('/api/regioes')
}

export async function saveRegioesSalvas(regioes: RegiaoSalva[]): Promise<void> {
  emitRegioes(regioes)
}

export async function addRegiaoSalva(
  regiao: Omit<RegiaoSalva, 'id' | 'criadoEm'> & { id?: string },
): Promise<RegiaoSalva> {
  const created = await apiFetch<RegiaoSalva>('/api/regioes', {
    method: 'POST',
    body: JSON.stringify(regiao),
  })
  const all = await getRegioesSalvas()
  emitRegioes(all)
  return created
}

export async function updateRegiaoSalva(
  id: string,
  updates: Partial<RegiaoSalva>,
): Promise<RegiaoSalva | null> {
  try {
    const updated = await apiFetch<RegiaoSalva>(`/api/regioes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const all = await getRegioesSalvas()
    emitRegioes(all)
    return updated
  } catch {
    return null
  }
}

export async function deleteRegiaoSalva(id: string): Promise<void> {
  await apiFetch(`/api/regioes/${id}`, { method: 'DELETE' })
  const all = await getRegioesSalvas()
  emitRegioes(all)
}

export async function resetToSeedData(): Promise<void> {
  // Banco limpo: não há seed. Apenas notifica listeners para recarregar.
  const all = await getArenas()
  emitArenas(all)
  emitInteracoes(await getInteracoes())
  emitRegioes(await getRegioesSalvas())
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
