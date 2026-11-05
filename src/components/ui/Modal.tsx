import { useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)

    // Bloquear el scroll del body de fondo mientras la ventana modal está abierta
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Fondo translúcido con desenfoque sutil Liquid Glass */}
      <div
        className="fixed inset-0 bg-[#1D2924]/55 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor centrado con soporte para pantallas pequeñas y móviles */}
      <div className="relative min-h-full flex items-center justify-center p-2.5 sm:p-5">
        <div
          className={cn(
            'relative bg-surface rounded-[24px] shadow-[0_24px_60px_-12px_rgba(29,41,36,0.32)] border border-line w-full max-h-[90dvh] flex flex-col overflow-hidden animate-wellness-in my-auto',
            sizeClasses[size],
          )}
        >
          {/* Cabecera fija (shrink-0 evita que se comprima o corte) */}
          <div className="liquid-glass shrink-0 flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line z-10">
            <div className="min-w-0 flex-1">
              <h2
                id="modal-title"
                className="font-extrabold text-content text-sm sm:text-lg tracking-tight leading-snug break-words"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 font-medium leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="shrink-0 p-2 text-muted hover:text-content hover:bg-canvas rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo con scroll interno independiente (min-h-0 es clave en Flexbox) */}
          <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 sm:px-6 py-4 sm:py-5 bg-surface">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
