import { useState, useMemo } from 'react'
import {
  Bookmark,
  Play,
  Pencil,
  Trash2,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  Plus,
  Compass,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { RegiaoSalva } from '@/types/crm'

interface SavedRegionsPanelProps {
  regioes: RegiaoSalva[]
  currentCidade: string
  currentEstado: string
  currentModalidade: string
  isSearching: boolean
  activeRegiaoId: string | null
  onExecute: (regiao: RegiaoSalva) => void
  onSaveCurrent: () => void
  onRename: (regiao: RegiaoSalva) => void
  onDelete: (regiao: RegiaoSalva) => void
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Nunca executada'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} às ${hours}:${mins}`
  } catch {
    return '—'
  }
}

export function SavedRegionsPanel({
  regioes,
  currentCidade,
  currentEstado,
  currentModalidade,
  isSearching,
  activeRegiaoId,
  onExecute,
  onSaveCurrent,
  onRename,
  onDelete,
}: SavedRegionsPanelProps) {
  const [filterQuery, setFilterQuery] = useState('')

  const isCurrentFilterSaved = useMemo(() => {
    const norm = (s: string) => (s || '').trim().toLowerCase()
    return regioes.some(
      (r) =>
        norm(r.cidade) === norm(currentCidade) &&
        norm(r.estado) === norm(currentEstado) &&
        norm(r.modalidade) === norm(currentModalidade),
    )
  }, [regioes, currentCidade, currentEstado, currentModalidade])

  const filteredRegioes = useMemo(() => {
    if (!filterQuery.trim()) return regioes
    const q = filterQuery.toLowerCase().trim()
    return regioes.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        r.cidade.toLowerCase().includes(q) ||
        r.estado.toLowerCase().includes(q) ||
        r.modalidade.toLowerCase().includes(q),
    )
  }, [regioes, filterQuery])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 md:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Bookmark className="w-4 h-4 fill-violet-700/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Regiões Salvas para Importação</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800">
                {regioes.length}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Favoritos de busca com reexecução em 1 clique e detecção de novas arenas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick save button */}
          <button
            type="button"
            onClick={onSaveCurrent}
            disabled={!currentCidade.trim()}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCurrentFilterSaved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
            title={
              isCurrentFilterSaved
                ? 'Essa combinação já está salva nas regiões abaixo. Clique para salvar outra com nome customizado.'
                : 'Salvar filtros atuais como nova Região'
            }
          >
            {isCurrentFilterSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Região Atual Salva</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Filtros Atuais</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter / search among saved regions if more than 3 */}
      {regioes.length > 3 && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar regiões salvas por nome ou cidade..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500 bg-slate-50/50"
          />
        </div>
      )}

      {/* Grid of region cards */}
      {regioes.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
          <Bookmark className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma região salva ainda</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Preencha a cidade e os filtros acima e clique em &quot;Salvar região&quot; para
            reexecutar buscas agendadas ou periódicas com apenas um clique.
          </p>
        </div>
      ) : filteredRegioes.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Nenhuma região corresponde ao filtro &quot;{filterQuery}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRegioes.map((regiao) => {
            const isActive = activeRegiaoId === regiao.id
            const isMatchingCurrentInputs =
              regiao.cidade.toLowerCase() === currentCidade.trim().toLowerCase() &&
              regiao.estado.toLowerCase() === currentEstado.trim().toLowerCase() &&
              regiao.modalidade.toLowerCase() === currentModalidade.trim().toLowerCase()

            return (
              <div
                key={regiao.id}
                className={`relative rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'border-violet-500 bg-violet-50/40 shadow-sm ring-1 ring-violet-500/30'
                    : isMatchingCurrentInputs
                      ? 'border-violet-300 bg-slate-50/70 hover:border-violet-400'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs'
                }`}
              >
                {/* Top info */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bookmark className="w-3.5 h-3.5 text-violet-600 shrink-0 fill-violet-600/30" />
                      <h4
                        className="font-bold text-slate-900 text-xs md:text-sm truncate"
                        title={regiao.nome}
                      >
                        {regiao.nome}
                      </h4>
                    </div>

                    {/* Actions menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRename(regiao)}
                        title="Renomear região"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(regiao)}
                        title="Excluir região salva"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {regiao.cidade}
                      {regiao.estado ? ` - ${regiao.estado}` : ''}
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-violet-50 text-violet-700 border border-violet-100">
                      {regiao.modalidade}
                    </span>

                    {typeof regiao.novasUltimaBusca === 'number' && regiao.novasUltimaBusca > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />+
                        {regiao.novasUltimaBusca} novas
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with last run info and run action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                  <div className="text-slate-400 truncate flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate" title={formatDate(regiao.ultimaExecucaoEm)}>
                      {regiao.ultimaExecucaoEm
                        ? `Última: ${formatDate(regiao.ultimaExecucaoEm).split(' às ')[0]}`
                        : 'Nunca executada'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onExecute(regiao)}
                    disabled={isSearching}
                    className="min-h-[32px] px-3 rounded-lg bg-[#03045e] hover:bg-[#020347] text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                    title={`Buscar arenas em ${regiao.cidade} (${regiao.modalidade})`}
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Buscar agora</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
