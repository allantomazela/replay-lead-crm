import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import {
  Menu,
  RotateCcw,
  Compass,
  Kanban,
  BarChart3,
  MessageSquareText,
  Wrench,
  Users,
} from 'lucide-react'
import { resetToSeedData } from '@/services/storage'
import { resetTemplatesToDefault } from '@/services/templates'
import { useToast } from '@/hooks/use-toast'

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { toast } = useToast()

  const getPageInfo = () => {
    if (location.pathname === '/pipeline') {
      return {
        title: 'Pipeline de Vendas',
        subtitle: 'Gestão de funil de vendas e ações rápidas via WhatsApp',
        icon: Kanban,
      }
    }
    if (location.pathname === '/metricas') {
      return {
        title: 'Dashboard de Métricas',
        subtitle: 'KPIs, taxa de conversão, funil por estágio e praças mais ativas',
        icon: BarChart3,
      }
    }
    if (location.pathname === '/mensagens') {
      return {
        title: 'Modelos de Mensagem',
        subtitle: 'Personalize os modelos de WhatsApp e E-mail com variáveis dinâmicas',
        icon: MessageSquareText,
      }
    }
    if (location.pathname === '/parceiros/cadastro') {
      return {
        title: 'Cadastro de Parceiros',
        subtitle: 'Instaladores salvos, status e regiões de atendimento',
        icon: Users,
      }
    }
    if (location.pathname.startsWith('/parceiros')) {
      return {
        title: 'Prospecção de Parceiros',
        subtitle: 'Localize CFTV, eletricistas e segurança via OpenStreetMap (gratuito)',
        icon: Wrench,
      }
    }
    return {
      title: 'Prospecção de Arenas',
      subtitle: 'Descubra arenas esportivas pelo OpenStreetMap ou importe via CSV',
      icon: Compass,
    }
  }

  const pageInfo = getPageInfo()
  const Icon = pageInfo.icon

  const handleResetData = async () => {
    if (
      window.confirm(
        'Deseja restaurar apenas os modelos de mensagem padrão? Os leads no Neon não serão apagados.',
      )
    ) {
      await resetTemplatesToDefault()
      await resetToSeedData()
      toast({
        title: 'Modelos restaurados!',
        description: 'Os modelos de mensagem padrão foram restaurados com sucesso.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col md:flex-row antialiased">
      {/* Sidebar (Desktop 260px fixed, mobile slide-in) */}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Main Content Area: offset by 260px on desktop */}
      <div className="flex-1 flex flex-col md:pl-[260px] min-w-0">
        {/* Top bar header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Abrir navegação"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 hidden sm:flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-extrabold text-[#0F172A] tracking-tight leading-tight truncate">
                {pageInfo.title}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block truncate">{pageInfo.subtitle}</p>
            </div>
          </div>

          {/* Top bar right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetData}
              title="Restaurar dados de exemplo"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Restaurar Exemplo</span>
            </button>
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CRM Conectado</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 p-4 md:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
