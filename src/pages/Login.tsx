import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth'
import { BrandMark } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message || 'Falha ao entrar')
        return
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin + '/',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login com Google')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1a2278_0%,_#03045e_45%,_#020330_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-black/25 p-8 space-y-6 border border-white/40">
        <div className="space-y-5">
          <BrandMark
            layout="vertical"
            theme="light"
            size="xl"
            subtitle="Plataforma comercial Replay Sports"
          />
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-slate-900">Entrar na sua conta</h1>
            <p className="text-sm text-slate-500">Acesse o CRM para continuar a prospecção</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          Continuar com Google
        </Button>

        <p className="text-center text-sm text-slate-600">
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-violet-700 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
