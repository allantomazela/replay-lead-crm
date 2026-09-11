import { useState, useEffect } from 'react'
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Send,
  MessageSquare,
  Building2,
  Trash2,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react'
import {
  Arena,
  HistoricoInteracao,
  StatusLead,
  TipoContato,
  STATUS_LIST,
  STATUS_CONFIG,
} from '@/types/crm'
import {
  updateArena,
  getInteracoes,
  addInteracao,
  formatDateBr,
  formatPhoneNumber,
  cleanPhoneNumber,
  buildWhatsAppLink,
} from '@/services/storage'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface LeadDetailsModalProps {
  arenaId: string | null
  onClose: () => void
  onArenaUpdated?: (arena: Arena) => void
  onArenaDeleted?: (id: string) => void
  arenas: Arena[]
}

export function LeadDetailsModal({
  arenaId,
  onClose,
  onArenaUpdated,
  onArenaDeleted,
  arenas,
}: LeadDetailsModalProps) {
  const { toast } = useToast()
  const arena = arenas.find((a) => a.id === arenaId)

  // Form state
  const [formData, setFormData] = useState<Partial<Arena>>({})
  const [timeline, setTimeline] = useState<HistoricoInteracao[]>([])

  // Add interaction state
  const [novoTipo, setNovoTipo] = useState<TipoContato>('WhatsApp')
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadTimeline = async (id: string) => {
    const all = await getInteracoes(id)
    const filtered = all.sort(
      (a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime(),
    )
    setTimeline(filtered)
  }

  useEffect(() => {
    if (arena) {
      setFormData({
        nome: arena.nome,
        modalidade: arena.modalidade,
        whatsApp: arena.whatsApp,
        email: arena.email,
        endereco: arena.endereco,
        cidade: arena.cidade,
        estado: arena.estado,
        status: arena.status,
        observacoes: arena.observacoes || '',
      })
      void loadTimeline(arena.id)
    }
  }, [arena])

  if (!arenaId || !arena) return null

  const handleInputChange = (field: keyof Arena, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.nome?.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da arena.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    const updated = await updateArena(arena.id, {
      nome: formData.nome?.trim() || '',
      modalidade: formData.modalidade || 'Beach Tennis',
      whatsApp: cleanPhoneNumber(formData.whatsApp || ''),
      email: formData.email?.trim() || '',
      endereco: formData.endereco?.trim() || '',
      cidade: formData.cidade?.trim() || '',
      estado: (formData.estado?.trim() || '').toUpperCase(),
      status: (formData.status as StatusLead) || arena.status,
      observacoes: formData.observacoes || '',
    })

    setIsSaving(false)
    if (updated) {
      onArenaUpdated?.(updated)
      toast({
        title: 'Alterações salvas!',
        description: 'Os dados do lead foram atualizados com sucesso.',
      })
    }
  }

  const handleAddInteracao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaAnotacao.trim()) {
      toast({
        title: 'Anotação vazia',
        description: 'Digite o resumo ou detalhes da interação.',
        variant: 'destructive',
      })
      return
    }

    const created = await addInteracao(arena.id, novoTipo, novaAnotacao.trim())
    setNovaAnotacao('')
    await loadTimeline(arena.id)

    const updated = await updateArena(arena.id, {
      ultimoContato: created.dataRegistro,
    })
    if (updated) {
      onArenaUpdated?.(updated)
    }

    toast({
      title: 'Interação registrada!',
      description: `Tipo: ${novoTipo}. Histórico atualizado.`,
    })
  }

  const getTipoIcon = (tipo: TipoContato) => {
    switch (tipo) {
      case 'WhatsApp':
        return <MessageSquare className="w-4 h-4 text-[#25D366]" />
      case 'Ligação':
        return <Phone className="w-4 h-4 text-blue-500" />
      case 'E-mail':
        return <Mail className="w-4 h-4 text-purple-500" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[620px] max-h-[88vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {formData.nome || arena.nome}
                </h2>
                {arena.isSample && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 shrink-0">
                    Exemplo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {formData.cidade || arena.cidade}
                {formData.estado ? `, ${formData.estado}` : ''} •{' '}
                {formData.modalidade || arena.modalidade}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Quick Action WhatsApp Banner */}
          {formData.whatsApp && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageSquare className="w-4 h-4 fill-white" />
                </div>
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-emerald-900">Contato Rápido WhatsApp</p>
                  <p className="text-emerald-700 truncate">
                    {formatPhoneNumber(formData.whatsApp)}
                  </p>
                </div>
              </div>
              <a
                href={buildWhatsAppLink(formData.nome || arena.nome, formData.whatsApp, {
                  ...arena,
                  nome: formData.nome || arena.nome,
                  cidade: formData.cidade || arena.cidade,
                  estado: formData.estado || arena.estado,
                  modalidade: formData.modalidade || arena.modalidade,
                  endereco: formData.endereco || arena.endereco,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void (async () => {
                    const updated = await updateArena(arena.id, {
                      status: 'Contatado',
                      ultimoContato: new Date().toISOString(),
                    })
                    if (updated) {
                      setFormData((prev) => ({ ...prev, status: 'Contatado' }))
                      onArenaUpdated?.(updated)
                    }
                    await addInteracao(
                      arena.id,
                      'WhatsApp',
                      'Contato iniciado via clique rápido de WhatsApp no CRM.',
                    )
                    await loadTimeline(arena.id)
                    toast({
                      title: 'Contato registrado via WhatsApp!',
                      description: 'Status atualizado para "Contatado".',
                    })
                  })()
                }}
                className="px-3.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold text-xs transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
              >
                <span>Abrir Chat</span>
              </a>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSaveChanges} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dados do Lead
              </h3>
              <span className="text-[11px] text-slate-400">
                Último contato: {formatDateBr(arena.ultimoContato)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nome da Arena *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="Ex: Arena Beach Tennis Club"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Modalidade</label>
                <select
                  value={formData.modalidade || 'Beach Tennis'}
                  onChange={(e) => handleInputChange('modalidade', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                >
                  <option value="Beach Tennis">Beach Tennis</option>
                  <option value="Futebol Society">Futebol Society</option>
                  <option value="Vôlei">Vôlei</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Status no Funil</label>
                <select
                  value={formData.status || 'A Contatar'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 font-semibold text-slate-900 bg-white"
                >
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={formData.whatsApp || ''}
                  onChange={(e) => handleInputChange('whatsApp', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="Ex: 5511999999999"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">E-mail</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="contato@arena.com.br"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco || ''}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="Rua, número e bairro"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white"
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Estado (UF)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.estado || ''}
                  onChange={(e) => handleInputChange('estado', e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 uppercase bg-white"
                  placeholder="SP"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Observações Comerciais
                </label>
                <textarea
                  rows={2}
                  value={formData.observacoes || ''}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-slate-900 bg-white text-xs leading-relaxed"
                  placeholder="Detalhes da estrutura, quantidade de quadras, nome do responsável ou interesse em câmeras..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Deseja realmente excluir "${arena.nome}" do CRM?`)) {
                    onArenaDeleted?.(arena.id)
                    onClose()
                    toast({
                      title: 'Arena excluída',
                      description: 'O lead foi removido do sistema.',
                    })
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5 p-2 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Lead</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[44px] px-6 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>

          {/* Timeline Section */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-600" />
                <span>Histórico de Interações</span>
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {timeline.length} {timeline.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {/* Add interaction form */}
            <form
              onSubmit={handleAddInteracao}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Tipo de Contato
                  </label>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value as TipoContato)}
                    className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#7C3AED] text-xs bg-white font-medium"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Ligação">Ligação</option>
                    <option value="E-mail">E-mail</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Anotação / Resumo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaAnotacao}
                      onChange={(e) => setNovaAnotacao(e.target.value)}
                      placeholder="Ex: Reunião com gerente agendada para amanhã..."
                      className="flex-1 min-h-[40px] px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#7C3AED] text-xs bg-white"
                    />
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wider transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Registrar</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Timeline List */}
            {timeline.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Nenhuma interação registrada ainda para esta arena.
              </div>
            ) : (
              <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
                {timeline.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-3 pl-2 group">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-sm group-hover:border-violet-500 transition-colors">
                      {getTipoIcon(item.tipo)}
                    </div>
                    <div className="flex-1 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900">{item.tipo}</span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateBr(item.dataRegistro)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed break-words">
                        {item.anotacao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
