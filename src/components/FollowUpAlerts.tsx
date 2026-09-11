import { useState, useEffect, useMemo } from 'react'
import {
  Bell,
  Clock,
  MessageSquare,
  Check,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Calendar,
} from 'lucide-react'
import { Arena, HistoricoInteracao, StatusLead, STATUS_CONFIG } from '@/types/crm'
import {
  getArenas,
  getInteracoes,
  getFollowUpDaysPreference,
  setFollowUpDaysPreference,
  getDismissedAlerts,
  dismissFollowUpAlert,
  clearDismissedAlerts,
  updateArena,
  addInteracao,
  formatDateBr,
  buildWhatsAppLink,
} from '@/services/storage'
import { useToast } from '@/hooks/use-toast'

interface FollowUpItem {
  arena: Arena
  referenceDate: Date
  daysInactive: number
  hasContactHistory: boolean
}

interface FollowUpAlertsProps {
  onOpenArena?: (arenaId: string) => void
  highlightedArenaId?: string | null
  compact?: boolean
  className?: string
}

const ACTIVE_STAGES: StatusLead[] = ['A Contatar', 'Contatado', 'Em Negociação']

export function FollowUpAlerts({
  onOpenArena,
  highlightedArenaId,
  compact = false,
  className = '',
}: FollowUpAlertsProps) {
  const { toast } = useToast()
  const [arenas, setArenas] = useState<Arena[]>([])
  const [interacoes, setInteracoes] = useState<HistoricoInteracao[]>([])
  const [daysThreshold, setDaysThreshold] = useState<number>(7)
  const [dismissedMap, setDismissedMap] = useState<Record<string, string>>({})
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  const reloadData = async () => {
    const [nextArenas, nextInteracoes, nextDismissed] = await Promise.all([
      getArenas(),
      getInteracoes(),
      getDismissedAlerts(),
    ])
    setArenas(nextArenas)
    setInteracoes(nextInteracoes)
    setDismissedMap(nextDismissed)
  }

  useEffect(() => {
    void reloadData()
    void getFollowUpDaysPreference().then(setDaysThreshold)

    const handleArenas = () => {
      void reloadData()
    }
    const handleInteracoes = () => {
      void reloadData()
    }
    const handleConfig = () => {
      void getFollowUpDaysPreference().then(setDaysThreshold)
      void getDismissedAlerts().then(setDismissedMap)
    }

    window.addEventListener('arenalead:arenas-updated', handleArenas)
    window.addEventListener('arenalead:interacoes-updated', handleInteracoes)
    window.addEventListener('arenalead:followup-config-updated', handleConfig)

    return () => {
      window.removeEventListener('arenalead:arenas-updated', handleArenas)
      window.removeEventListener('arenalead:interacoes-updated', handleInteracoes)
      window.removeEventListener('arenalead:followup-config-updated', handleConfig)
    }
  }, [])

  // Earliest and latest interactions map
  const interactionStatsMap = useMemo(() => {
    const map = new Map<string, { latest: Date; earliest: Date }>()
    interacoes.forEach((item) => {
      try {
        const d = new Date(item.dataRegistro)
        if (isNaN(d.getTime())) return
        const existing = map.get(item.arenaId)
        if (!existing) {
          map.set(item.arenaId, { latest: d, earliest: d })
        } else {
          if (d.getTime() > existing.latest.getTime()) existing.latest = d
          if (d.getTime() < existing.earliest.getTime()) existing.earliest = d
        }
      } catch {
        // ignore
      }
    })
    return map
  }, [interacoes])

  // Compute inactive leads
  const inactiveLeads = useMemo<FollowUpItem[]>(() => {
    const now = new Date()
    const nowTime = now.getTime()
    const msInDay = 24 * 60 * 60 * 1000
    const list: FollowUpItem[] = []

    arenas.forEach((arena) => {
      // Only funnel active stages
      if (!ACTIVE_STAGES.includes(arena.status)) return

      let referenceDate: Date | null = null
      let hasContactHistory = false

      if (arena.ultimoContato) {
        const parsed = new Date(arena.ultimoContato)
        if (!isNaN(parsed.getTime())) {
          referenceDate = parsed
          hasContactHistory = true
        }
      }

      const interStat = interactionStatsMap.get(arena.id)
      if (!referenceDate && interStat?.latest) {
        referenceDate = interStat.latest
        hasContactHistory = true
      }

      if (!referenceDate && arena.createdAt) {
        const createdParsed = new Date(arena.createdAt)
        if (!isNaN(createdParsed.getTime())) {
          referenceDate = createdParsed
        }
      }

      if (!referenceDate && interStat?.earliest) {
        referenceDate = interStat.earliest
      }

      if (!referenceDate) {
        // Fallback default: 30 days ago to trigger follow-up on arenas without any date
        referenceDate = new Date(nowTime - 30 * msInDay)
      }

      const diffMs = nowTime - referenceDate.getTime()
      const daysInactive = Math.max(0, Math.floor(diffMs / msInDay))

      if (daysInactive >= daysThreshold) {
        // Check if dismissed for this reference timestamp
        const refIso = referenceDate.toISOString()
        const dismissedAt = dismissedMap[arena.id]
        if (dismissedAt && dismissedAt === refIso) {
          // Alert was dismissed for this exact contact date
          return
        }

        list.push({
          arena,
          referenceDate,
          daysInactive,
          hasContactHistory,
        })
      }
    })

    // Sort by most days inactive first
    return list.sort((a, b) => b.daysInactive - a.daysInactive)
  }, [arenas, interactionStatsMap, daysThreshold, dismissedMap])

  const handleThresholdChange = async (days: number) => {
    setDaysThreshold(days)
    await setFollowUpDaysPreference(days)
    toast({
      title: `Alerta configurado para ${days} dias`,
      description: `Listando arenas sem contato há mais de ${days} dias nos estágios A Contatar, Contatado e Em Negociação.`,
    })
  }

  const handleMarkContactedNow = async (item: FollowUpItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const nowIso = new Date().toISOString()
    const isNew = item.arena.status === 'A Contatar'
    const newStatus = isNew ? 'Contatado' : item.arena.status

    await updateArena(item.arena.id, {
      ultimoContato: nowIso,
      status: newStatus,
    })

    await addInteracao(
      item.arena.id,
      'WhatsApp',
      `Follow-up registrado via alerta de inatividade (${item.daysInactive} dias sem contato).`,
      nowIso,
    )

    toast({
      title: 'Contato registrado!',
      description: `"${item.arena.nome}" marcada como contatada agora.`,
    })
  }

  const handleDismiss = async (item: FollowUpItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    await dismissFollowUpAlert(item.arena.id, item.referenceDate.toISOString())
    setDismissedMap(await getDismissedAlerts())
    toast({
      title: 'Alerta dispensado',
      description: `O alerta para "${item.arena.nome}" foi ocultado até o próximo contato.`,
    })
  }

  const handleWhatsAppDirect = (item: FollowUpItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!item.arena.whatsApp) {
      toast({
        title: 'Sem WhatsApp cadastrado',
        description: 'Abra os detalhes da arena para informar o telefone.',
        variant: 'destructive',
      })
      return
    }

    const link = buildWhatsAppLink(item.arena.nome, item.arena.whatsApp, item.arena)
    window.open(link, '_blank')
    handleMarkContactedNow(item)
  }

  const totalDismissed = Object.keys(dismissedMap).length

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        inactiveLeads.length > 0
          ? 'border-amber-300 shadow-sm bg-gradient-to-b from-amber-50/40 via-white to-white'
          : 'border-slate-200/90 shadow-2xs'
      } ${className}`}
    >
      {/* Header bar */}
      <div className="p-4 md:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              inactiveLeads.length > 0
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {inactiveLeads.length > 0 ? (
              <Bell className="w-4 h-4 animate-bounce" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Alertas de Follow-up
              </h3>
              {inactiveLeads.length > 0 ? (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                  {inactiveLeads.length} {inactiveLeads.length === 1 ? 'pendência' : 'pendências'}
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Em dia
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Leads nos estágios ativos sem contato há mais de {daysThreshold} dias.
            </p>
          </div>
        </div>

        {/* Controls: Days selector 7/14/30 & collapse */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Dias:
            </span>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleThresholdChange(d)}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                  daysThreshold === d
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {totalDismissed > 0 && (
            <button
              type="button"
              onClick={() => {
                clearDismissedAlerts().then(() => {
                  void getDismissedAlerts().then(setDismissedMap)
                })
                setDismissedMap({})
                toast({
                  title: 'Alertas restaurados',
                  description:
                    'Todos os alertas dispensados anteriormente voltaram a ser exibidos.',
                })
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors"
              title="Restaurar alertas dispensados"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Restaurar dispensados ({totalDismissed})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            title={isExpanded ? 'Recolher painel' : 'Expandir painel'}
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content list */}
      {isExpanded && (
        <div className="p-4 md:p-5">
          {inactiveLeads.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-emerald-50/50 border border-dashed border-emerald-200/80 space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-emerald-900">
                Nenhum lead esquecido no momento!
              </p>
              <p className="text-[11px] text-emerald-700 max-w-md mx-auto">
                Todas as arenas ativas nos status "A Contatar", "Contatado" e "Em Negociação"
                receberam contato dentro dos últimos {daysThreshold} dias.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inactiveLeads.slice(0, compact ? 6 : 99).map((item) => {
                  const arena = item.arena
                  const stageConfig = STATUS_CONFIG[arena.status]
                  const isHighlighted = highlightedArenaId === arena.id

                  return (
                    <div
                      key={arena.id}
                      onClick={() => onOpenArena && onOpenArena(arena.id)}
                      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                        isHighlighted
                          ? 'border-violet-500 ring-2 ring-violet-400 bg-violet-50/30'
                          : 'border-slate-200/90 hover:border-amber-300 hover:shadow-md'
                      }`}
                    >
                      {/* Top row: Stage pill & days counter badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageConfig.bgBadge}`}
                        >
                          {arena.status}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>{item.daysInactive} dias sem contato</span>
                        </span>
                      </div>

                      {/* Arena title & location */}
                      <div className="mb-2">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-1">
                          {arena.nome}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {arena.modalidade} • {arena.cidade}
                          {arena.estado ? `/${arena.estado}` : ''}
                        </p>
                      </div>

                      {/* Reference date caption */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-3">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {item.hasContactHistory ? 'Último contato:' : 'Cadastrada em:'}{' '}
                          {formatDateBr(item.referenceDate.toISOString())}
                        </span>
                      </div>

                      {/* Actions: Contatado agora, WhatsApp, Ver Lead, Dispensar */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleMarkContactedNow(item, e)}
                          title="Atualizar data de contato para agora"
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Contatei agora</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {arena.whatsApp && (
                            <button
                              type="button"
                              onClick={(e) => handleWhatsAppDirect(item, e)}
                              title="Chamar no WhatsApp"
                              className="w-7 h-7 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center transition-all shadow-2xs active:scale-95"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-white" />
                            </button>
                          )}

                          {onOpenArena && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenArena(arena.id)
                              }}
                              title="Abrir detalhes"
                              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDismiss(item, e)}
                            title="Dispensar este alerta"
                            className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded hover:bg-slate-100 transition-colors"
                          >
                            Ocultar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {compact && inactiveLeads.length > 6 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    + {inactiveLeads.length - 6} outras arenas sem contato há mais de{' '}
                    {daysThreshold} dias.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
