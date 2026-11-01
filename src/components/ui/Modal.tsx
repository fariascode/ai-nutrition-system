import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  title: string
  subtitle?: string
  size?: 'md' | 'lg' | 'xl' | '2xl' | '4xl'
  onClose: () => void
  children: React.ReactNode
}

const sizeClasses = {
  md:    'max-w-md',
  lg:    'max-w-lg',
  xl:    'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
}

export default function Modal({ open, title, subtitle, size = 'lg', onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Fondo translúcido con desenfoque sutil Liquid Glass */}
      <div
        className="absolute inset-0 bg-[#1D2924]/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-white rounded-[24px] shadow-[0_24px_60px_-12px_rgba(29,41,36,0.22)] border border-[#E7ECE6] w-full max-h-[92vh] flex flex-col overflow-hidden animate-wellness-in',
          sizeClasses[size],
        )}
      >
        <div className="liquid-glass flex items-center justify-between px-6 py-4 border-b border-[#E7ECE6] sticky top-0 z-10">
          <div>
            <h2 id="modal-title" className="font-extrabold text-[#1D2924] text-base sm:text-lg tracking-tight">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-[#76847B] mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-2 text-[#76847B] hover:text-[#1D2924] hover:bg-[#F7F8F4] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 bg-white">
          {children}
        </div>
      </div>
    </div>
  )
}
