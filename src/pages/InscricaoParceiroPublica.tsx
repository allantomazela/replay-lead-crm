import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, MapPin, ShieldCheck } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { TIPOS_PARCEIRO, TipoParceiro } from '@/types/parceiros'
import {
  enviarInscricaoParceiroPublica,
  validarConviteParceiro,
} from '@/services/parceirosStorage'
import { ApiError } from '@/lib/api'
import {
  cpfCnpjErrorMessage,
  formatCepInput,
  formatCpfCnpjInput,
  lookupCep,
  onlyDigits,
} from '@/lib/brDocs'

export default function InscricaoParceiroPublica() {
  const { codigo = '' } = useParams()
  const [checking, setChecking] = useState(true)
  const [invalid, setInvalid] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [lookingCep, setLookingCep] = useState(false)

  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [cep, setCep] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [email, setEmail] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [telefone, setTelefone] = useState('')
  const [website, setWebsite] = useState('')
  const [cidades, setCidades] = useState('')
  const [tipo, setTipo] = useState<TipoParceiro>('Instalador de Câmeras / CFTV')

  useEffect(() => {
    let active = true
    void (async () => {
      if (!codigo.trim()) {
        setInvalid('Link incompleto. Peça um novo convite ao administrador.')
        setChecking(false)
        return
      }
      try {
        await validarConviteParceiro(codigo.trim())
        if (active) setInvalid(null)
      } catch (err) {
        if (active) {
          setInvalid(
            err instanceof ApiError
              ? err.message
              : 'Link de inscrição inválido ou desativado.',
          )
        }
      } finally {
        if (active) setChecking(false)
      }
    })()
    return () => {
      active = false
    }
  }, [codigo])

  async function handleCepBlur() {
    const digits = onlyDigits(cep)
    if (digits.length !== 8) return
    setLookingCep(true)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.cep
      return next
    })
    try {
      const result = await lookupCep(digits)
      setCep(formatCepInput(result.cep))
      setCidade(result.cidade)
      setEstado(result.estado)
    } catch (err) {
      setCidade('')
      setEstado('')
      setFieldErrors((prev) => ({
        ...prev,
        cep: err instanceof Error ? err.message : 'CEP inválido.',
      }))
    } finally {
      setLookingCep(false)
    }
  }

  function validateForm(): boolean {
    const next: Record<string, string> = {}
    if (!nome.trim()) next.nome = 'Informe o nome completo.'
    const docErr = cpfCnpjErrorMessage(cpfCnpj)
    if (docErr) next.cpfCnpj = docErr
    if (onlyDigits(cep).length !== 8) next.cep = 'Informe um CEP válido.'
    if (!cidade.trim()) next.cidade = 'Informe o CEP para preencher a cidade.'
    if (onlyDigits(whatsApp).length < 10) next.whatsApp = 'Informe um WhatsApp válido.'
    const regioes = cidades
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (regioes.length === 0) next.cidades = 'Informe ao menos uma cidade de atendimento.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateForm()) {
      setError('Revise os campos destacados antes de enviar.')
      return
    }
    setSaving(true)
    try {
      const regioesAtendimento = cidades
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
      await enviarInscricaoParceiroPublica({
        codigo: codigo.trim(),
        nome: nome.trim(),
        cpfCnpj,
        cep,
        cidade: cidade.trim(),
        estado: estado.trim(),
        whatsApp,
        telefone,
        email,
        website,
        regioesAtendimento,
        tipo,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o cadastro.')
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-20 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Validando convite...
        </div>
      </Shell>
    )
  }

  if (invalid) {
    return (
      <Shell>
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2 shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Convite inválido</h1>
          <p className="text-sm text-slate-600">{invalid}</p>
        </div>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-lg">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Cadastro enviado!</h1>
          <p className="text-sm text-slate-600">
            Recebemos seus dados. Em breve o time Replay Sports entrará em contato pelo WhatsApp
            informado.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="max-w-lg mx-auto space-y-5">
        <header className="rounded-2xl bg-white/95 backdrop-blur border border-white/60 shadow-xl shadow-black/20 overflow-hidden">
          <div className="bg-[radial-gradient(ellipse_at_top,_#1a2278_0%,_#03045e_55%,_#020330_100%)] px-5 py-6 text-center text-white">
            <div className="flex flex-col items-center gap-3">
              <BrandLogo size="lg" variant="dark" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200/90">
                  Replay Sports
                </p>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Cadastro de Parceiro Instalador
                </h1>
                <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Preencha todos os dados para se cadastrar como nosso parceiro. Não é necessário
                  criar cadastro.
                </p>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Seus dados são enviados com segurança para nossa equipe comercial
          </div>
        </header>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4"
        >
          <Field label="Nome completo *" error={fieldErrors.nome}>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="field"
              placeholder="Seu nome ou razão social"
            />
          </Field>

          <Field label="CPF ou CNPJ *" error={fieldErrors.cpfCnpj}>
            <input
              required
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(formatCpfCnpjInput(e.target.value))}
              onBlur={() => {
                const msg = cpfCnpjErrorMessage(cpfCnpj)
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  if (msg) next.cpfCnpj = msg
                  else delete next.cpfCnpj
                  return next
                })
              }}
              className="field"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              inputMode="numeric"
            />
          </Field>

          <Field label="Tipo de atuação *">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoParceiro)}
              className="field bg-white"
            >
              {TIPOS_PARCEIRO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CEP (residência) *" error={fieldErrors.cep}>
              <div className="relative">
                <input
                  required
                  value={cep}
                  onChange={(e) => setCep(formatCepInput(e.target.value))}
                  onBlur={() => void handleCepBlur()}
                  className="field"
                  placeholder="00000-000"
                  inputMode="numeric"
                />
                {lookingCep && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
              </div>
            </Field>
            <Field label="Cidade / UF *" error={fieldErrors.cidade}>
              <input
                readOnly
                value={cidade && estado ? `${cidade} / ${estado}` : ''}
                className="field bg-slate-50"
                placeholder="Preenchido pelo CEP"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="WhatsApp *" error={fieldErrors.whatsApp}>
              <input
                required
                value={whatsApp}
                onChange={(e) => setWhatsApp(e.target.value)}
                className="field"
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="field"
                placeholder="Opcional"
                inputMode="tel"
              />
            </Field>
          </div>

          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="Opcional"
            />
          </Field>

          <Field label="Site">
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="field"
              placeholder="https://... (opcional)"
            />
          </Field>

          <Field label="Cidades de suporte e instalação *" error={fieldErrors.cidades}>
            <textarea
              required
              rows={3}
              value={cidades}
              onChange={(e) => setCidades(e.target.value)}
              className="field"
              placeholder="Ex: Campinas, Valinhos, Vinhedo"
            />
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              Separe as cidades por vírgula (onde você atende)
            </p>
          </Field>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || lookingCep}
            className="w-full min-h-[48px] rounded-xl bg-[#03045e] hover:bg-[#020330] text-white font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Enviando...' : 'Enviar cadastro'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 pb-4">
          © {new Date().getFullYear()} Replay Sports · Parceiros Instaladores
        </p>
      </div>

      <style>{`
        .field {
          width: 100%;
          min-height: 44px;
          padding: 0.6rem 0.85rem;
          border-radius: 0.75rem;
          border: 1px solid #cbd5e1;
          font-size: 0.875rem;
        }
      `}</style>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1a2278_0%,_#03045e_40%,_#020330_100%)] py-8 px-4">
      {children}
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {children}
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
    </div>
  )
}
