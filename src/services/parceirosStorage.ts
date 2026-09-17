import { ParceiroInstalador, RegiaoParceiroSalva } from '@/types/parceiros'
import { apiFetch } from '@/lib/api'

function emitParceiros(detail: ParceiroInstalador[]) {
  window.dispatchEvent(new CustomEvent('replaylead:parceiros-updated', { detail }))
}

function emitRegioesParceiros(detail: RegiaoParceiroSalva[]) {
  window.dispatchEvent(new CustomEvent('replaylead:regioes-parceiros-updated', { detail }))
}

export async function getParceiros(params?: {
  cidade?: string
  estado?: string
  tipo?: string
  q?: string
}): Promise<ParceiroInstalador[]> {
  const search = new URLSearchParams()
  if (params?.cidade) search.set('cidade', params.cidade)
  if (params?.estado) search.set('estado', params.estado)
  if (params?.tipo) search.set('tipo', params.tipo)
  if (params?.q) search.set('q', params.q)
  const query = search.toString()
  return apiFetch<ParceiroInstalador[]>(`/api/instaladores${query ? `?${query}` : ''}`)
}

export async function addParceiro(
  parceiro: Omit<ParceiroInstalador, 'id' | 'createdAt'> & { id?: string },
): Promise<ParceiroInstalador> {
  const created = await apiFetch<ParceiroInstalador>('/api/instaladores', {
    method: 'POST',
    body: JSON.stringify(parceiro),
  })
  emitParceiros(await getParceiros())
  return created
}

export async function addMultipleParceiros(
  items: Array<Omit<ParceiroInstalador, 'id' | 'createdAt'> & { id?: string }>,
): Promise<ParceiroInstalador[]> {
  const created = await apiFetch<ParceiroInstalador[]>('/api/instaladores/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  emitParceiros(await getParceiros())
  return created
}

export async function updateParceiro(
  id: string,
  updates: Partial<ParceiroInstalador>,
): Promise<ParceiroInstalador | null> {
  try {
    const updated = await apiFetch<ParceiroInstalador>(`/api/instaladores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    emitParceiros(await getParceiros())
    return updated
  } catch {
    return null
  }
}

export async function deleteParceiro(id: string): Promise<void> {
  await apiFetch(`/api/instaladores/${id}`, { method: 'DELETE' })
  emitParceiros(await getParceiros())
}

export async function getRegioesParceiros(): Promise<RegiaoParceiroSalva[]> {
  return apiFetch<RegiaoParceiroSalva[]>('/api/regioes-parceiros')
}

export async function addRegiaoParceiro(
  regiao: Omit<RegiaoParceiroSalva, 'id' | 'criadoEm'> & { id?: string },
): Promise<RegiaoParceiroSalva> {
  const created = await apiFetch<RegiaoParceiroSalva>('/api/regioes-parceiros', {
    method: 'POST',
    body: JSON.stringify(regiao),
  })
  emitRegioesParceiros(await getRegioesParceiros())
  return created
}

export async function updateRegiaoParceiro(
  id: string,
  updates: Partial<RegiaoParceiroSalva>,
): Promise<RegiaoParceiroSalva | null> {
  try {
    const updated = await apiFetch<RegiaoParceiroSalva>(`/api/regioes-parceiros/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    emitRegioesParceiros(await getRegioesParceiros())
    return updated
  } catch {
    return null
  }
}

export async function deleteRegiaoParceiro(id: string): Promise<void> {
  await apiFetch(`/api/regioes-parceiros/${id}`, { method: 'DELETE' })
  emitRegioesParceiros(await getRegioesParceiros())
}

export async function searchParceirosPlaces(params: {
  cidade: string
  estado: string
  tipo?: string
  onlyWithPhone?: boolean
}): Promise<{
  results: ParceiroInstalador[]
  queries: string[]
  withPhone: number
}> {
  return apiFetch('/api/parceiros/places-search', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** @deprecated Use searchParceirosPlaces (Geoapify) */
export async function searchParceirosGoogle(params: {
  cidade: string
  estado: string
  tipo?: string
  onlyWithPhone?: boolean
}): Promise<{
  results: ParceiroInstalador[]
  queries: string[]
  withPhone: number
}> {
  return searchParceirosPlaces(params)
}
