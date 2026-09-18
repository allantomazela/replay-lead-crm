import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  MapPin,
  X,
  Save,
  Users,
  Share2,
  Copy,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { ModuleSwitchLinks } from '@/components/ModuleSwitchLinks'
import {
  ParceiroInstalador,
  STATUS_PARCEIRO_LIST,
  TIPOS_PARCEIRO,
  TipoParceiro,
  StatusParceiro,
} from '@/types/parceiros'
import {
  addParceiro,
  deleteParceiro,
  getParceiroConvite,
  getParceiros,
  updateParceiro,
} from '@/services/parceirosStorage'
import { useToast } from '@/hooks/use-toast'
import { cleanPhoneNumber, formatPhoneNumber } from '@/lib/format'

const emptyForm = {
  nome: '',
  tipo: 'Instalador de Câmeras / CFTV' as TipoParceiro,
  whatsApp: '',
  telefone: '',
  email: '',
  website: '',
  cpfCnpj: '',
  endereco: '',
  cidade: '',
  estado: 'SP',
  regioesAtendimento: '',
  observacoes: '',
  status: 'A Contatar' as StatusParceiro,
}

const STATUS_STYLE: Record<string, string> = {
  'A Contatar': 'bg-amber-50 text-amber-800 ring-amber-200',
  Contatado: 'bg-sky-50 text-sky-800 ring-sky-200',
  'Parceiro Ativo': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Inativo: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export default function CadastroParceiros() {
  const { toast } = useToast()
  const [parceiros, setParceiros] = useState<ParceiroInstalador[]>([])
  const [query, setQuery] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroCidade, setFiltroCidade] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setRefreshing(true)
    try {
      const list = await getParceiros()
      setParceiros((prev) => {
        if (opts?.silent && prev.length > 0) {
          const prevIds = new Set(prev.map((p) => p.id))
          const novos = list.filter((p) => !prevIds.has(p.id))
          if (novos.length > 0) {
            // toast via side-effect below after state settle — use queueMicrotask
            queueMicrotask(() => {
              toast({
                title:
                  novos.length === 1
                    ? 'Novo cadastro recebido'
                    : `${novos.length} novos cadastros`,
                description:
                  novos.length === 1
                    ? `"${novos[0].nome}" entrou na lista.`
                    : 'A lista foi atualizada automaticamente.',
              })
            })
          }
        }
        return list
      })
      setLastUpdatedAt(new Date())
    } finally {
      if (!opts?.silent) setRefreshing(false)
    }
  }, [toast])

  const loadInvite = useCallback(async () => {
    setLoadingInvite(true)
    try {
      const convite = await getParceiroConvite()
      setInviteUrl(`${window.location.origin}${convite.path}`)
    } catch (err) {
      toast({
        title: 'Não foi possível gerar o link',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoadingInvite(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
    void loadInvite()
    const handler = () => void load({ silent: true })
    window.addEventListener('replaylead:parceiros-updated', handler)
    const pollId = window.setInterval(() => {
      void load({ silent: true })
    }, 12000)
    return () => {
      window.removeEventListener('replaylead:parceiros-updated', handler)
      window.clearInterval(pollId)
    }
  }, [load, loadInvite])

  const cidadesDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const p of parceiros) {
      if (p.cidade?.trim()) set.add(p.cidade.trim())
      for (const c of p.regioesAtendimento || []) {
        if (c.trim()) set.add(c.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [parceiros])

  const estadosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const p of parceiros) {
      if (p.estado?.trim()) set.add(p.estado.trim().toUpperCase())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [parceiros])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cidadeFiltro = filtroCidade.trim().toLowerCase()
    const ufFiltro = filtroEstado.trim().toUpperCase()

    return parceiros.filter((p) => {
      if (filtroTipo !== 'Todos' && p.tipo !== filtroTipo) return false
      if (ufFiltro !== 'TODOS' && (p.estado || '').toUpperCase() !== ufFiltro) return false
      if (cidadeFiltro !== 'todas') {
        const reside = (p.cidade || '').toLowerCase() === cidadeFiltro
        const atende = (p.regioesAtendimento || []).some(
          (c) => c.trim().toLowerCase() === cidadeFiltro,
        )
        if (!reside && !atende) return false
      }
      if (!q) return true
      return (
        p.nome.toLowerCase().includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        (p.cpfCnpj || '').includes(q) ||
        (p.regioesAtendimento || []).some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [parceiros, query, filtroTipo, filtroCidade, filtroEstado])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEdit(p: ParceiroInstalador) {
    setEditingId(p.id)
    setForm({
      nome: p.nome,
      tipo: (TIPOS_PARCEIRO.includes(p.tipo as TipoParceiro)
        ? p.tipo
        : 'Instalador de Câmeras / CFTV') as TipoParceiro,
      whatsApp: p.whatsApp,
      telefone: p.telefone || '',
      email: p.email,
      website: p.website || '',
      cpfCnpj: p.cpfCnpj || '',
      endereco: p.endereco,
      cidade: p.cidade,
      estado: p.estado,
      regioesAtendimento: (p.regioesAtendimento || []).join(', '),
      observacoes: p.observacoes || '',
      status: (STATUS_PARCEIRO_LIST.includes(p.status as StatusParceiro)
        ? p.status
        : 'A Contatar') as StatusParceiro,
    })
    setIsFormOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    setSaving(true)
    const regioes = form.regioesAtendimento
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      whatsApp: form.whatsApp,
      telefone: form.telefone,
      email: form.email,
      website: form.website,
      cpfCnpj: form.cpfCnpj,
      endereco: form.endereco,
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      regioesAtendimento: regioes.length ? regioes : form.cidade.trim() ? [form.cidade.trim()] : [],
      observacoes: form.observacoes || undefined,
      status: form.status,
      origem: 'manual' as const,
    }

    try {
      if (editingId) {
        await updateParceiro(editingId, payload)
        toast({ title: 'Parceiro atualizado' })
      } else {
        await addParceiro(payload)
        toast({ title: 'Parceiro cadastrado' })
      }
      setIsFormOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return
    await deleteParceiro(id)
    toast({ title: 'Parceiro removido' })
    await load()
  }

  async function copyInviteLink() {
    let url = inviteUrl
    if (!url) {
      const convite = await getParceiroConvite()
      url = `${window.location.origin}${convite.path}`
      setInviteUrl(url)
    }
    await navigator.clipboard.writeText(url)
    toast({ title: 'Link copiado', description: 'Cole no WhatsApp ou e-mail do candidato.' })
  }

  async function shareInviteWhatsApp() {
    let url = inviteUrl
    if (!url) {
      const convite = await getParceiroConvite()
      url = `${window.location.origin}${convite.path}`
      setInviteUrl(url)
    }
    const text = `Olá! Segue o link para se cadastrar como parceiro instalador conosco. É só preencher o formulário (não precisa criar login):\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  function openWhatsAppChat(p: ParceiroInstalador) {
    const digits = cleanPhoneNumber(p.whatsApp)
    if (!digits) {
      toast({
        title: 'Sem WhatsApp',
        description: 'Este parceiro não tem número cadastrado.',
        variant: 'destructive',
      })
      return
    }
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer')
  }

  function shareContactWhatsApp(p: ParceiroInstalador) {
    const phone = p.whatsApp ? formatPhoneNumber(p.whatsApp) : '—'
    const tel = p.telefone ? formatPhoneNumber(p.telefone) : ''
    const cities = (p.regioesAtendimento || []).join(', ') || p.cidade || '—'
    const lines = [
      '*Contato — Parceiro Instalador Replay Sports*',
      `Nome: ${p.nome}`,
      `Tipo: ${p.tipo}`,
      `WhatsApp: ${phone}`,
    ]
    if (tel) lines.push(`Telefone: ${tel}`)
    if (p.email) lines.push(`E-mail: ${p.email}`)
    if (p.website) lines.push(`Site: ${p.website}`)
    lines.push(`Cidades: ${cities}`)
    if (p.cpfCnpj) lines.push(`CPF/CNPJ: ${p.cpfCnpj}`)

    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
            <Users className="w-3.5 h-3.5" />
            Cadastro de parceiros
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Instaladores e técnicos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualize contatos, compartilhe no WhatsApp e envie o formulário público de cadastro.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ModuleSwitchLinks current="parceiros" tone="onLight" />
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
            title="Recarregar lista"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Recarregar
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo parceiro
          </button>
        </div>
      </div>

      {lastUpdatedAt && (
        <p className="text-[11px] text-slate-400 -mt-3">
          Atualizado automaticamente · última checagem às{' '}
          {lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Share2 className="w-4 h-4 text-emerald-600" />
          Formulário público para candidatos
        </div>
        <p className="text-xs text-slate-500">
          O candidato abre o link, preenche e o cadastro entra automaticamente na sua lista.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={loadingInvite ? 'Gerando link...' : inviteUrl}
            className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-slate-50"
          />
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar link
          </button>
          <button
            type="button"
            onClick={() => void shareInviteWhatsApp()}
            className="min-h-[44px] px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Compartilhar no WhatsApp
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="relative md:col-span-2 xl:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
        >
          <option value="Todos">Todos os tipos</option>
          {TIPOS_PARCEIRO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
        >
          <option value="Todos">Todos os estados</option>
          {estadosDisponiveis.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <select
          value={filtroCidade}
          onChange={(e) => setFiltroCidade(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
        >
          <option value="Todas">Todas as cidades</option>
          {cidadesDisponiveis.map((cidade) => (
            <option key={cidade} value={cidade}>
              {cidade}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'instalador' : 'instaladores'}
          </p>
          {(filtroCidade !== 'Todas' || filtroEstado !== 'Todos' || filtroTipo !== 'Todos' || query) && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setFiltroTipo('Todos')
                setFiltroCidade('Todas')
                setFiltroEstado('Todos')
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500 text-sm">
            Nenhum instalador encontrado com esses filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cidade / UF</th>
                  <th className="px-4 py-3">Atende</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3 w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const statusClass = STATUS_STYLE[p.status] || STATUS_STYLE['A Contatar']
                  const cities = p.regioesAtendimento || []
                  return (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{p.nome}</span>
                          {p.origem === 'formulario' && (
                            <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                              Formulário
                            </span>
                          )}
                        </div>
                        {p.cpfCnpj ? (
                          <p className="text-[11px] text-slate-400 mt-0.5">{p.cpfCnpj}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.tipo}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.cidade || '—'}
                        {p.estado ? `/${p.estado}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {cities.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            cities.slice(0, 3).map((cidade) => (
                              <span
                                key={cidade}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                              >
                                <MapPin className="w-3 h-3" />
                                {cidade}
                              </span>
                            ))
                          )}
                          {cities.length > 3 && (
                            <span className="text-[11px] text-slate-500">+{cities.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex text-[11px] font-semibold px-2 py-1 rounded-full ring-1 ${statusClass}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {p.whatsApp ? formatPhoneNumber(p.whatsApp) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openWhatsAppChat(p)}
                            className="p-2 rounded-lg text-[#25D366] hover:bg-emerald-50"
                            title="Abrir WhatsApp"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => shareContactWhatsApp(p)}
                            className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50"
                            title="Encaminhar contato"
                            aria-label="Encaminhar contato"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(p.id, p.nome)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Editar parceiro' : 'Novo parceiro'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              <Field label="Nome *">
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="field"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoParceiro })}
                    className="field"
                  >
                    {TIPOS_PARCEIRO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusParceiro })}
                    className="field"
                  >
                    {STATUS_PARCEIRO_LIST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="CPF ou CNPJ">
                <input
                  value={form.cpfCnpj}
                  onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
                  className="field"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="WhatsApp">
                  <input
                    value={form.whatsApp}
                    onChange={(e) => setForm({ ...form, whatsApp: e.target.value })}
                    className="field"
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="field"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="field"
                  />
                </Field>
                <Field label="Site">
                  <input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="field"
                  />
                </Field>
              </div>
              <Field label="Endereço">
                <input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="field"
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Cidade base">
                    <input
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      className="field"
                    />
                  </Field>
                </div>
                <Field label="UF">
                  <input
                    maxLength={2}
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                    className="field uppercase"
                  />
                </Field>
              </div>
              <Field label="Cidades que atende (separadas por vírgula)">
                <textarea
                  rows={2}
                  value={form.regioesAtendimento}
                  onChange={(e) => setForm({ ...form, regioesAtendimento: e.target.value })}
                  placeholder="Ex: Campinas, Valinhos, Vinhedo"
                  className="field"
                />
              </Field>
              <Field label="Observações">
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="field"
                />
              </Field>
              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .field {
          width: 100%;
          min-height: 40px;
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #cbd5e1;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  )
}
