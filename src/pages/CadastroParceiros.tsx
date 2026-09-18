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
  Phone,
  Globe,
  Mail,
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [loadingInvite, setLoadingInvite] = useState(false)

  const load = useCallback(async () => {
    setParceiros(await getParceiros())
  }, [])

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
    const handler = () => void load()
    window.addEventListener('replaylead:parceiros-updated', handler)
    return () => window.removeEventListener('replaylead:parceiros-updated', handler)
  }, [load, loadInvite])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return parceiros.filter((p) => {
      if (filtroTipo !== 'Todos' && p.tipo !== filtroTipo) return false
      if (!q) return true
      return (
        p.nome.toLowerCase().includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        (p.cpfCnpj || '').includes(q) ||
        (p.regioesAtendimento || []).some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [parceiros, query, filtroTipo])

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
            onClick={openCreate}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo parceiro
          </button>
        </div>
      </div>

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

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, cidade, CPF/CNPJ ou região atendida..."
            className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white md:w-64"
        >
          <option value="Todos">Todos os tipos</option>
          {TIPOS_PARCEIRO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-slate-500 text-sm">
          Nenhum parceiro cadastrado ainda. Use a prospecção, o formulário público ou cadastre
          manualmente.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const statusClass = STATUS_STYLE[p.status] || STATUS_STYLE['A Contatar']
            const cities = p.regioesAtendimento || []
            return (
              <article
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                        {p.nome}
                      </h3>
                      {p.origem === 'formulario' && (
                        <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                          Formulário
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{p.tipo}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ring-1 ${statusClass}`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600">
                  {p.whatsApp ? (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-800">
                        {formatPhoneNumber(p.whatsApp)}
                      </span>
                    </p>
                  ) : null}
                  {p.email ? (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {p.email}
                    </p>
                  ) : null}
                  {p.website ? (
                    <p className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {p.website}
                    </p>
                  ) : null}
                  {p.cpfCnpj ? (
                    <p className="text-xs text-slate-500">CPF/CNPJ: {p.cpfCnpj}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cities.length === 0 ? (
                    <span className="text-xs text-slate-400">Sem cidades informadas</span>
                  ) : (
                    cities.slice(0, 6).map((cidade) => (
                      <span
                        key={cidade}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                      >
                        <MapPin className="w-3 h-3" />
                        {cidade}
                      </span>
                    ))
                  )}
                  {cities.length > 6 && (
                    <span className="text-[11px] text-slate-500 px-1 py-0.5">
                      +{cities.length - 6}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openWhatsAppChat(p)}
                    className="min-h-[40px] px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    title="Abrir conversa no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => shareContactWhatsApp(p)}
                    className="min-h-[40px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5"
                    title="Encaminhar este contato por WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                    Encaminhar contato
                  </button>
                  <div className="ml-auto flex items-center gap-1">
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
                </div>
              </article>
            )
          })}
        </div>
      )}

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
