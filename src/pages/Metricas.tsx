import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  CheckCircle2,
  PhoneForwarded,
  Percent,
  MapPin,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  ArrowRight,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  ChevronRight,
  XCircle,
  CalendarDays,
} from 'lucide-react'
import { getArenas, getInteracoes, formatDateBr, formatPhoneNumber } from '@/services/storage'
import { Arena, HistoricoInteracao, StatusLead, STATUS_LIST, STATUS_CONFIG } from '@/types/crm'
import { FollowUpAlerts } from '@/components/FollowUpAlerts'

export type PeriodoFiltro =
  | 'ESTE_MES'
  | 'ULTIMOS_30_DIAS'
  | 'ULTIMOS_90_DIAS'
  | 'ESTE_ANO'
  | 'TODO_PERIODO'

interface PeriodoOption {
  value: PeriodoFiltro
  label: string
}

const PERIODO_OPTIONS: PeriodoOption[] = [
  { value: 'TODO_PERIODO', label: 'Todo o período' },
  { value: 'ESTE_MES', label: 'Este mês' },
  { value: 'ULTIMOS_30_DIAS', label: 'Últimos 30 dias' },
  { value: 'ULTIMOS_90_DIAS', label: 'Últimos 90 dias' },
  { value: 'ESTE_ANO', label: 'Este ano' },
]

function formatSimpleDateBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function Metricas() {
  const [arenas, setArenas] = useState<Arena[]>([])
  const [interacoes, setInteracoes] = useState<HistoricoInteracao[]>([])
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoFiltro>('TODO_PERIODO')
  const [selectedFunnelStatus, setSelectedFunnelStatus] = useState<StatusLead | 'ALL'>('ALL')
  const [selectedCityFilter, setSelectedCityFilter] = useState<string | null>(null)

  const loadData = async () => {
    const [nextArenas, nextInteracoes] = await Promise.all([getArenas(), getInteracoes()])
    setArenas(nextArenas)
    setInteracoes(nextInteracoes)
  }

  useEffect(() => {
    void loadData()

    const handleArenas = () => {
      void loadData()
    }
    const handleInteracoes = () => {
      void loadData()
    }

    window.addEventListener('arenalead:arenas-updated', handleArenas)
    window.addEventListener('arenalead:interacoes-updated', handleInteracoes)
    return () => {
      window.removeEventListener('arenalead:arenas-updated', handleArenas)
      window.removeEventListener('arenalead:interacoes-updated', handleInteracoes)
    }
  }, [])

  // Calculation of date range for selected period
  const dateRange = useMemo(() => {
    const now = new Date()

    if (selectedPeriodo === 'TODO_PERIODO') {
      return { start: null, end: null, label: 'Exibindo todos os dados registrados' }
    }

    let start: Date
    let end: Date

    if (selectedPeriodo === 'ESTE_MES') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else if (selectedPeriodo === 'ULTIMOS_30_DIAS') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      start.setHours(0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (selectedPeriodo === 'ULTIMOS_90_DIAS') {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      start.setHours(0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else {
      // ESTE_ANO
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    }

    return {
      start,
      end,
      label: `Exibindo dados de ${formatSimpleDateBr(start)} a ${formatSimpleDateBr(end)}`,
    }
  }, [selectedPeriodo])

  // Map of earliest interaction date per arena
  const arenaFirstInteractionDateMap = useMemo(() => {
    const map = new Map<string, Date>()
    interacoes.forEach((item) => {
      try {
        const d = new Date(item.dataRegistro)
        if (isNaN(d.getTime())) return
        const existing = map.get(item.arenaId)
        if (!existing || d.getTime() < existing.getTime()) {
          map.set(item.arenaId, d)
        }
      } catch {
        // ignore
      }
    })
    return map
  }, [interacoes])

  // Helper to determine if an arena belongs to the active date filter
  // Rule: Ultimo_Contato ou, quando ausente, Data_Registro da primeira interação.
  // Quando nenhuma data existir, só entra em 'Todo o período'.
  const isArenaInPeriod = useMemo(() => {
    return (arena: Arena): boolean => {
      if (selectedPeriodo === 'TODO_PERIODO' || !dateRange.start || !dateRange.end) {
        return true
      }

      let referenceDate: Date | null = null

      if (arena.ultimoContato) {
        const parsed = new Date(arena.ultimoContato)
        if (!isNaN(parsed.getTime())) {
          referenceDate = parsed
        }
      }

      if (!referenceDate) {
        const firstInteracaoDate = arenaFirstInteractionDateMap.get(arena.id)
        if (firstInteracaoDate) {
          referenceDate = firstInteracaoDate
        }
      }

      if (!referenceDate) {
        // Nenhuma data existe: só entra em 'Todo o período'
        return false
      }

      const t = referenceDate.getTime()
      return t >= dateRange.start.getTime() && t <= dateRange.end.getTime()
    }
  }, [selectedPeriodo, dateRange, arenaFirstInteractionDateMap])

  // Filtered arenas by period
  const periodArenas = useMemo(() => {
    return arenas.filter(isArenaInPeriod)
  }, [arenas, isArenaInPeriod])

  // Filtered interacoes by period
  const periodInteracoes = useMemo(() => {
    if (selectedPeriodo === 'TODO_PERIODO' || !dateRange.start || !dateRange.end) {
      return interacoes
    }
    const startT = dateRange.start.getTime()
    const endT = dateRange.end.getTime()

    return interacoes.filter((item) => {
      try {
        const d = new Date(item.dataRegistro)
        if (isNaN(d.getTime())) return false
        const t = d.getTime()
        return t >= startT && t <= endT
      } catch {
        return false
      }
    })
  }, [interacoes, selectedPeriodo, dateRange])

  // KPI Calculations based on periodArenas
  const totalArenas = periodArenas.length

  const closedArenas = useMemo(
    () => periodArenas.filter((a) => a.status === 'Fechado / Cliente'),
    [periodArenas],
  )
  const totalClientes = closedArenas.length

  // Taxa de Conversão: % de fechados sobre o total no período
  const taxaConversao = totalArenas > 0 ? ((totalClientes / totalArenas) * 100).toFixed(1) : '0.0'

  // Taxa de Contato: % já contatados no período
  const contatadosArenas = useMemo(
    () =>
      periodArenas.filter(
        (a) =>
          a.status === 'Contatado' ||
          a.status === 'Em Negociação' ||
          a.status === 'Fechado / Cliente',
      ),
    [periodArenas],
  )
  const totalContatados = contatadosArenas.length
  const taxaContato = totalArenas > 0 ? ((totalContatados / totalArenas) * 100).toFixed(1) : '0.0'

  // Funnel Counts per Status based on periodArenas
  const funnelCounts = useMemo(() => {
    const counts: Record<StatusLead, number> = {
      'A Contatar': 0,
      Contatado: 0,
      'Em Negociação': 0,
      'Fechado / Cliente': 0,
      Perdido: 0,
    }
    periodArenas.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status] += 1
      }
    })
    return counts
  }, [periodArenas])

  // Cities Ranking (Top 8) based on periodArenas
  const citiesRanking = useMemo(() => {
    const map: Record<string, { cidade: string; estado: string; count: number }> = {}
    periodArenas.forEach((a) => {
      const cityClean = (a.cidade || 'Não informada').trim()
      const key = `${cityClean}__${a.estado || ''}`
      if (!map[key]) {
        map[key] = {
          cidade: cityClean,
          estado: a.estado || '',
          count: 0,
        }
      }
      map[key].count += 1
    })

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [periodArenas])

  const maxCityCount = useMemo(() => {
    if (citiesRanking.length === 0) return 1
    return Math.max(...citiesRanking.map((c) => c.count), 1)
  }, [citiesRanking])

  // Performance por Período: Gráfico com Último Contato das arenas e Data de Registro das interações
  const monthlyTimelineStats = useMemo(() => {
    // Generate the last 6 months in "YYYY-MM" format
    const months: Array<{
      key: string
      label: string
      startT: number
      endT: number
      arenaCount: number
      interacaoCount: number
    }> = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const monthNum = String(d.getMonth() + 1).padStart(2, '0')
      const key = `${year}-${monthNum}`

      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      const label = `${monthNames[d.getMonth()]}/${String(year).slice(-2)}`
      const monthStart = new Date(year, d.getMonth(), 1, 0, 0, 0, 0).getTime()
      const monthEnd = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

      months.push({
        key,
        label,
        startT: monthStart,
        endT: monthEnd,
        arenaCount: 0,
        interacaoCount: 0,
      })
    }

    // Contar arenas no período ativo cujo Ultimo_Contato cai no mês
    periodArenas.forEach((a) => {
      if (!a.ultimoContato) return
      try {
        const d = new Date(a.ultimoContato)
        if (isNaN(d.getTime())) return
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const bucket = months.find((m) => m.key === key)
        if (bucket) {
          bucket.arenaCount += 1
        }
      } catch {
        // ignore invalid dates
      }
    })

    // Contar interações registradas no período ativo cujo Data_Registro cai no mês
    periodInteracoes.forEach((item) => {
      try {
        const d = new Date(item.dataRegistro)
        if (isNaN(d.getTime())) return
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const bucket = months.find((m) => m.key === key)
        if (bucket) {
          bucket.interacaoCount += 1
        }
      } catch {
        // ignore invalid dates
      }
    })

    return months
  }, [periodArenas, periodInteracoes])

  const maxMonthValue = useMemo(() => {
    const allVals = monthlyTimelineStats.flatMap((m) => [m.arenaCount, m.interacaoCount])
    return Math.max(...allVals, 1)
  }, [monthlyTimelineStats])

  // Interações Breakdown by Tipo no período
  const interactionsByType = useMemo(() => {
    const counts = {
      WhatsApp: 0,
      Ligação: 0,
      'E-mail': 0,
    }
    periodInteracoes.forEach((item) => {
      if (item.tipo in counts) {
        counts[item.tipo as keyof typeof counts] += 1
      }
    })
    const total = periodInteracoes.length || 0
    return {
      WhatsApp: {
        count: counts.WhatsApp,
        pct: total > 0 ? ((counts.WhatsApp / total) * 100).toFixed(0) : '0',
      },
      Ligação: {
        count: counts.Ligação,
        pct: total > 0 ? ((counts.Ligação / total) * 100).toFixed(0) : '0',
      },
      'E-mail': {
        count: counts['E-mail'],
        pct: total > 0 ? ((counts['E-mail'] / total) * 100).toFixed(0) : '0',
      },
      total: periodInteracoes.length,
    }
  }, [periodInteracoes])

  // Filtered arenas list by selected funnel status or city (respecting the period)
  const filteredArenas = useMemo(() => {
    return periodArenas.filter((a) => {
      if (selectedFunnelStatus !== 'ALL' && a.status !== selectedFunnelStatus) {
        return false
      }
      if (selectedCityFilter && a.cidade !== selectedCityFilter) {
        return false
      }
      return true
    })
  }, [periodArenas, selectedFunnelStatus, selectedCityFilter])

  // Max count in funnel for percentage calculation
  const maxFunnelCount = useMemo(() => {
    return Math.max(...Object.values(funnelCounts), 1)
  }, [funnelCounts])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Follow-up Alerts Banner */}
      <FollowUpAlerts />

      {/* Overview Top Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-100 text-[#03045e]">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Desempenho Comercial e Funil de Vendas
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Métricas consolidadas de prospecção para Beach Tennis, Society e Vôlei de Areia.
          </p>
          {/* Active Period Feedback Text */}
          <div className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 w-fit">
            <CalendarDays className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span>{dateRange.label}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Period Selector Dropdown / Buttons */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pl-2">
              Período:
            </span>
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value as PeriodoFiltro)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
            >
              {PERIODO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/pipeline"
            className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#03045e] hover:bg-[#020347] text-white transition-all shadow-md shadow-violet-900/20 flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
          >
            <span>Ir para o Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total de Arenas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total de Arenas
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{totalArenas}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Leads cadastrados</span>
            <span className="font-semibold text-slate-700">100% da base</span>
          </div>
        </div>

        {/* KPI 2: Total de Clientes */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Total de Clientes
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1 flex items-baseline gap-1">
                {totalClientes}
                <span className="text-xs font-normal text-emerald-700">fechados</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs text-emerald-800">
            <span>Contratos ativos</span>
            <span className="font-semibold text-emerald-700">{taxaConversao}% da base</span>
          </div>
        </div>

        {/* KPI 3: Taxa de Conversão */}
        <div className="bg-white rounded-2xl p-5 border border-violet-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-br from-white to-violet-50/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Taxa de Conversão
              </p>
              <h3 className="text-3xl font-extrabold text-[#03045e] mt-1">{taxaConversao}%</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-violet-100/80 flex items-center justify-between text-xs text-violet-800">
            <span>Fechados / Total</span>
            <span className="font-semibold text-violet-700">
              {totalClientes} de {totalArenas}
            </span>
          </div>
        </div>

        {/* KPI 4: Taxa de Contato */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Taxa de Contato
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{taxaContato}%</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <PhoneForwarded className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100/80 flex items-center justify-between text-xs text-amber-800">
            <span>Abordados no funil</span>
            <span className="font-semibold text-amber-700">
              {totalContatados} de {totalArenas}
            </span>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600" />
              <h3 className="text-base font-bold text-slate-900">Funil de Conversão por Estágio</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribuição de leads entre as etapas do pipeline. Clique em um estágio para filtrar a
              lista detalhada abaixo.
            </p>
          </div>

          {selectedFunnelStatus !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedFunnelStatus('ALL')}
              className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Limpar filtro ({selectedFunnelStatus})</span>
            </button>
          )}
        </div>

        {/* Funnel Horizontal Bars */}
        <div className="space-y-3 pt-2">
          {STATUS_LIST.map((st) => {
            const count = funnelCounts[st]
            const config = STATUS_CONFIG[st]
            const percentageOfTotal =
              totalArenas > 0 ? ((count / totalArenas) * 100).toFixed(1) : '0'
            const barWidthPercent =
              maxFunnelCount > 0 ? Math.max((count / maxFunnelCount) * 100, count > 0 ? 8 : 2) : 2
            const isSelected = selectedFunnelStatus === st

            return (
              <div
                key={st}
                onClick={() => setSelectedFunnelStatus((prev) => (prev === st ? 'ALL' : st))}
                className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50/50 shadow-sm ring-1 ring-violet-400'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-bold text-slate-800">{st}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-600 text-white">
                        Filtrado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{count}</span>
                    <span className="text-[11px] text-slate-400">({percentageOfTotal}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${barWidthPercent}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Funnel Conversion Insights */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Etapa Inicial
            </span>
            <p className="font-semibold text-slate-700">
              {funnelCounts['A Contatar']} leads aguardando abordagem inicial
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-0.5">
              Em Andamento
            </span>
            <p className="font-semibold text-blue-900">
              {funnelCounts['Contatado'] + funnelCounts['Em Negociação']} negociações ativas
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
              Eficiência Final
            </span>
            <p className="font-semibold text-emerald-900">
              {funnelCounts['Fechado / Cliente']} clientes ativos ({taxaConversao}% conversão)
            </p>
          </div>
        </div>
      </div>

      {/* Row: Cities Ranking & Period / Interaction Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Arenas por Cidade */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-600" />
              <h3 className="text-base font-bold text-slate-900">Arenas por Cidade</h3>
            </div>
            {selectedCityFilter && (
              <button
                type="button"
                onClick={() => setSelectedCityFilter(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
              >
                Limpar cidade ({selectedCityFilter})
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Principais praças concentradoras de arenas esportivas.
          </p>

          {citiesRanking.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-8">
              Nenhuma cidade cadastrada ainda.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {citiesRanking.map((item, idx) => {
                const widthPct = Math.max((item.count / maxCityCount) * 100, 10)
                const isSelected = selectedCityFilter === item.cidade

                return (
                  <div
                    key={`${item.cidade}-${item.estado}`}
                    onClick={() =>
                      setSelectedCityFilter((prev) => (prev === item.cidade ? null : item.cidade))
                    }
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/60'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-[10px] font-bold text-slate-400 text-right">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {item.cidade}
                          {item.estado ? ` - ${item.estado}` : ''}
                        </span>
                      </div>
                      <span className="font-extrabold text-xs text-slate-900">
                        {item.count} {item.count === 1 ? 'arena' : 'arenas'}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Card 2: Desempenho por Período & Canais */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col space-y-6">
          {/* Monthly Contact Chart */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900">Desempenho por Período</h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-violet-600" />
                  <span>Último Contato</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span>Interações</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Volume de arenas contatadas e interações registradas ao longo dos meses.
            </p>

            <div className="grid grid-cols-6 gap-2 items-end h-36 pt-4 px-2 bg-slate-50/70 rounded-xl border border-slate-100">
              {monthlyTimelineStats.map((item) => {
                const arenaHeightPercent =
                  maxMonthValue > 0
                    ? Math.max(
                        (item.arenaCount / maxMonthValue) * 100,
                        item.arenaCount > 0 ? 14 : 4,
                      )
                    : 4
                const interacaoHeightPercent =
                  maxMonthValue > 0
                    ? Math.max(
                        (item.interacaoCount / maxMonthValue) * 100,
                        item.interacaoCount > 0 ? 14 : 4,
                      )
                    : 4

                return (
                  <div
                    key={item.key}
                    className="flex flex-col items-center justify-end h-full group"
                  >
                    <div className="flex items-center gap-1 mb-1 text-[9px] font-extrabold text-slate-700">
                      <span
                        className="text-violet-600"
                        title={`Último Contato: ${item.arenaCount}`}
                      >
                        {item.arenaCount}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span className="text-amber-600" title={`Interações: ${item.interacaoCount}`}>
                        {item.interacaoCount}
                      </span>
                    </div>

                    <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full pb-0.5">
                      {/* Bar 1: Arenas ultimo contato */}
                      <div className="w-1/2 bg-slate-200 rounded-t overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-violet-600 group-hover:bg-violet-700 transition-all rounded-t"
                          style={{ height: `${arenaHeightPercent}%` }}
                          title={`Arenas com último contato: ${item.arenaCount}`}
                        />
                      </div>
                      {/* Bar 2: Interações registradas */}
                      <div className="w-1/2 bg-slate-200 rounded-t overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-amber-500 group-hover:bg-amber-600 transition-all rounded-t"
                          style={{ height: `${interacaoHeightPercent}%` }}
                          title={`Interações registradas: ${item.interacaoCount}`}
                        />
                      </div>
                    </div>

                    <span className="text-[9px] font-semibold text-slate-500 mt-2 truncate max-w-full">
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interaction channels breakdown */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
              <span>Distribuição por Canais ({interactionsByType.total} interações)</span>
              <span className="text-slate-400 font-normal lowercase">no período selecionado</span>
            </h4>

            {interactionsByType.total === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-400">
                Nenhuma interação registrada dentro do período selecionado.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-emerald-700">
                      {interactionsByType.WhatsApp.count}
                    </div>
                    <div className="text-[10px] text-emerald-600">
                      {interactionsByType.WhatsApp.pct}% das ações
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Ligação</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-blue-700">
                      {interactionsByType.Ligação.count}
                    </div>
                    <div className="text-[10px] text-blue-600">
                      {interactionsByType.Ligação.pct}% das ações
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-violet-800 text-xs font-bold">
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mail</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-violet-700">
                      {interactionsByType['E-mail'].count}
                    </div>
                    <div className="text-[10px] text-violet-600">
                      {interactionsByType['E-mail'].pct}% das ações
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtered Arenas Detailed List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-violet-600" />
              <h3 className="text-base font-bold text-slate-900">
                Arenas Filtradas ({filteredArenas.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedFunnelStatus !== 'ALL'
                ? `Estágio selecionado: "${selectedFunnelStatus}"`
                : 'Exibindo todos os estágios'}
              {selectedCityFilter ? ` • Cidade: "${selectedCityFilter}"` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(selectedFunnelStatus !== 'ALL' || selectedCityFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFunnelStatus('ALL')
                  setSelectedCityFilter(null)
                }}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        </div>

        {filteredArenas.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            Nenhuma arena corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Arena</th>
                  <th className="py-3 px-3">Modalidade</th>
                  <th className="py-3 px-3">Localização</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Último Contato</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArenas.map((arena) => {
                  const config = STATUS_CONFIG[arena.status]
                  return (
                    <tr key={arena.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{arena.nome}</td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {arena.modalidade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {arena.cidade}
                        {arena.estado ? ` - ${arena.estado}` : ''}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.bgBadge}`}
                        >
                          {arena.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {formatDateBr(arena.ultimoContato)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to="/pipeline"
                          className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 font-semibold"
                        >
                          <span>Abrir no Funil</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
