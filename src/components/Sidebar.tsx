import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Compass,
  Kanban,
  BarChart3,
  MessageSquareText,
  Video,
  Menu,
  X,
  LogOut,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getArenas } from '@/services/storage'
import { authClient } from '@/lib/auth'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [stats, setStats] = useState({ total: 0, closed: 0 })

  useEffect(() => {
    const updateStats = async () => {
      try {
        const arenas = await getArenas()
        setStats({
          total: arenas.length,
          closed: arenas.filter((a) => a.status === 'Fechado / Cliente').length,
        })
      } catch {
        setStats({ total: 0, closed: 0 })
      }
    }
    void updateStats()
    const handler = () => {
      void updateStats()
    }
    window.addEventListener('arenalead:arenas-updated', handler)
    return () => window.removeEventListener('arenalead:arenas-updated', handler)
  }, [])

  const navItems = [
    {
      to: '/',
      label: 'Dashboard de Prospecção',
      icon: Compass,
      subtitle: 'Captura via OpenStreetMap & CSV',
    },
    {
      to: '/pipeline',
      label: 'Pipeline de Vendas',
      icon: Kanban,
      subtitle: 'Funil Kanban de 5 estágios',
    },
    {
      to: '/metricas',
      label: 'Métricas',
      icon: BarChart3,
      subtitle: 'KPIs, conversão e desempenho',
    },
    {
      to: '/mensagens',
      label: 'Mensagens',
      icon: MessageSquareText,
      subtitle: 'Modelos de WhatsApp e E-mail',
    },
  ]

  const content = (
    <div className="flex flex-col h-full bg-[#1E293B] text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#EC4899] flex items-center justify-center shadow-md shadow-violet-900/40">
            <Video className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">ReplayLead</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30">
                CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Gravação de Jogadas</p>
          </div>
        </div>

        {/* Close button on mobile */}
        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Target Segments pill */}
      <div className="px-5 pt-4 pb-2">
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Mercado Alvo</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Beach Tennis • Futebol Society • Vôlei de Areia
          </p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Módulos Principais
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive: active }) =>
                cn(
                  'group flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-150 relative text-left',
                  active
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-violet-900/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-white',
                )
              }
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 mt-0.5 shrink-0 transition-transform group-hover:scale-105',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-violet-300',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-tight">{item.label}</div>
                <div
                  className={cn(
                    'text-[11px] truncate mt-0.5',
                    isActive ? 'text-violet-200' : 'text-slate-400',
                  )}
                >
                  {item.subtitle}
                </div>
              </div>
            </NavLink>
          )
        })}

        {/* Quick Funnel Stats */}
        <div className="pt-6 px-3">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Visão Rápida</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Arenas</div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
              <div className="text-lg font-bold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats.closed}
              </div>
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">Clientes</div>
            </div>
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-700/80 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow">
              RL
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {session.data?.user?.name || 'Usuário'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {session.data?.user?.email || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await authClient.signOut()
              navigate('/login', { replace: true })
            }}
            title="Sair"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop fixed sidebar (260px) */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 fixed inset-y-0 left-0 z-30 border-r border-[#334155] bg-[#1E293B]">
        {content}
      </aside>

      {/* Mobile drawer with backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-2xl animate-fade-in z-10">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
