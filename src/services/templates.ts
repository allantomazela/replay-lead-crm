import { MessageTemplate, DEFAULT_TEMPLATES } from '@/types/templates'
import { Arena } from '@/types/crm'
import { cleanPhoneNumber } from './storage'

const TEMPLATES_STORAGE_KEY = 'arenalead_message_templates_v1'

export function getTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES))
      return DEFAULT_TEMPLATES
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return DEFAULT_TEMPLATES
  } catch (err) {
    console.error('Erro ao ler modelos de mensagem do localStorage:', err)
    return DEFAULT_TEMPLATES
  }
}

export function saveTemplates(templates: MessageTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
    window.dispatchEvent(new CustomEvent('arenalead:templates-updated', { detail: templates }))
  } catch (err) {
    console.error('Erro ao salvar modelos de mensagem no localStorage:', err)
  }
}

export function getTemplateById(id: string): MessageTemplate | undefined {
  return getTemplates().find((t) => t.id === id)
}

export function getPrimaryTemplate(tipo: 'WhatsApp' | 'E-mail'): MessageTemplate {
  const all = getTemplates()
  const found = all.find((t) => t.tipo === tipo)
  if (found) return found
  const fallback = DEFAULT_TEMPLATES.find((t) => t.tipo === tipo)
  return fallback || DEFAULT_TEMPLATES[0]
}

export function updateTemplate(
  id: string,
  updates: Partial<Omit<MessageTemplate, 'id'>>,
): MessageTemplate | null {
  const all = getTemplates()
  let updated: MessageTemplate | null = null
  const next = all.map((t) => {
    if (t.id === id) {
      updated = {
        ...t,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      return updated
    }
    return t
  })
  if (updated) {
    saveTemplates(next)
  }
  return updated
}

export function resetTemplatesToDefault(): MessageTemplate[] {
  saveTemplates(DEFAULT_TEMPLATES)
  return DEFAULT_TEMPLATES
}

export function resetSingleTemplate(id: string): MessageTemplate | null {
  const def = DEFAULT_TEMPLATES.find((t) => t.id === id)
  if (!def) return null
  return updateTemplate(id, {
    nome: def.nome,
    assunto: def.assunto,
    conteudo: def.conteudo,
    descricao: def.descricao,
  })
}

/**
 * Replaces placeholders [Nome], [Cidade], [Estado], [Modalidade], [Endereco]
 * with the arena's actual data.
 */
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

/**
 * Builds WhatsApp wa.me URL using the current saved template
 */
export function buildDynamicWhatsAppLink(
  arena: Partial<Arena> & { nome: string; whatsApp?: string },
  customTemplateId?: string,
): string {
  const clean = cleanPhoneNumber(arena.whatsApp || '')
  const template = customTemplateId
    ? getTemplateById(customTemplateId) || getPrimaryTemplate('WhatsApp')
    : getPrimaryTemplate('WhatsApp')
  const body = interpolateVariables(template.conteudo, arena)
  return `https://wa.me/${clean}?text=${encodeURIComponent(body)}`
}

/**
 * Builds mailto: link using the current saved email template
 */
export function buildDynamicMailtoLink(
  arena: Partial<Arena> & { nome: string; email?: string },
  customTemplateId?: string,
): string {
  if (!arena.email) return ''
  const template = customTemplateId
    ? getTemplateById(customTemplateId) || getPrimaryTemplate('E-mail')
    : getPrimaryTemplate('E-mail')
  const subject = interpolateVariables(
    template.assunto || 'Proposta de Gravação de Jogadas - ArenaLead',
    arena,
  )
  const body = interpolateVariables(template.conteudo, arena)
  return `mailto:${arena.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}
