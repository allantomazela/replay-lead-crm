import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { authClient } from '@/lib/auth'

type SessionUser = {
  id?: string
  email?: string | null
  name?: string | null
}

function useAuthGate() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const result = await Promise.race([
          authClient.getSession(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
        ])

        if (!active) return

        const nextUser = result && typeof result === 'object' && 'data' in result
          ? ((result as { data?: { user?: SessionUser | null } }).data?.user ?? null)
          : null
        setUser(nextUser)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return { user, isLoading }
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuthGate()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600">
        Carregando sessão...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuthGate()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600">
        Carregando...
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
