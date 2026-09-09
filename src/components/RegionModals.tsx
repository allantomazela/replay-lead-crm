import { useState, useEffect } from 'react'
import { Pencil, Trash2, AlertTriangle, X, Check } from 'lucide-react'
import { RegiaoSalva } from '@/types/crm'

interface RenameRegionModalProps {
  isOpen: boolean
  regiao: RegiaoSalva | null
  onClose: () => void
  onConfirm: (id: string, newNome: string) => void
}

export function RenameRegionModal({ isOpen, regiao, onClose, onConfirm }: RenameRegionModalProps) {
  const [nome, setNome] = useState('')

  useEffect(() => {
    if (regiao) {
      setNome(regiao.nome)
    }
  }, [regiao, isOpen])

  if (!isOpen || !regiao) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    onConfirm(regiao.id, nome.trim())
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Renomear Região</h3>
              <p className="text-xs text-slate-500">Altere o nome descritivo deste favorito</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Novo Nome *</label>
            <input
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-violet-400/20 text-sm text-slate-900"
            />
            <p className="text-[11px] text-slate-400">
              Cidade associada: {regiao.cidade}
              {regiao.estado ? `/${regiao.estado}` : ''} • {regiao.modalidade}
            </p>
          </div>

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
              className="min-h-[38px] px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-900/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeleteRegionModalProps {
  isOpen: boolean
  regiao: RegiaoSalva | null
  onClose: () => void
  onConfirm: (id: string) => void
}

export function DeleteRegionModal({ isOpen, regiao, onClose, onConfirm }: DeleteRegionModalProps) {
  if (!isOpen || !regiao) return null

  const handleConfirm = () => {
    onConfirm(regiao.id)
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-rose-950 text-sm">Excluir Região Salva</h3>
              <p className="text-xs text-rose-600">Confirmação de exclusão</p>
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

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Tem certeza que deseja excluir o favorito de busca{' '}
            <strong className="text-slate-900 font-semibold">&quot;{regiao.nome}&quot;</strong> (
            {regiao.cidade}/{regiao.estado})? As arenas já salvas no seu Pipeline de Vendas não
            serão afetadas.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-[38px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-900/20 flex items-center gap-1.5 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Região</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
