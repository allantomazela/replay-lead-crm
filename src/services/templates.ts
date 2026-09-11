import { MessageTemplate, DEFAULT_TEMPLATES } from '@/types/templates'
import { Arena } from '@/types/crm'
import { apiFetch } from '@/lib/api'
import { cleanPhoneNumber } from '@/lib/format'

let templatesCache: MessageTemplate[] = []

function emitTemplates(detail: MessageTemplate[]) {
  templatesCache = detail
  window.dispatchEvent(new CustomEvent('arenalead:templates-updated', { detail }))
}

export async function getTemplates(): Promise<MessageTemplate[]> {
  const list = await apiFetch<MessageTemplate[]>('/api/templates')
  templatesCache = list
  return list
}

export async function saveTemplates(templates: MessageTemplate[]): Promise<void> {
  emitTemplates(templates)
}

export async function getTemplateById(id: string): Promise<MessageTemplate | undefined> {
  const all = templatesCache.length ? templatesCache : await getTemplates()
  return all.find((t) => t.id === id)
}

export async function getPrimaryTemplate(tipo: 'WhatsApp' | 'E-mail'): Promise<MessageTemplate> {
  const all = templatesCache.length ? templatesCache : await getTemplates()
  const found = all.find((t) => t.tipo === tipo)
  if (found) return found
  const fallback = DEFAULT_TEMPLATES.find((t) => t.tipo === tipo)
  return fallback || DEFAULT_TEMPLATES[0]
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<MessageTemplate, 'id'>>,
): Promise<MessageTemplate | null> {
  try {
    const updated = await apiFetch<MessageTemplate>(`/api/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const all = await getTemplates()
    emitTemplates(all)
    return updated
  } catch {
    return null
  }
}

export async function resetTemplatesToDefault(): Promise<MessageTemplate[]> {
  const list = await apiFetch<MessageTemplate[]>('/api/templates/reset', { method: 'POST' })
  emitTemplates(list)
  return list
}

export async function resetSingleTemplate(id: string): Promise<MessageTemplate | null> {
  try {
    const updated = await apiFetch<MessageTemplate>(`/api/templates/${id}/reset`, {
      method: 'POST',
    })
    const all = await getTemplates()
    emitTemplates(all)
    return updated
  } catch {
    return null
  }
}

export function interpolateVariables(templateText: string, arena: Partial<Arena>): string {
  if (!templateText) return ''
  const nome = arena.nome || 'Arena'
  const cidade = arena.cidade || 'sua cidade'
  const estado = arena.estado || 'seu estado'
  const modalidade = arena.modalidade || 'esportes de quadra'
  const endereco = arena.endereco || `${cidade}/${estado}`

  return templateText
    .replace(/\[Nome\]/gi, nome)
    .replace(/\[Cidade\]/gi, cidade)
    .replace(/\[Estado\]/gi, estado)
    .replace(/\[Modalidade\]/gi, modalidade)
    .replace(/\[Endereco\]/gi, endereco)
}

export function buildDynamicWhatsAppLink(
  arena: Partial<Arena> & { nome: string; whatsApp?: string },
  customTemplateId?: string,
): string {
  const clean = cleanPhoneNumber(arena.whatsApp || '')
  const template =
    (customTemplateId
      ? templatesCache.find((t) => t.id === customTemplateId)
      : templatesCache.find((t) => t.tipo === 'WhatsApp')) ||
    DEFAULT_TEMPLATES.find((t) => t.tipo === 'WhatsApp') ||
    DEFAULT_TEMPLATES[0]
  const body = interpolateVariables(template.conteudo, arena)
  return `https://wa.me/${clean}?text=${encodeURIComponent(body)}`
}

export function buildDynamicMailtoLink(
  arena: Partial<Arena> & { nome: string; email?: string },
  customTemplateId?: string,
): string {
  if (!arena.email) return ''
  const template =
    (customTemplateId
      ? templatesCache.find((t) => t.id === customTemplateId)
      : templatesCache.find((t) => t.tipo === 'E-mail')) ||
    DEFAULT_TEMPLATES.find((t) => t.tipo === 'E-mail') ||
    DEFAULT_TEMPLATES[0]
  const subject = interpolateVariables(
    template.assunto || 'Proposta de Gravação de Jogadas - ReplayLead',
    arena,
  )
  const body = interpolateVariables(template.conteudo, arena)
  return `mailto:${arena.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}

export async function warmTemplatesCache(): Promise<void> {
  await getTemplates()
}
