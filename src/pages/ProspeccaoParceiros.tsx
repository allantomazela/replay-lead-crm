import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  Plus,
  CheckCircle,
  Loader2,
  Filter,
  Bookmark,
  RefreshCw,
  CheckSquare,
  Square,
  Phone,
  Map,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ParceiroInstalador, RegiaoParceiroSalva, TIPOS_PARCEIRO } from '@/types/parceiros'
import { searchOverpassParceiros } from '@/services/overpassParceiros'
import {
  addMultipleParceiros,
  addParceiro,
  addRegiaoParceiro,
  deleteRegiaoParceiro,
  getParceiros,
  getRegioesParceiros,
  searchParceirosPlaces,
  updateRegiaoParceiro,
} from '@/services/parceirosStorage'
import { useToast } from '@/hooks/use-toast'
import { formatPhoneNumber } from '@/lib/format'
import { ModuleSwitchLinks } from '@/components/ModuleSwitchLinks'

type FonteBusca = 'google' | 'osm'

export default function ProspeccaoParceiros() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [cidade, setCidade] = useState('São Paulo')
  const [estado, setEstado] = useState('SP')
  const [tipo, setTipo] = useState('Todos')
  const [fonte, setFonte] = useState<FonteBusca>('google')
  const [onlyWithPhone, setOnlyWithPhone] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<ParceiroInstalador[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [regioes, setRegioes] = useState<RegiaoParceiroSalva[]>([])
  const [saveName, setSaveName] = useState('')
  const [lastWithPhone, setLastWithPhone] = useState(0)

  const loadRegioes = useCallback(async () => {
    setRegioes(await getRegioesParceiros())
  }, [])

  useEffect(() => {
    void loadRegioes()
    const handler = () => void loadRegioes()
    window.addEventListener('replaylead:regioes-parceiros-updated', handler)
    return () => window.removeEventListener('replaylead:regioes-parceiros-updated', handler)
  }, [loadRegioes])

  useEffect(() => {
    void (async () => {
      const stored = await getParceiros()
      const names = new Set(stored.map((p) => p.nome.toLowerCase()))
      setSavedIds(new Set(results.filter((r) => names.has(r.nome.toLowerCase())).map((r) => r.id)))
    })()
  }, [results])

  async function executeSearch(
    searchCidade: string,
    searchEstado: string,
    searchTipo: string,
    searchFonte: FonteBusca = fonte,
    regiao?: RegiaoParceiroSalva,
  ) {
    if (!searchCidade.trim()) {
      toast({
        title: 'Cidade não informada',
        description: 'Digite a cidade para localizar profissionais.',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setSelectedIds(new Set())
    setNewIds(new Set())
    setLastWithPhone(0)

    try {
      let data: ParceiroInstalador[] = []
      let withPhone = 0

      if (searchFonte === 'google') {
        const payload = await searchParceirosPlaces({
          cidade: searchCidade.trim(),
          estado: searchEstado.trim(),
          tipo: searchTipo === 'Todos' ? 'Todos' : searchTipo,
          onlyWithPhone,
        })
        data = payload.results
        withPhone = payload.withPhone
      } else {
        data = await searchOverpassParceiros({
          cidade: searchCidade.trim(),
          estado: searchEstado.trim(),
          tipo: searchTipo === 'Todos' ? undefined : searchTipo,
        })
        withPhone = data.filter((p) => Boolean(p.whatsApp)).length
      }

      setResults(data)
      setLastWithPhone(withPhone)

      const stored = await getParceiros()
      const storedNames = new Set(stored.map((p) => p.nome.toLowerCase().trim()))
      const previousIds = new Set(regiao?.idsAnteriores || [])
      const detectedNew = new Set<string>()

      data.forEach((p) => {
        const isNew =
          !storedNames.has(p.nome.toLowerCase().trim()) &&
          (previousIds.size === 0 || !previousIds.has(p.id))
        if (isNew) detectedNew.add(p.id)
      })
      setNewIds(detectedNew)

      if (regiao) {
        await updateRegiaoParceiro(regiao.id, {
          ultimaExecucaoEm: new Date().toISOString(),
          totalEncontradas: data.length,
          novasUltimaBusca: detectedNew.size,
          idsAnteriores: data.map((p) => p.id),
        })
        await loadRegioes()
      }

      const phoneHint =
        searchFonte === 'google' && data.length > 0 && withPhone === 0
          ? ' Nenhum telefone no Google para esta cidade — use endereço/site ou tente outra cidade.'
          : ''
      toast({
        title: searchFonte === 'google' ? 'Busca Google concluída' : 'Busca no mapa concluída',
        description: `${data.length} profissionais · ${withPhone} com telefone para contato.${phoneHint}`,
      })
    } catch (err) {
      toast({
        title: 'Erro na busca',
        description: err instanceof Error ? err.message : 'Falha ao localizar profissionais.',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSaveSelected() {
    const toSave = results.filter((r) => selectedIds.has(r.id) && !savedIds.has(r.id))
    if (toSave.length === 0) {
      toast({ title: 'Nada para salvar', description: 'Selecione parceiros ainda não cadastrados.' })
      return
    }
    await addMultipleParceiros(
      toSave.map((p) => ({
        ...p,
        status: 'A Contatar',
        origem: p.origem || (fonte === 'google' ? 'google' : 'osm'),
        regioesAtendimento: p.regioesAtendimento?.length ? p.regioesAtendimento : [p.cidade],
      })),
    )
    setSavedIds((prev) => new Set([...prev, ...toSave.map((p) => p.id)]))
    toast({
      title: 'Parceiros salvos',
      description: `${toSave.length} adicionados ao cadastro para contato.`,
    })
  }

  async function handleSaveOne(parceiro: ParceiroInstalador) {
    await addParceiro({
      ...parceiro,
      status: 'A Contatar',
      origem: parceiro.origem || (fonte === 'google' ? 'google' : 'osm'),
      regioesAtendimento: parceiro.regioesAtendimento?.length
        ? parceiro.regioesAtendimento
        : [parceiro.cidade],
    })
    setSavedIds((prev) => new Set([...prev, parceiro.id]))
    toast({ title: 'Parceiro salvo', description: `"${parceiro.nome}" no cadastro.` })
  }

  async function handleSaveRegion() {
    const nome = saveName.trim() || `${cidade} - ${tipo}`
    await addRegiaoParceiro({
      nome,
      cidade: cidade.trim(),
      estado: estado.trim(),
      tipo,
      totalEncontradas: results.length,
      novasUltimaBusca: newIds.size,
      idsAnteriores: results.map((r) => r.id),
      ultimaExecucaoEm: results.length ? new Date().toISOString() : null,
    })
    setSaveName('')
    await loadRegioes()
    toast({ title: 'Região salva', description: `"${nome}" pronta para reexecutar.` })
  }

  function whatsAppHref(phone: string) {
    const digits = phone.replace(/\D/g, '')
    if (!digits) return null
    return `https://wa.me/${digits}`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-semibold text-emerald-200 mb-2">
              <Phone className="w-3.5 h-3.5" />
              Parceiros Instaladores
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Localize profissionais com telefone para parceria
            </h2>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Busque CFTV, eletricistas e segurança pelo Google Places (com telefone) ou pelo mapa OSM, e
              salve no cadastro para entrar em contato.
            </p>
          </div>
          <ModuleSwitchLinks current="parceiros" className="shrink-0 self-start" />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filtros de captura
            </h3>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setFonte('google')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                fonte === 'google' ? 'bg-white shadow text-emerald-800' : 'text-slate-500'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Google (telefones)
            </button>
            <button
              type="button"
              onClick={() => setFonte('osm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                fonte === 'osm' ? 'bg-white shadow text-emerald-800' : 'text-slate-500'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              OpenStreetMap
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void executeSearch(cidade, estado, tipo, fonte)
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Cidade *</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm"
              placeholder="Ex: Campinas"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">UF</label>
            <input
              maxLength={2}
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm uppercase"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="Todos">Todos</option>
              {TIPOS_PARCEIRO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : fonte === 'google' ? (
                <Phone className="w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {fonte === 'google' ? 'Buscar no Google' : 'Buscar no mapa'}
            </button>
          </div>
        </form>

        {fonte === 'google' && (
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyWithPhone}
              onChange={(e) => setOnlyWithPhone(e.target.checked)}
              className="rounded border-slate-300"
            />
            Só listar quem tem telefone (recomendado para contato)
          </label>
        )}

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end pt-2 border-t border-slate-100">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-slate-700">Salvar região atual</label>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={`${cidade} - ${tipo}`}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSaveRegion()}
            className="min-h-[40px] px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Bookmark className="w-4 h-4" />
            Salvar região
          </button>
        </div>

        {regioes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Regiões salvas</p>
            <div className="flex flex-wrap gap-2">
              {regioes.map((r) => (
                <div
                  key={r.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs"
                >
                  <button
                    type="button"
                    disabled={isSearching}
                    onClick={() => {
                      setCidade(r.cidade)
                      setEstado(r.estado)
                      setTipo(r.tipo)
                      void executeSearch(r.cidade, r.estado, r.tipo, fonte, r)
                    }}
                    className="font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {r.nome}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteRegiaoParceiro(r.id).then(loadRegioes)}
                    className="text-slate-400 hover:text-rose-600"
                    aria-label="Excluir região"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasSearched && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">{results.length} resultados</h3>
              <p className="text-xs text-slate-500">
                {selectedIds.size} selecionados · {newIds.size} novos · {lastWithPhone} com telefone
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.size === results.length
                      ? new Set()
                      : new Set(results.map((r) => r.id)),
                  )
                }
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 text-sm font-medium flex items-center gap-2"
              >
                {selectedIds.size === results.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() => void handleSaveSelected()}
                className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Salvar selecionados
              </button>
              <button
                type="button"
                onClick={() => navigate('/parceiros/cadastro')}
                className="min-h-[40px] px-4 rounded-xl border border-slate-200 text-sm font-medium"
              >
                Ir ao cadastro
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-10" />
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Telefone / WhatsApp</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => {
                  const wa = whatsAppHref(p.whatsApp)
                  return (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(p.id)) next.delete(p.id)
                              else next.add(p.id)
                              return next
                            })
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.nome}
                        {(p.origem === 'google' || p.origem === 'geoapify') && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {p.origem === 'google' ? 'Google' : 'Geoapify'}
                          </span>
                        )}
                        {newIds.has(p.id) && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Novo
                          </span>
                        )}
                        {savedIds.has(p.id) && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Salvo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.tipo}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.cidade}/{p.estado}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.whatsApp ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-800">
                              {formatPhoneNumber(p.whatsApp)}
                            </span>
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-emerald-700 hover:underline"
                              >
                                Abrir WhatsApp
                              </a>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {savedIds.has(p.id) ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            No CRM
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleSaveOne(p)}
                            className="text-emerald-700 hover:underline text-xs font-semibold"
                          >
                            Salvar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Nenhum profissional encontrado. Tente outra cidade ou desmarque o filtro de
                      telefone.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
