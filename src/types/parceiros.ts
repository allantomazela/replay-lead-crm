export type TipoParceiro =
  | 'Instalador de Câmeras / CFTV'
  | 'Eletricista'
  | 'Instalador de Segurança'

export type StatusParceiro = 'A Contatar' | 'Contatado' | 'Parceiro Ativo' | 'Inativo'

export interface ParceiroInstalador {
  id: string
  nome: string
  tipo: TipoParceiro | string
  whatsApp: string
  email: string
  endereco: string
  cidade: string
  estado: string
  /** Cidades/regiões que o técnico atende */
  regioesAtendimento: string[]
  observacoes?: string
  status: StatusParceiro | string
  origem: 'manual' | 'osm' | 'google' | 'geoapify' | string
  isSample?: boolean
  createdAt: string
}

export interface RegiaoParceiroSalva {
  id: string
  nome: string
  cidade: string
  estado: string
  tipo: string
  criadoEm: string
  ultimaExecucaoEm?: string | null
  totalEncontradas?: number
  novasUltimaBusca?: number
  idsAnteriores?: string[]
}

export const TIPOS_PARCEIRO: readonly TipoParceiro[] = [
  'Instalador de Câmeras / CFTV',
  'Eletricista',
  'Instalador de Segurança',
] as const

export const STATUS_PARCEIRO_LIST: readonly StatusParceiro[] = [
  'A Contatar',
  'Contatado',
  'Parceiro Ativo',
  'Inativo',
] as const
