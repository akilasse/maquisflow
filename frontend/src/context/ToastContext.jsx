// ============================================================
// TOAST CONTEXT - Notifications popup centrées globales
// Usage : const { showToast } = useToast()
//         showToast('succes' | 'erreur' | 'info', 'Message...')
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const ToastContext = createContext(null)

const COULEURS = {
  succes: { bg: '#16a34a', icone: '✅' },
  erreur: { bg: '#dc2626', icone: '❌' },
  info:   { bg: '#2563eb', icone: 'ℹ️'  },
}

const ToastPopup = ({ toast, onClose }) => {
  const { bg, icone } = COULEURS[toast.type] || COULEURS.info
  const barRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    // animation barre de progression
    if (barRef.current) {
      barRef.current.style.transition = 'width 3.5s linear'
      barRef.current.style.width = '0%'
    }
    return () => clearTimeout(timer)
  }, [toast.id])

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          backgroundColor: bg,
          color: 'white',
          borderRadius: '16px',
          padding: '22px 32px',
          minWidth: '300px', maxWidth: '460px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          animation: 'toastIn 0.25s ease',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px', lineHeight: 1 }}>{icone}</span>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', lineHeight: 1.4 }}>
            {toast.texte}
          </p>
        </div>
        {/* barre de progression */}
        <div style={{ marginTop: '14px', height: '3px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
          <div ref={barRef} style={{ height: '100%', width: '100%', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '2px' }} />
        </div>
      </div>
    </>
  )
}

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((type, texte) => {
    setToast({ type, texte, id: Date.now() })
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastPopup toast={toast} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
