import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Compass,
  FileSpreadsheet,
  Search,
  Download,
  Plus,
  CheckCircle,
  MapPin,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  Bookmark,
  RefreshCw,
} from 'lucide-react'
import { Arena, RegiaoSalva } from '@/types/crm'
import { searchOverpassArenas } from '@/services/overpass'
import { parseArenaCSV, exportArenasToCSV, CSVParseResult } from '@/services/csvParser'
import {
  addMultipleArenas,
  addArena,
  getArenas,
  getRegioesSalvas,
  addRegiaoSalva,
  updateRegiaoSalva,
  deleteRegiaoSalva,
} from '@/services/storage'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { SavedRegionsPanel } from '@/components/SavedRegionsPanel'
import { SaveRegionModal } from '@/components/SaveRegionModal'
import { RenameRegionModal, DeleteRegionModal } from '@/components/RegionModals'

export default function Index() {
  const { toast } = useToast()
  const navigate = useNavigate()

  // Search filter inputs
  const [cidade, setCidade] = useState('São Paulo')
  const [estado, setEstado] = useState('SP')
  const [modalidade, setModalidade] = useState('Todos')

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<Arena[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)

  // CSV Import preview dialog state
  const [csvPreview, setCsvPreview] = useState<CSVParseResult | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Saved ids tracking to show green badge in table
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // New arenas tracking (detected as new during saved region re-run)
  const [newArenaIds, setNewArenaIds] = useState<Set<string>>(new Set())
  const [lastExecutedRegion, setLastExecutedRegion] = useState<RegiaoSalva | null>(null)

  // Saved regions state
  const [regioes, setRegioes] = useState<RegiaoSalva[]>([])
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [regionToRename, setRegionToRename] = useState<RegiaoSalva | null>(null)
  const [regionToDelete, setRegionToDelete] = useState<RegiaoSalva | null>(null)

  const loadRegioes = useCallback(() => {
    setRegioes(getRegioesSalvas())
  }, [])

  useEffect(() => {
    loadRegioes()

    const handleRegioesUpdated = () => {
      loadRegioes()
    }

    window.addEventListener('replaylead:regioes-updated', handleRegioesUpdated)
    window.addEventListener('arenalead:regioes-updated', handleRegioesUpdated)

    return () => {
      window.removeEventListener('replaylead:regioes-updated', handleRegioesUpdated)
      window.removeEventListener('arenalead:regioes-updated', handleRegioesUpdated)
    }
  }, [loadRegioes])

  useEffect(() => {
    // Check which arenas exist in storage
    const stored = getArenas()
    const storedNames = new Set(stored.map((a) => a.nome.toLowerCase()))
    const matched = new Set<string>()
    results.forEach((r) => {
      if (storedNames.has(r.nome.toLowerCase())) {
        matched.add(r.id)
      }
    })
    setSavedIds(matched)
  }, [results])

  const executeSearch = async ({
    searchCidade,
    searchEstado,
    searchModalidade,
    regiaoAssociada,
  }: {
    searchCidade: string
    searchEstado: string
    searchModalidade: string
    regiaoAssociada?: RegiaoSalva
  }) => {
    if (!searchCidade.trim()) {
      toast({
        title: 'Cidade não informada',
        description: 'Digite o nome da cidade para buscar arenas no mapa.',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setSelectedIds(new Set())
    setNewArenaIds(new Set())

    try {
      const data = await searchOverpassArenas({
        cidade: searchCidade.trim(),
        estado: searchEstado.trim(),
        modalidade: searchModalidade === 'Todos' ? undefined : searchModalidade,
      })

      setResults(data)

      // Identificar quais arenas já estão salvas no CRM
      const storedArenas = getArenas()
      const storedNames = new Set(storedArenas.map((a) => a.nome.toLowerCase().trim()))

      // Identificar quais arenas são NOVAS:
      // 1. Não estão no CRM (não salvas)
      // 2. E, se for uma busca de região salva que já tinha execução anterior,
      //    também checa se o id/nome não constava na busca anterior da região
      const newIds = new Set<string>()
      const previousIds = new Set(regiaoAssociada?.arenasIdsAnteriores || [])

      data.forEach((arena) => {
        const isAlreadyInCrm = storedNames.has(arena.nome.toLowerCase().trim())
        const isBrandNewInOsm =
          regiaoAssociada && regiaoAssociada.ultimaExecucaoEm
            ? !previousIds.has(arena.id)
            : !isAlreadyInCrm

        if (!isAlreadyInCrm || isBrandNewInOsm) {
          newIds.add(arena.id)
        }
      })

      setNewArenaIds(newIds)

      // Se a busca partiu de uma região salva, atualiza metadados no storage
      if (regiaoAssociada) {
        setLastExecutedRegion(regiaoAssociada)
        const totalNovas = newIds.size
        updateRegiaoSalva(regiaoAssociada.id, {
          ultimaExecucaoEm: new Date().toISOString(),
          totalEncontradas: data.length,
          novasUltimaBusca: totalNovas,
          arenasIdsAnteriores: data.map((d) => d.id),
        })
        loadRegioes()

        // Toast específico para região agendada/reexecutada
        toast({
          title: `Busca concluída: ${regiaoAssociada.nome}`,
          description: `${data.length} arenas encontradas${
            totalNovas > 0 ? `, ${totalNovas} novas em relação à última execução.` : '.'
          }`,
        })
      } else {
        setLastExecutedRegion(null)
        if (data.length > 0) {
          toast({
            title: 'Busca concluída!',
            description: `Encontramos ${data.length} arenas esportivas em ${searchCidade}.`,
          })
        } else {
          toast({
            title: 'Nenhum resultado',
            description: 'Tente alterar os termos da busca ou deixe o estado em branco.',
          })
        }
      }
    } catch (err: unknown) {
      console.error('Erro na busca Overpass:', err)
      const errMsg = err instanceof Error ? err.message : 'Falha na conexão com a API de mapas.'
      toast({
        title: 'Erro ao consultar mapa',
        description: `${errMsg}. Tente novamente em instantes.`,
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchMap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    // Find matching saved region if exists to track diffs
    const matching = regioes.find(
      (r) =>
        r.cidade.toLowerCase() === cidade.trim().toLowerCase() &&
        r.estado.toLowerCase() === estado.trim().toLowerCase() &&
        r.modalidade.toLowerCase() === modalidade.trim().toLowerCase(),
    )
    await executeSearch({
      searchCidade: cidade,
      searchEstado: estado,
      searchModalidade: modalidade,
      regiaoAssociada: matching,
    })
  }

  const handleExecuteSavedRegion = async (regiao: RegiaoSalva) => {
    // Fill current filter inputs with this saved region
    setCidade(regiao.cidade)
    setEstado(regiao.estado)
    setModalidade(regiao.modalidade)

    await executeSearch({
      searchCidade: regiao.cidade,
      searchEstado: regiao.estado,
      searchModalidade: regiao.modalidade,
      regiaoAssociada: regiao,
    })
  }

  const handleSaveCurrentRegion = (nome: string) => {
    const nova = addRegiaoSalva({
      nome,
      cidade: cidade.trim(),
      estado: estado.trim(),
      modalidade,
      totalEncontradas: results.length,
      novasUltimaBusca: 0,
      arenasIdsAnteriores: results.map((r) => r.id),
      ultimaExecucaoEm: results.length > 0 ? new Date().toISOString() : null,
    })
    loadRegioes()
    toast({
      title: 'Região salva!',
      description: `"${nova.nome}" adicionada aos seus favoritos para reexecuções rápidas.`,
    })
  }

  const handleRenameRegion = (id: string, newNome: string) => {
    const updated = updateRegiaoSalva(id, { nome: newNome })
    loadRegioes()
    if (updated) {
      toast({
        title: 'Região renomeada',
        description: `Nome atualizado para "${updated.nome}".`,
      })
    }
  }

  const handleDeleteRegion = (id: string) => {
    deleteRegiaoSalva(id)
    loadRegioes()
    toast({
      title: 'Região removida',
      description: 'O favorito de busca foi excluído com sucesso.',
    })
  }

  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseArenaCSV(text)
        if (parsed.arenas.length === 0) {
          toast({
            title: 'Planilha vazia ou inválida',
            description: 'Nenhum lead válido com coluna Nome foi encontrado no CSV.',
            variant: 'destructive',
          })
          return
        }
        setCsvPreview(parsed)
        setIsPreviewOpen(true)
      } catch (err) {
        toast({
          title: 'Erro ao ler arquivo CSV',
          description: 'Verifique a formatação do arquivo e tente novamente.',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file, 'UTF-8')
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleConfirmCsvImport = () => {
    if (!csvPreview) return
    setResults(csvPreview.arenas)
    setHasSearched(true)
    setSelectedIds(new Set(csvPreview.arenas.map((a) => a.id)))
    setIsPreviewOpen(false)

    toast({
      title: 'Planilha carregada!',
      description: `${csvPreview.arenas.length} leads prontos para revisão e salvamento.`,
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveOne = (arena: Arena) => {
    addArena({
      nome: arena.nome,
      modalidade: arena.modalidade,
      whatsApp: arena.whatsApp,
      email: arena.email,
      endereco: arena.endereco,
      cidade: arena.cidade,
      estado: arena.estado,
      status: 'A Contatar',
      ultimoContato: null,
      observacoes: arena.observacoes || 'Capturado via prospecção.',
    })

    setSavedIds((prev) => new Set([...prev, arena.id]))
    toast({
      title: 'Arena salva com sucesso!',
      description: `"${arena.nome}" adicionada ao Pipeline como "A Contatar".`,
    })
  }

  const handleSaveSelected = () => {
    const toSave = results.filter((r) => selectedIds.has(r.id))
    if (toSave.length === 0) {
      toast({
        title: 'Nenhuma selecionada',
        description: 'Marque as caixas de seleção das arenas que deseja salvar.',
      })
      return
    }

    addMultipleArenas(
      toSave.map((arena) => ({
        nome: arena.nome,
        modalidade: arena.modalidade,
        whatsApp: arena.whatsApp,
        email: arena.email,
        endereco: arena.endereco,
        cidade: arena.cidade,
        estado: arena.estado,
        status: 'A Contatar',
        ultimoContato: null,
        observacoes: arena.observacoes || 'Importado via prospecção em lote.',
      })),
    )

    const newSaved = new Set(savedIds)
    toSave.forEach((a) => newSaved.add(a.id))
    setSavedIds(newSaved)

    toast({
      title: 'Arenas salvas com sucesso!',
      description: `${toSave.length} arenas foram adicionadas ao Pipeline de Vendas.`,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Intro hero banner */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-violet-600/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/30 border border-violet-400/30 text-xs font-semibold text-violet-200">
            <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            <span>Prospecção Inteligente de Quadras & Arenas</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Descubra Arenas Esportivas para Gravação de Jogadas
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Busque centros esportivos de Beach Tennis, Society e Vôlei de Areia em qualquer cidade
            do Brasil pelo mapa ou carregue sua lista via planilha CSV.
          </p>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filtros de Captura
            </h3>
          </div>
          <span className="text-xs text-slate-400">OpenStreetMap API + Importador CSV</span>
        </div>

        <form onSubmit={handleSearchMap} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Cidade *</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: São Paulo, Campinas, Curitiba"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-sm text-slate-900 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Estado (UF)</label>
              <input
                type="text"
                maxLength={2}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                placeholder="Ex: SP, RJ, MG"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-sm text-slate-900 uppercase bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Modalidade</label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-sm text-slate-900 bg-white font-medium"
              >
                <option value="Todos">Todas as Modalidades</option>
                <option value="Beach Tennis">Beach Tennis</option>
                <option value="Futebol Society">Futebol Society</option>
                <option value="Vôlei">Vôlei</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            {/* Primary Search Button */}
            <button
              type="submit"
              disabled={isSearching}
              className="min-h-[44px] px-6 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Buscar no Mapa</span>
                </>
              )}
            </button>

            {/* Save as region button */}
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              disabled={!cidade.trim()}
              className="min-h-[44px] px-4 rounded-xl border border-violet-200 bg-violet-50/70 hover:bg-violet-100 text-violet-800 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50"
              title="Salvar esta combinação de filtros como região favorita"
            >
              <Bookmark className="w-4 h-4 text-violet-600" />
              <span>Salvar Região</span>
            </button>

            {/* CSV Import Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importar CSV</span>
            </button>

            {/* Hidden CSV file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvFileSelected}
            />

            <div className="sm:ml-auto flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Resultados são pré-visualizados antes de entrar no funil.</span>
            </div>
          </div>
        </form>
      </div>

      {/* Saved Regions Panel (Favoritos de Busca e Reexecução) */}
      <SavedRegionsPanel
        regioes={regioes}
        currentCidade={cidade}
        currentEstado={estado}
        currentModalidade={modalidade}
        isSearching={isSearching}
        activeRegiaoId={lastExecutedRegion?.id || null}
        onExecute={handleExecuteSavedRegion}
        onSaveCurrent={() => setIsSaveModalOpen(true)}
        onRename={(r) => setRegionToRename(r)}
        onDelete={(r) => setRegionToDelete(r)}
      />

      {/* Results Section */}
      {hasSearched && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-fade-in-up">
          {/* Table Header toolbar */}
          <div className="p-4 md:px-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Resultados Encontrados ({results.length})
              </h3>
              {selectedIds.size > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">
                  {selectedIds.size} selecionadas
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Bulk Save Button */}
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveSelected}
                  disabled={selectedIds.size === 0}
                  className="flex-1 sm:flex-none min-h-[40px] px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvar Selecionados ({selectedIds.size})</span>
                </button>
              )}

              {/* Export CSV of current results */}
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportArenasToCSV(results, `prospeccao_${cidade}.csv`)}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Exportar CSV dos resultados da busca"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span className="hidden md:inline">Exportar CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* Table or Empty State */}
          {results.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <Search className="w-7 h-7" />
              </div>
              <p className="text-slate-700 font-semibold text-base">
                Nenhuma arena encontrada para esses filtros. Tente outra cidade ou estado.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Dica: tente buscar por cidades maiores vizinhas ou importar sua própria base em CSV.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          {selectedIds.size === results.length && results.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-violet-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Nome da Arena</th>
                      <th className="py-3.5 px-4">Modalidade</th>
                      <th className="py-3.5 px-4">Endereço</th>
                      <th className="py-3.5 px-4">Cidade / Estado</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((arena, idx) => {
                      const isSelected = selectedIds.has(arena.id)
                      const isSaved = savedIds.has(arena.id)
                      const isNew = newArenaIds.has(arena.id) && !isSaved

                      return (
                        <tr
                          key={arena.id}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-violet-50/30' : isNew ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(arena.id)}
                              className="text-slate-500 hover:text-slate-800"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-violet-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{arena.nome}</span>
                              {isNew && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-xs">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                  Novo
                                </span>
                              )}
                              {isSaved && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                  <CheckCircle className="w-3 h-3" />
                                  Salvo
                                </span>
                              )}
                            </div>
                            {arena.whatsApp && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                WhatsApp: {arena.whatsApp}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {arena.modalidade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {arena.endereco || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {arena.cidade}
                            {arena.estado ? ` / ${arena.estado}` : ''}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isSaved ? (
                              <button
                                type="button"
                                onClick={() => navigate('/pipeline')}
                                className="min-h-[36px] px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                              >
                                <span>No Funil</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSaveOne(arena)}
                                className="min-h-[36px] px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Salvar</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-like List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {results.map((arena) => {
                  const isSelected = selectedIds.has(arena.id)
                  const isSaved = savedIds.has(arena.id)
                  const isNew = newArenaIds.has(arena.id) && !isSaved

                  return (
                    <div
                      key={arena.id}
                      className={`p-4 space-y-2.5 ${
                        isSelected ? 'bg-violet-50/40' : isNew ? 'bg-amber-50/20' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(arena.id)}
                            className="mt-0.5 text-slate-500"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-violet-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm">{arena.nome}</h4>
                              {isNew && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-full">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                  Novo
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {arena.modalidade}
                            </span>
                          </div>
                        </div>

                        {isSaved ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                            Salvo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSaveOne(arena)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shrink-0"
                          >
                            Salvar
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 pl-7 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {arena.endereco || 'Endereço não informado'} • {arena.cidade}/
                            {arena.estado}
                          </span>
                        </div>
                        {arena.whatsApp && (
                          <p className="text-slate-600 font-medium">WhatsApp: {arena.whatsApp}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* CSV Preview Dialog */}
      {isPreviewOpen && csvPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[650px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-modal-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Pré-visualização do CSV</h3>
                  <p className="text-xs text-slate-500">
                    {csvPreview.arenas.length} linhas reconhecidas de {csvPreview.totalRows} no
                    total
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
                <p className="font-semibold">Colunas detectadas:</p>
                <p className="text-[11px] text-amber-700 font-mono">
                  {csvPreview.headers.join(', ')}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">Modalidade</th>
                      <th className="p-2.5">WhatsApp</th>
                      <th className="p-2.5">Cidade/UF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {csvPreview.arenas.slice(0, 5).map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-semibold text-slate-900">{a.nome}</td>
                        <td className="p-2.5">{a.modalidade}</td>
                        <td className="p-2.5">{a.whatsApp || '—'}</td>
                        <td className="p-2.5">
                          {a.cidade}
                          {a.estado ? `/${a.estado}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvPreview.arenas.length > 5 && (
                <p className="text-center text-slate-400 text-[11px]">
                  + {csvPreview.arenas.length - 5} outras arenas na lista
                </p>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCsvImport}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20"
              >
                Importar {csvPreview.arenas.length} Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Region Modal */}
      <SaveRegionModal
        isOpen={isSaveModalOpen}
        cidade={cidade}
        estado={estado}
        modalidade={modalidade}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveCurrentRegion}
      />

      {/* Rename Region Modal */}
      <RenameRegionModal
        isOpen={!!regionToRename}
        regiao={regionToRename}
        onClose={() => setRegionToRename(null)}
        onConfirm={handleRenameRegion}
      />

      {/* Delete Region Modal */}
      <DeleteRegionModal
        isOpen={!!regionToDelete}
        regiao={regionToDelete}
        onClose={() => setRegionToDelete(null)}
        onConfirm={handleDeleteRegion}
      />
    </div>
  )
}
