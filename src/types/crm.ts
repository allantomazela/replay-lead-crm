import type { ContactQuality } from '@/lib/contact-validation'

export type StatusLead =
  | 'A Contatar'
  | 'Contatado'
  | 'Em Negociação'
  | 'Fechado / Cliente'
  | 'Perdido'

export type TipoContato = 'WhatsApp' | 'Ligação' | 'E-mail'

export type ModalidadeEsportiva = 'Beach Tennis' | 'Futebol Society' | 'Vôlei' | 'Outro'

export interface HistoricoInteracao {
  id: string
  arenaId: string
  tipo: TipoContato
  anotacao: string
  dataRegistro: string // ISO string e.g. "2025-05-10T14:30:00.000Z" or YYYY-MM-DD
}

export interface Arena {
  id: string
  nome: string
  modalidade: string
  whatsApp: string // international digits only, e.g. "5511999999999"
  email: string
  endereco: string
  cidade: string
  estado: string
  status: StatusLead
  ultimoContato?: string | null // ISO date or YYYY-MM-DD
  observacoes?: string
  isSample?: boolean
  createdAt: string
  /** Campos de prospecção (não obrigatórios no banco). */
  website?: string
  osmId?: string
  contactQuality?: ContactQuality
}

export interface RegiaoSalva {
  id: string
  nome: string
  cidade: string
  estado: string
  modalidade: string
  criadoEm: string // ISO string
  ultimaExecucaoEm?: string | null // ISO string
  totalEncontradas?: number
  novasUltimaBusca?: number
  arenasIdsAnteriores?: string[] // IDs das arenas vistas na última execução para diff
}

export const STATUS_LIST: readonly StatusLead[] = [
  'A Contatar',
  'Contatado',
  'Em Negociação',
  'Fechado / Cliente',
  'Perdido',
] as const

export const STATUS_CONFIG: Record<
  StatusLead,
  {
    color: string
    bgBadge: string
    textBadge: string
    borderCol: string
    headerBg: string
    headerText: string
  }
> = {
  'A Contatar': {
    color: '#F43F5E',
    bgBadge: 'bg-rose-50 text-rose-700 border-rose-200',
    textBadge: 'text-rose-600',
    borderCol: 'border-rose-400',
    headerBg: 'bg-rose-500',
    headerText: 'text-white',
  },
  Contatado: {
    color: '#F59E0B',
    bgBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    textBadge: 'text-amber-600',
    borderCol: 'border-amber-400',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
  },
  'Em Negociação': {
    color: '#3B82F6',
    bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    textBadge: 'text-blue-600',
    borderCol: 'border-blue-400',
    headerBg: 'bg-blue-500',
    headerText: 'text-white',
  },
  'Fechado / Cliente': {
    color: '#10B981',
    bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textBadge: 'text-emerald-600',
    borderCol: 'border-emerald-400',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
  },
  Perdido: {
    color: '#6B7280',
    bgBadge: 'bg-slate-100 text-slate-700 border-slate-200',
    textBadge: 'text-slate-600',
    borderCol: 'border-slate-400',
    headerBg: 'bg-slate-500',
    headerText: 'text-white',
  },
}
