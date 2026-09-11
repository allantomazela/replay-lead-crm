import { Navigate, Outlet } from 'react-router-dom'
import { authClient } from '@/lib/auth'

export function ProtectedRoute() {
  const session = authClient.useSession()

  if (session.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600">
        Carregando sessão...
      </div>
    )
  }

  if (!session.data?.user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const session = authClient.useSession()

  if (session.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600">
        Carregando...
      </div>
    )
  }

  if (session.data?.user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
