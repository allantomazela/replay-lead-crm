import { useState, useEffect, useMemo } from 'react'
import {
  Kanban,
  Search,
  Plus,
  MapPin,
  Calendar,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Building,
  Filter,
} from 'lucide-react'
import { Arena, StatusLead, STATUS_LIST, STATUS_CONFIG } from '@/types/crm'
import {
  getArenas,
  updateArena,
  addArena,
  deleteArena,
  addInteracao,
  formatDateBr,
  formatPhoneNumber,
  buildWhatsAppLink,
} from '@/services/storage'
import { LeadDetailsModal } from '@/components/LeadDetailsModal'
import { FollowUpAlerts } from '@/components/FollowUpAlerts'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function Pipeline() {
  const { toast } = useToast()
  const [arenas, setArenas] = useState<Arena[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [modalArenaId, setModalArenaId] = useState<string | null>(null)
  const [highlightedArenaId, setHighlightedArenaId] = useState<string | null>(null)

  // Drag & drop state
  const [draggedArenaId, setDraggedArenaId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<StatusLead | null>(null)

  // New Lead quick modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickNome, setQuickNome] = useState('')
  const [quickModalidade, setQuickModalidade] = useState('Beach Tennis')
  const [quickPhone, setQuickPhone] = useState('')
  const [quickCidade, setQuickCidade] = useState('')
  const [quickEstado, setQuickEstado] = useState('SP')

  const loadArenas = async () => {
    setArenas(await getArenas())
  }

  useEffect(() => {
    void loadArenas()
    const handleUpdate = () => {
      void loadArenas()
    }
    window.addEventListener('arenalead:arenas-updated', handleUpdate)
    return () => window.removeEventListener('arenalead:arenas-updated', handleUpdate)
  }, [])

  // Filter cards by name or city
  const filteredArenas = useMemo(() => {
    if (!searchQuery.trim()) return arenas
    const q = searchQuery.toLowerCase()
    return arenas.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        a.cidade.toLowerCase().includes(q) ||
        (a.estado && a.estado.toLowerCase().includes(q)) ||
        a.modalidade.toLowerCase().includes(q),
    )
  }, [arenas, searchQuery])

  // Group by status
  const columnsData = useMemo(() => {
    const map: Record<StatusLead, Arena[]> = {
      'A Contatar': [],
      Contatado: [],
      'Em Negociação': [],
      'Fechado / Cliente': [],
      Perdido: [],
    }
    filteredArenas.forEach((arena) => {
      if (map[arena.status]) {
        map[arena.status].push(arena)
      } else {
        map['A Contatar'].push(arena)
      }
    })
    return map
  }, [filteredArenas])

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedArenaId(id)
  }

  const handleDragOver = (e: React.DragEvent, status: StatusLead) => {
    e.preventDefault()
    if (dragOverCol !== status) {
      setDragOverCol(status)
    }
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: StatusLead) => {
    e.preventDefault()
    setDragOverCol(null)
    const arenaId = e.dataTransfer.getData('text/plain') || draggedArenaId
    if (!arenaId) return

    const movingArena = arenas.find((a) => a.id === arenaId)
    if (!movingArena || movingArena.status === targetStatus) {
      setDraggedArenaId(null)
      return
    }

    const previousStatus = movingArena.status
    const updated = await updateArena(arenaId, { status: targetStatus })
    setDraggedArenaId(null)

    if (updated) {
      await loadArenas()

      if (targetStatus === 'Fechado / Cliente') {
        toast({
          title: 'Parabéns! Novo cliente fechado! 🎉',
          description: `"${movingArena.nome}" agora é cliente ReplayLead de gravação de jogadas!`,
        })
        await addInteracao(
          arenaId,
          'WhatsApp',
          'Lead movido para FECHADO / CLIENTE no Pipeline de Vendas 🎉.',
        )
      } else {
        toast({
          title: `Status atualizado: ${targetStatus}`,
          description: `"${movingArena.nome}" movido de "${previousStatus}" para "${targetStatus}".`,
        })
        await addInteracao(
          arenaId,
          'Ligação',
          `Movido no funil de [${previousStatus}] para [${targetStatus}].`,
        )
      }
    }
  }

  const handleWhatsAppQuickAction = async (e: React.MouseEvent, arena: Arena) => {
    e.stopPropagation()
    if (!arena.whatsApp) {
      toast({
        title: 'Sem WhatsApp cadastrado',
        description: 'Clique no card para editar e adicionar o número de telefone.',
        variant: 'destructive',
      })
      return
    }

    const link = buildWhatsAppLink(arena.nome, arena.whatsApp, arena)
    window.open(link, '_blank')

    const nowIso = new Date().toISOString()
    await updateArena(arena.id, {
      status: 'Contatado',
      ultimoContato: nowIso,
    })
    await addInteracao(
      arena.id,
      'WhatsApp',
      'Contato rápido iniciado via WhatsApp com a mensagem padrão de apresentação.',
    )
    await loadArenas()

    toast({
      title: 'Contato registrado via WhatsApp!',
      description: `Mensagem enviada para ${arena.nome}. Status: Contatado.`,
    })
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickNome.trim()) return

    const created = await addArena({
      nome: quickNome.trim(),
      modalidade: quickModalidade,
      whatsApp: quickPhone.replace(/\D/g, ''),
      email: '',
      endereco: '',
      cidade: quickCidade.trim() || 'São Paulo',
      estado: (quickEstado.trim() || 'SP').toUpperCase(),
      status: 'A Contatar',
      ultimoContato: null,
      observacoes: 'Cadastrado rapidamente pelo Pipeline.',
    })

    await loadArenas()
    setIsQuickAddOpen(false)
    setQuickNome('')
    setQuickPhone('')
    setQuickCidade('')

    toast({
      title: 'Arena adicionada!',
      description: `"${created.nome}" adicionada na coluna "A Contatar".`,
    })
  }

  // Funnel conversion stats
  const totalLeads = arenas.length
  const closedCount = arenas.filter((a) => a.status === 'Fechado / Cliente').length
  const inNegotiationCount = arenas.filter((a) => a.status === 'Em Negociação').length
  const contactedCount = arenas.filter((a) => a.status === 'Contatado').length
  const conversionRate = totalLeads > 0 ? ((closedCount / totalLeads) * 100).toFixed(1) : '0'

  const handleOpenFromFollowUp = (arenaId: string) => {
    setModalArenaId(arenaId)
    setHighlightedArenaId(arenaId)
    // Scroll smoothly to highlight
    setTimeout(() => {
      const el = document.getElementById(`arena-card-${arenaId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Follow-up Alerts Bar at the top of Pipeline */}
      <FollowUpAlerts
        onOpenArena={handleOpenFromFollowUp}
        highlightedArenaId={highlightedArenaId}
        compact
      />

      {/* Top Controls & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Real-time search filter */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por arena, cidade ou modalidade..."
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-sm text-slate-900 bg-white"
          />
        </div>

        {/* Quick Funnel Summary Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 shrink-0">
            <span className="text-slate-400">Total:</span>
            <span>{totalLeads}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-semibold flex items-center gap-1.5 shrink-0">
            <span className="text-blue-400">Em Negociação:</span>
            <span>{inNegotiationCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5 shrink-0">
            <span className="text-emerald-500">Fechados:</span>
            <span>{closedCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold ml-1">({conversionRate}%)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="min-h-[40px] px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20 flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Arena</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-6 pt-1">
        <div className="flex gap-4 min-w-[1460px] lg:min-w-0 lg:grid lg:grid-cols-5 items-start">
          {STATUS_LIST.map((status) => {
            const config = STATUS_CONFIG[status]
            const columnCards = columnsData[status] || []
            const isOver = dragOverCol === status

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
                className={cn(
                  'w-[280px] lg:w-auto shrink-0 flex flex-col rounded-2xl bg-slate-100/80 border transition-all duration-200 min-h-[550px] shadow-sm',
                  isOver
                    ? 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-400/40'
                    : 'border-slate-200/90',
                )}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between bg-white rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 truncate">
                      {status}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full border',
                      config.bgBadge,
                    )}
                  >
                    {columnCards.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {columnCards.length === 0 ? (
                    <div
                      className={cn(
                        'h-32 rounded-xl border border-dashed flex flex-col items-center justify-center p-3 text-center transition-colors',
                        isOver
                          ? 'border-violet-400 bg-violet-100/40 text-violet-700'
                          : 'border-slate-300/80 text-slate-400',
                      )}
                    >
                      <p className="text-xs font-medium">
                        {isOver ? 'Solte o lead aqui' : 'Nenhuma arena neste estágio'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Arraste para mover</p>
                    </div>
                  ) : (
                    columnCards.map((arena, cardIdx) => {
                      const isDragging = draggedArenaId === arena.id

                      return (
                        <div
                          key={arena.id}
                          id={`arena-card-${arena.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, arena.id)}
                          onClick={() => {
                            setModalArenaId(arena.id)
                            setHighlightedArenaId(arena.id)
                          }}
                          style={{ animationDelay: `${cardIdx * 40}ms` }}
                          className={cn(
                            'group bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative select-none animate-fade-in-up',
                            highlightedArenaId === arena.id
                              ? 'border-violet-500 ring-2 ring-violet-400 bg-violet-50/20'
                              : 'border-slate-200',
                            isDragging
                              ? 'opacity-40 scale-105 shadow-xl rotate-1 ring-2 ring-violet-500'
                              : 'hover:-translate-y-1',
                          )}
                        >
                          {/* Sample badge */}
                          {arena.isSample && (
                            <div className="mb-2">
                              <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                Dados de exemplo
                              </span>
                            </div>
                          )}

                          {/* Card Header: Modalidade Pill & Name */}
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {arena.modalidade}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#7C3AED] transition-colors leading-snug">
                              {arena.nome}
                            </h4>
                          </div>

                          {/* City / State Pin */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {arena.cidade}
                              {arena.estado ? `, ${arena.estado}` : ''}
                            </span>
                          </div>

                          {/* Last Contact */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              Último: {formatDateBr(arena.ultimoContato)}
                            </span>
                          </div>

                          {/* Divider & Actions */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-0.5">
                              Ver Detalhes
                              <ChevronRight className="w-3 h-3" />
                            </span>

                            {/* WhatsApp Quick Action Button */}
                            <button
                              type="button"
                              onClick={(e) => handleWhatsAppQuickAction(e, arena)}
                              title="Abrir WhatsApp com template de apresentação"
                              className="w-8 h-8 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-sm shadow-emerald-600/30 active:scale-90 transition-all"
                            >
                              <MessageSquare className="w-4 h-4 fill-white" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsQuickAddOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-modal-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 mb-1">Cadastrar Nova Arena</h3>
            <p className="text-xs text-slate-500 mb-4">
              O lead será inserido diretamente na coluna "A Contatar".
            </p>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome da Arena *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  placeholder="Ex: Arena Sunset Beach"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Modalidade
                </label>
                <select
                  value={quickModalidade}
                  onChange={(e) => setQuickModalidade(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#7C3AED] bg-white"
                >
                  <option value="Beach Tennis">Beach Tennis</option>
                  <option value="Futebol Society">Futebol Society</option>
                  <option value="Vôlei">Vôlei</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={quickCidade}
                    onChange={(e) => setQuickCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Estado</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={quickEstado}
                    onChange={(e) => setQuickEstado(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs text-slate-900 uppercase focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20"
                >
                  Cadastrar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {modalArenaId && (
        <LeadDetailsModal
          arenaId={modalArenaId}
          arenas={arenas}
          onClose={() => setModalArenaId(null)}
          onArenaUpdated={() => {
            void loadArenas()
          }}
          onArenaDeleted={async (id) => {
            await deleteArena(id)
            await loadArenas()
          }}
        />
      )}
    </div>
  )
}
