import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Mail,
  Edit3,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Info,
  Send,
  Eye,
  PlusCircle,
  FileText,
  Clock,
} from 'lucide-react'
import { MessageTemplate, TEMPLATE_VARIABLES } from '@/types/templates'
import {
  getTemplates,
  updateTemplate,
  resetTemplatesToDefault,
  resetSingleTemplate,
  interpolateVariables,
} from '@/services/templates'
import { getArenas, formatDateBr } from '@/services/storage'
import { Arena } from '@/types/crm'
import { useToast } from '@/hooks/use-toast'

export default function Mensagens() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formAssunto, setFormAssunto] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null)
  const [selectedArenaPreviewId, setSelectedArenaPreviewId] = useState<string>('')
  const [arenas, setArenas] = useState<Arena[]>([])

  const loadTemplates = async () => {
    const list = await getTemplates()
    setTemplates(list)
  }

  useEffect(() => {
    void loadTemplates()
    void getArenas().then(setArenas)

    const handleTemplatesUpdated = () => {
      void loadTemplates()
    }
    const handleArenasUpdated = () => {
      void getArenas().then(setArenas)
    }

    window.addEventListener('arenalead:templates-updated', handleTemplatesUpdated)
    window.addEventListener('arenalead:arenas-updated', handleArenasUpdated)
    return () => {
      window.removeEventListener('arenalead:templates-updated', handleTemplatesUpdated)
      window.removeEventListener('arenalead:arenas-updated', handleArenasUpdated)
    }
  }, [])

  const handleOpenEdit = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl)
    setFormNome(tpl.nome)
    setFormAssunto(tpl.assunto || '')
    setFormConteudo(tpl.conteudo)
    setFormDescricao(tpl.descricao || '')
  }

  const handleCloseModal = () => {
    setEditingTemplate(null)
  }

  const handleInsertVariable = (tag: string) => {
    setFormConteudo((prev) => `${prev}${tag}`)
    setCopiedVariable(tag)
    setTimeout(() => setCopiedVariable(null), 1500)
  }

  const handleCopyTag = (tag: string) => {
    navigator.clipboard?.writeText(tag)
    setCopiedVariable(tag)
    setTimeout(() => setCopiedVariable(null), 1500)
    toast({
      title: 'Variável copiada!',
      description: `Código ${tag} copiado para a área de transferência.`,
    })
  }

  const handleCopyTemplateContent = (tplId: string, textToCopy: string, tplNome: string) => {
    navigator.clipboard?.writeText(textToCopy)
    setCopiedTemplateId(tplId)
    setTimeout(() => setCopiedTemplateId(null), 1500)
    toast({
      title: 'Texto copiado!',
      description: `Mensagem de "${tplNome}" copiada para a área de transferência.`,
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return

    if (!formNome.trim() || !formConteudo.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e texto da mensagem não podem ficar vazios.',
        variant: 'destructive',
      })
      return
    }

    await updateTemplate(editingTemplate.id, {
      nome: formNome.trim(),
      assunto: editingTemplate.tipo === 'E-mail' ? formAssunto.trim() : undefined,
      conteudo: formConteudo.trim(),
      descricao: formDescricao.trim(),
    })

    toast({
      title: 'Modelo salvo com sucesso!',
      description: `O modelo de ${editingTemplate.tipo} foi atualizado e já está ativo nas ações rápidas.`,
    })

    handleCloseModal()
  }

  const handleResetSingle = async (id: string, nome: string) => {
    if (window.confirm(`Deseja restaurar o modelo "${nome}" para o texto padrão inicial?`)) {
      await resetSingleTemplate(id)
      toast({
        title: 'Modelo restaurado',
        description: 'O texto padrão original foi reestabelecido.',
      })
    }
  }

  const handleResetAll = async () => {
    if (
      window.confirm(
        'Deseja restaurar TODOS os modelos de mensagem para o padrão original do sistema?',
      )
    ) {
      await resetTemplatesToDefault()
      toast({
        title: 'Modelos restaurados!',
        description: 'Todos os modelos retornaram ao estado padrão.',
      })
    }
  }

  const previewArena = arenas.find((a) => a.id === selectedArenaPreviewId) ||
    arenas[0] || {
      id: 'exemplo-preview',
      nome: 'Arena Beach Club Exemplo',
      cidade: 'São Paulo',
      estado: 'SP',
      modalidade: 'Beach Tennis',
      endereco: 'Av. das Nações Unidas, 12000',
      whatsApp: '5511999999999',
      email: 'contato@arenabeach.com.br',
      status: 'A Contatar' as const,
      createdAt: new Date().toISOString(),
    }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header card with action */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-100 text-[#7C3AED]">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Modelos de Mensagem para Prospecção
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Personalize os textos automáticos usados nos botões de WhatsApp do Pipeline e no envio
            por E-mail.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Todos</span>
          </button>
        </div>
      </div>

      {/* Available Variables Guide */}
      <div className="bg-gradient-to-r from-violet-50/70 via-purple-50/40 to-slate-50 border border-violet-100 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-600 text-white shrink-0 mt-0.5 shadow-md shadow-violet-900/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Variáveis Dinâmicas Disponíveis</h3>
              <p className="text-xs text-slate-600">
                Ao disparar a mensagem a partir do Pipeline ou do modal do Lead, cada variável é
                substituída automaticamente pelas informações reais da arena correspondente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleCopyTag(v.tag)}
                  title={`Clique para copiar ${v.tag} (${v.descricao})`}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-900 hover:border-violet-400 hover:bg-violet-50 text-xs font-semibold shadow-2xs transition-all"
                >
                  <code className="text-violet-700 font-bold">{v.tag}</code>
                  <span className="text-[11px] text-slate-500 font-normal group-hover:text-slate-700">
                    — {v.descricao}
                  </span>
                  {copiedVariable === v.tag ? (
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 ml-1" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Arena Selector for live preview */}
      {arenas.length > 0 && (
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-600 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Visualizar prévia com dados de:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={previewArena.id || ''}
              onChange={(e) => setSelectedArenaPreviewId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-violet-500 min-w-[240px]"
            >
              {arenas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.cidade}/{a.estado}) — {a.modalidade}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((tpl) => {
          const isWhatsApp = tpl.tipo === 'WhatsApp'
          const previewText = interpolateVariables(tpl.conteudo, previewArena)
          const previewSubject = tpl.assunto ? interpolateVariables(tpl.assunto, previewArena) : ''

          return (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isWhatsApp
                        ? 'bg-[#25D366] text-white shadow-emerald-500/20'
                        : 'bg-[#7C3AED] text-white shadow-violet-500/20'
                    }`}
                  >
                    {isWhatsApp ? (
                      <MessageSquare className="w-5 h-5 fill-white" />
                    ) : (
                      <Mail className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900 truncate">{tpl.nome}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isWhatsApp
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-violet-50 text-violet-700 border-violet-200'
                        }`}
                      >
                        {tpl.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tpl.descricao}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyTemplateContent(tpl.id, previewText, tpl.nome)}
                    title="Copiar texto pré-formatado com os dados da arena selecionada"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 border border-slate-200"
                  >
                    {copiedTemplateId === tpl.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(tpl)}
                    className="px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-[#7C3AED] font-semibold text-xs transition-colors flex items-center gap-1.5 border border-violet-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>

              {/* Template Body */}
              <div className="p-5 flex-1 space-y-4 text-xs">
                {tpl.assunto && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Assunto (E-mail):
                    </span>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800">
                      {tpl.assunto}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Texto do Modelo (com variáveis):
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {tpl.conteudo}
                  </div>
                </div>

                {/* Live rendered preview box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>Prévia com "{previewArena.nome}":</span>
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border text-slate-800 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto ${
                      isWhatsApp
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-violet-50/40 border-violet-200'
                    }`}
                  >
                    {tpl.assunto && (
                      <div className="font-bold text-slate-900 pb-2 mb-2 border-b border-violet-200/60">
                        Assunto: {previewSubject}
                      </div>
                    )}
                    {previewText}
                  </div>
                </div>
              </div>

              {/* Footer card status & restore single */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Atualizado: {formatDateBr(tpl.updatedAt)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleResetSingle(tpl.id, tpl.nome)}
                  className="text-slate-500 hover:text-slate-800 underline hover:no-underline font-medium"
                >
                  Restaurar padrão deste modelo
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Modal Dialog */}
      {editingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-modal-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    editingTemplate.tipo === 'WhatsApp' ? 'bg-[#25D366]' : 'bg-[#7C3AED]'
                  }`}
                >
                  {editingTemplate.tipo === 'WhatsApp' ? (
                    <MessageSquare className="w-4 h-4 fill-white" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    Editar Modelo: {editingTemplate.nome}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Canal: <strong className="text-slate-700">{editingTemplate.tipo}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Nome identificador do Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="Ex: Mensagem de Primeiro Contato"
                />
              </div>

              {editingTemplate.tipo === 'E-mail' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Assunto do E-mail (suporta variáveis)
                  </label>
                  <input
                    type="text"
                    value={formAssunto}
                    onChange={(e) => setFormAssunto(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                    placeholder="Ex: Sistema de Gravação de Jogadas para [Nome]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Descrição curta (opcional)
                </label>
                <input
                  type="text"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="Ex: Utilizado no botão do Pipeline"
                />
              </div>

              {/* Quick insert bar */}
              <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Clique para inserir no texto:</span>
                  </span>
                  <span className="text-[10px] text-violet-600">Posicionado ao final do texto</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="px-2.5 py-1 rounded-md bg-white border border-violet-200 text-violet-800 hover:bg-violet-100 font-mono text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <span>{v.tag}</span>
                      <PlusCircle className="w-3 h-3 text-violet-500" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for template body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Corpo da Mensagem *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {formConteudo.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={editingTemplate.tipo === 'E-mail' ? 10 : 5}
                  required
                  value={formConteudo}
                  onChange={(e) => setFormConteudo(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white font-mono text-xs leading-relaxed"
                  placeholder="Escreva sua mensagem aqui utilizando [Nome], [Cidade], [Estado], etc..."
                />
              </div>

              {/* Live Preview inside modal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Prévia em tempo real (exemplo com "{previewArena.nome}"):
                </label>
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {formAssunto && (
                    <div className="font-bold text-slate-900 pb-1.5 mb-1.5 border-b border-slate-200">
                      Assunto: {interpolateVariables(formAssunto, previewArena)}
                    </div>
                  )}
                  {interpolateVariables(formConteudo, previewArena)}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20 active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
