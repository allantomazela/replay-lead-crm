import { useState, useEffect } from 'react'
import { Bookmark, Sparkles, X, Check } from 'lucide-react'

interface SaveRegionModalProps {
  isOpen: boolean
  cidade: string
  estado: string
  modalidade: string
  onClose: () => void
  onSave: (nome: string) => void
}

export function SaveRegionModal({
  isOpen,
  cidade,
  estado,
  modalidade,
  onClose,
  onSave,
}: SaveRegionModalProps) {
  const [nome, setNome] = useState('')

  // Compute default suggested name whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const parts: string[] = []
      if (cidade.trim()) {
        const place = estado.trim() ? `${cidade.trim()} - ${estado.trim()}` : cidade.trim()
        parts.push(place)
      }
      if (modalidade && modalidade !== 'Todos') {
        parts.push(modalidade)
      } else {
        parts.push('Todas as Modalidades')
      }
      setNome(parts.join(' - ') || 'Minha Região')
    }
  }, [isOpen, cidade, estado, modalidade])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    onSave(nome.trim())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 fill-violet-700/20" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Salvar Região de Busca</h3>
              <p className="text-xs text-slate-500">
                Guarde este filtro para reexecutar com 1 clique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-100 text-xs text-violet-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Configuração dos Filtros:</span>
            </div>
            <div className="text-slate-600 pl-5">
              <span className="font-medium text-slate-900">{cidade || '—'}</span>
              {estado ? ` (${estado})` : ''} •{' '}
              <span className="font-medium text-slate-900">{modalidade}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Nome da Região Salva *</label>
            <input
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: São Paulo - Beach Tennis"
              className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#03045e] focus:ring-2 focus:ring-violet-400/20 text-sm text-slate-900"
            />
            <p className="text-[11px] text-slate-400">
              Você pode renomear a qualquer momento no painel de regiões salvas.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nome.trim()}
              className="min-h-[38px] px-5 rounded-xl bg-[#03045e] hover:bg-[#020347] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Região</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
