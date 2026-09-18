import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, MapPin, Wrench } from 'lucide-react'
import { TIPOS_PARCEIRO, TipoParceiro } from '@/types/parceiros'
import {
  enviarInscricaoParceiroPublica,
  validarConviteParceiro,
} from '@/services/parceirosStorage'
import { ApiError } from '@/lib/api'

export default function InscricaoParceiroPublica() {
  const { codigo = '' } = useParams()
  const [checking, setChecking] = useState(true)
  const [invalid, setInvalid] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Validando convite...
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Convite inválido</h1>
          <p className="text-sm text-slate-600">{invalid}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Cadastro enviado!</h1>
          <p className="text-sm text-slate-600">
            Recebemos seus dados. Em breve o time entrará em contato pelo WhatsApp informado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center text-white mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
            <Wrench className="w-6 h-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Cadastro de Parceiro Instalador</h1>
          <p className="text-sm text-slate-300">
            Preencha os dados para se candidatar à parceria. Não é necessário criar login.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4"
        >
          <Field label="Nome completo *">
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="field"
              placeholder="Seu nome ou razão social"
            />
          </Field>

          <Field label="CPF ou CNPJ *">
            <input
              required
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              className="field"
              placeholder="Somente números"
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
            <Field label="WhatsApp *">
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

          <Field label="Cidades de suporte e instalação *">
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
              Separe as cidades por vírgula
            </p>
          </Field>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Enviando...' : 'Enviar cadastro'}
          </button>
        </form>
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
