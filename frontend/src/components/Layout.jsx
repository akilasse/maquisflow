import { useState } from 'react'
import Navbar from './Navbar'

const Layout = ({ children }) => {
  const [menuOuvert, setMenuOuvert] = useState(false)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>

      {/* Overlay mobile */}
      {menuOuvert && (
        <div
          onClick={() => setMenuOuvert(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'block'
          }}
        />
      )}

      <Navbar menuOuvert={menuOuvert} setMenuOuvert={setMenuOuvert} />

      {/* Bouton hamburger mobile */}
      <button
        onClick={() => setMenuOuvert(!menuOuvert)}
        style={{
          position: 'fixed', top: '12px', left: '12px',
          zIndex: 200,
          backgroundColor: '#FF6B35',
          border: 'none', borderRadius: '8px',
          width: '40px', height: '40px',
          cursor: 'pointer', fontSize: '18px',
          color: 'white',
          display: 'none', // caché sur desktop
          alignItems: 'center', justifyContent: 'center'
        }}
        className="hamburger-btn"
      >
        {menuOuvert ? '✕' : '☰'}
      </button>

      <main
        className="main-content"
        style={{ marginLeft: '224px', padding: '16px' }}
      >
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn {
            display: flex !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 60px 12px 16px 12px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Layout