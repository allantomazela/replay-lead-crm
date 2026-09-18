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
import { formatPhoneNumber } from '@/lib/format'

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
            Cadastre parceiros ou envie o formulário público para o candidato preencher sem login.
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
          O candidato abre o link, preenche e o cadastro entra automaticamente na sua lista (origem:
          formulário).
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">CPF/CNPJ</th>
                <th className="px-4 py-3">Regiões</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.nome}
                    {p.origem === 'formulario' && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                        Formulário
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.tipo}</td>
                  <td className="px-4 py-3 text-slate-600">{p.cpfCnpj || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(p.regioesAtendimento || []).length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        (p.regioesAtendimento || []).map((cidade) => (
                          <span
                            key={cidade}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                          >
                            <MapPin className="w-3 h-3" />
                            {cidade}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.status}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.whatsApp ? formatPhoneNumber(p.whatsApp) : p.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Nenhum parceiro cadastrado ainda. Use a prospecção, o formulário público ou
                    cadastre manualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
