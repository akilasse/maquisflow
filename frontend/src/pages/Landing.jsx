import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const SLIDES = [
  { url: 'https://images.pexels.com/photos/4921150/pexels-photo-4921150.jpeg?auto=compress&cs=tinysrgb&w=1600', label: 'Service en terrasse' },
  { url: 'https://ytfuibefejtkxfsdskvq.supabase.co/storage/v1/object/public/spots/6a3d0109-c714-47bd-ba56-30f5ef813a76/0.jpg', label: 'Mandjaro — Abidjan' },
  { url: 'https://images.pexels.com/photos/11777051/pexels-photo-11777051.jpeg?auto=compress&cs=tinysrgb&w=1600', label: 'Bar en plein air' },
  { url: 'https://images.pexels.com/photos/6123992/pexels-photo-6123992.jpeg?auto=compress&cs=tinysrgb&w=1600', label: 'Bar bord de mer' },
]

const C = {
  orange: '#FF6B35',
  dark:   '#1C1C2E',
  dark2:  '#16162A',
  gray:   '#F8FAFC',
  text:   '#64748b',
}

const ROLES = [
  {
    id: 'serveur',
    titre: 'Serveur',
    icon: '📲',
    desc: 'Prenez les commandes à table sur une tablette. Le bon est envoyé automatiquement au bar ou en cuisine — sans papier, sans erreur, sans délai.',
    points: [
      'Prise de commande rapide à table',
      'Envoi automatique au bar / cuisine',
      'Suivi des commandes en cours',
      'Interface simple, formation en 10 minutes',
    ],
  },
  {
    id: 'caissier',
    titre: 'Caissier',
    icon: '🖥️',
    desc: 'Une caisse rapide, simple et fiable. Enregistrez les ventes en quelques secondes, imprimez les tickets et gérez les différents modes de paiement sans erreur.',
    points: [
      'Interface tactile intuitive sur PC ou tablette',
      'Espèces, Wave, Orange Money, MTN MoMo',
      'Impression ticket automatique',
      'Fonctionne même sans internet',
    ],
  },
  {
    id: 'patron',
    titre: 'Patron / Gérant',
    icon: '📊',
    desc: 'Suivez vos ventes, encaissements et stocks en temps réel depuis votre téléphone, même à distance. Gardez le contrôle total de votre établissement 24h/24.',
    points: [
      'Dashboard live : ventes du jour, semaine, mois',
      'Suivi des encaissements par mode de paiement',
      'Alertes stock et rapports automatiques',
      'Historique complet des opérations',
    ],
  },
]

const MODULES = [
  { icon: '🖥️', nom: 'Caisse Professionnelle',    desc: 'Ventes rapides, tickets imprimés, historique complet',
    img: 'https://images.pexels.com/photos/3801429/pexels-photo-3801429.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { icon: '📲', nom: 'Commande Tablette Serveur',  desc: 'Bon transmis instantanément au bar ou en cuisine',
    img: 'https://images.pexels.com/photos/36799159/pexels-photo-36799159.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { icon: '📊', nom: 'Dashboard Patron',           desc: 'Chiffres en temps réel depuis votre téléphone',
    img: 'https://images.pexels.com/photos/106344/pexels-photo-106344.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { icon: '📦', nom: 'Gestion du Stock',           desc: 'Sorties automatiques à chaque vente, inventaires intégrés',
    img: 'https://images.pexels.com/photos/17541188/pexels-photo-17541188.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { icon: '💳', nom: 'Multi-Paiements',            desc: 'Wave, Orange Money, MTN MoMo, espèces, crédit — chaque mode de paiement est suivi séparément pour un contrôle précis de vos encaissements.',
    img: 'https://images.pexels.com/photos/6816381/pexels-photo-6816381.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { icon: '📋', nom: 'Historique & Rapports',      desc: 'Exports comptables, suivi des annulations',
    img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80' },
]

const Landing = () => {
  const [roleActif, setRoleActif] = useState('serveur')
  const role = ROLES.find(r => r.id === roleActif)
  const [slideIdx, setSlideIdx] = useState(0)
  const [demoTick, setDemoTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setDemoTick(0)
    const t = setInterval(() => setDemoTick(n => (n + 1) % 25), 650)
    return () => clearInterval(t)
  }, [roleActif])

  const S = {
    nav: {
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(28,28,46,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: 64,
    },
    logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
    logoMark: {
      width: 36, height: 36, borderRadius: 10, background: C.orange,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, color: 'white', fontSize: 18,
    },
    logoName: { color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' },
    navLinks: { display: 'flex', gap: 32, alignItems: 'center' },
    navLink: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500, textDecoration: 'none', cursor: 'pointer' },
    btnConnexion: {
      background: C.orange, color: 'white', padding: '9px 22px',
      borderRadius: 8, fontWeight: 700, fontSize: 14,
      textDecoration: 'none', display: 'inline-block',
    },
    hero: {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      padding: '100px 48px 80px', position: 'relative', overflow: 'hidden',
    },
    heroContent: { maxWidth: 680, position: 'relative', zIndex: 2 },
    heroBadge: {
      display: 'inline-block', background: 'rgba(255,107,53,0.15)',
      border: '1px solid rgba(255,107,53,0.4)', color: C.orange,
      padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      marginBottom: 24,
    },
    heroTitle: {
      fontSize: 54, fontWeight: 900, color: 'white', lineHeight: 1.1,
      letterSpacing: '-1.5px', marginBottom: 20,
    },
    heroSpan: { color: C.orange },
    heroSub: { fontSize: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 36 },
    btnCTA: {
      display: 'inline-flex', alignItems: 'center', gap: 10,
      background: '#25D366', color: 'white', padding: '14px 28px',
      borderRadius: 12, fontWeight: 700, fontSize: 16,
      textDecoration: 'none', boxShadow: '0 8px 30px rgba(37,211,102,0.35)',
    },
    btnSecondary: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'transparent', color: 'white',
      border: '1px solid rgba(255,255,255,0.25)', padding: '14px 28px',
      borderRadius: 12, fontWeight: 600, fontSize: 16,
      textDecoration: 'none', marginLeft: 16,
    },
    section: { padding: '80px 48px', maxWidth: 1100, margin: '0 auto' },
    sectionBadge: {
      display: 'inline-block', background: 'rgba(255,107,53,0.1)',
      color: C.orange, padding: '6px 16px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '1px', marginBottom: 16,
    },
    sectionTitle: { fontSize: 36, fontWeight: 800, color: C.dark, letterSpacing: '-0.8px', marginBottom: 12 },
    sectionSub: { fontSize: 17, color: C.text, maxWidth: 540 },
    roleTabs: { display: 'flex', gap: 8, marginBottom: 40, background: '#f1f5f9', padding: 6, borderRadius: 14, width: 'fit-content' },
    roleTab: (active) => ({
      padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14,
      cursor: 'pointer', border: 'none',
      background: active ? 'white' : 'transparent',
      color: active ? C.dark : C.text,
      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s',
    }),
    roleContent: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
    },
    roleLeft: {},
    roleIcon: { fontSize: 40, marginBottom: 16 },
    roleTitre: { fontSize: 28, fontWeight: 800, color: C.dark, marginBottom: 12 },
    roleDesc: { fontSize: 16, color: C.text, lineHeight: 1.7, marginBottom: 24 },
    rolePoints: { listStyle: 'none', padding: 0, margin: 0 },
    rolePoint: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, fontSize: 15, color: '#374151' },
    roleCheck: { color: C.orange, fontWeight: 700, marginTop: 1 },
    videoBox: {
      background: C.dark, borderRadius: 20, minHeight: 420,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.1)', gap: 12,
    },
    playBtn: {
      width: 64, height: 64, borderRadius: '50%',
      background: 'rgba(255,107,53,0.2)', border: '2px solid rgba(255,107,53,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 24,
    },
    videoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
    modulesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 },
    moduleCard: {
      background: 'white', borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e2e8f0', transition: 'transform 0.2s, box-shadow 0.2s',
    },
    moduleImg: { width: '100%', height: 148, objectFit: 'cover', display: 'block' },
    moduleCardBody: { padding: '20px 22px' },
    moduleIcon: { fontSize: 26, marginBottom: 10 },
    moduleNom: { fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6 },
    moduleDesc: { fontSize: 13, color: C.text, lineHeight: 1.6 },
    tarifSection: {
      background: C.dark, padding: '80px 48px',
    },
    tarifCard: {
      maxWidth: 520, margin: '0 auto', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,107,53,0.3)', borderRadius: 24, padding: '48px 40px',
      textAlign: 'center',
    },
    tarifNom: { fontSize: 14, color: C.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 },
    tarifPrix: { fontSize: 52, fontWeight: 900, color: 'white', marginBottom: 4 },
    tarifUnit: { fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
    tarifInstall: {
      background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)',
      borderRadius: 10, padding: '12px 20px', marginBottom: 32,
      fontSize: 14, color: 'rgba(255,255,255,0.7)',
    },
    tarifFeatures: { listStyle: 'none', padding: 0, margin: '0 0 36px', textAlign: 'left' },
    tarifFeature: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 15, color: 'rgba(255,255,255,0.8)' },
    footer: {
      background: '#0f172a', padding: '48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    },
    footerBrand: { color: 'white', fontWeight: 800, fontSize: 18 },
    footerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
    footerContact: { textAlign: 'right' },
    footerLink: { color: C.orange, textDecoration: 'none', fontWeight: 600, fontSize: 15 },
  }

  const renderDemo = () => {
    const tick = demoTick
    const phase = tick < 6 ? 0 : tick < 12 ? 1 : tick < 18 ? 2 : 3
    const pt   = phase === 0 ? tick : phase === 1 ? tick - 6 : phase === 2 ? tick - 12 : tick - 18

    const hiMap = {
      patron:   [phase <= 1, phase === 0, phase === 2, phase === 3],
      caissier: [phase === 0, phase <= 1, phase === 2, phase === 2],
      serveur:  [phase === 0, phase === 1, phase === 2, phase >= 2],
    }
    const hi = hiMap[roleActif] || role.points.map(() => true)

    const FeatureList = () => (
      <div style={{ flex: 1, paddingLeft: 4 }}>
        {role.points.map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, opacity: hi[i] ? 1 : 0.25, transition: 'opacity 0.6s ease' }}>
            <span style={{ color: hi[i] ? C.orange : 'rgba(255,255,255,0.2)', fontWeight: 800, fontSize: 15, marginTop: 1, flexShrink: 0, transition: 'color 0.6s' }}>✓</span>
            <span style={{ fontSize: 13, lineHeight: 1.6, fontWeight: hi[i] ? 600 : 400, color: hi[i] ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)', transition: 'all 0.6s' }}>{text}</span>
          </div>
        ))}
      </div>
    )

    // ── PATRON ──────────────────────────────────────────────────────────────
    if (roleActif === 'patron') {
      const navItems = [
        { icon: '📊', active: phase <= 1, badge: null },
        { icon: '📦', active: phase === 2, badge: phase >= 2 ? 2 : null },
        { icon: '💳', active: false },
        { icon: '📋', active: phase === 3 },
      ]

      const renderContent = () => {
        if (phase === 0) {
          const animV = Math.min(pt * 8000, 47500)
          const pays6 = [
            { label: 'Espèces', val: 18000, color: '#16A34A' },
            { label: 'Wave',    val: 12000, color: '#2563EB' },
            { label: 'Orange',  val:  8500, color: '#F97316' },
            { label: 'MTN',     val:  6000, color: '#FFCC00', dark: true },
            { label: 'Crédit',  val:  6000, color: '#7C3AED' },
            { label: 'Mobile',  val:  2500, color: '#06B6D4' },
          ]
          return (
            <>
              <div style={{ display: 'flex', gap: 3, marginBottom: 7 }}>
                {["Aujourd'hui", 'Semaine', 'Mois'].map((t, i) => (
                  <div key={t} style={{ fontSize: 6, padding: '2px 5px', borderRadius: 4, background: i === 0 ? C.orange : 'rgba(255,255,255,0.07)', color: i === 0 ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: i === 0 ? 700 : 400 }}>{t}</div>
                ))}
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginBottom: 1 }}>Ventes du jour</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{animV.toLocaleString('fr-FR')}</div>
              <div style={{ fontSize: 7, color: C.orange, marginBottom: 7, fontWeight: 600 }}>FCFA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                {pays6.map((p, idx) => (
                  <div key={p.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '4px 6px', borderLeft: `2px solid ${p.color}`, opacity: pt > idx ? 1 : 0.12, transition: 'opacity 0.4s' }}>
                    <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>{p.label}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: p.dark ? p.color : 'white' }}>{pt > idx ? p.val.toLocaleString('fr-FR') : '—'}<span style={{ fontSize: 5 }}> F</span></div>
                  </div>
                ))}
              </div>
            </>
          )
        }
        if (phase === 1) {
          const bars = [40, 65, 55, 80, 70, 100, 75]
          return (
            <>
              <div style={{ display: 'flex', gap: 3, marginBottom: 7 }}>
                {["Aujourd'hui", 'Semaine', 'Mois'].map((t, i) => (
                  <div key={t} style={{ fontSize: 6, padding: '2px 5px', borderRadius: 4, background: i === 1 ? C.orange : 'rgba(255,255,255,0.07)', color: i === 1 ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: i === 1 ? 700 : 400 }}>{t}</div>
                ))}
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginBottom: 1 }}>Ventes de la semaine</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: 'white', lineHeight: 1 }}>285 000</div>
              <div style={{ fontSize: 7, color: C.orange, marginBottom: 8, fontWeight: 600 }}>FCFA</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
                {bars.map((h, i) => (
                  <div key={i} style={{ flex: 1, height: pt > i ? `${h}%` : '4%', background: i === 6 ? C.orange : 'rgba(255,107,53,0.45)', borderRadius: '2px 2px 0 0', transition: `height 0.45s ease ${i * 0.07}s` }} />
                ))}
              </div>
              <div style={{ display: 'flex', marginTop: 2 }}>
                {['L','M','M','J','V','S','D'].map(d => (
                  <span key={d} style={{ flex: 1, fontSize: 5, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{d}</span>
                ))}
              </div>
            </>
          )
        }
        if (phase === 2) {
          const alerts = [
            { nom: 'Heineken 65cl',   qte: 0, color: '#EF4444', label: 'Rupture' },
            { nom: 'Bière Flag 33cl', qte: 3, color: '#F97316', label: '3 restants' },
            { nom: 'Coca-Cola',       qte: 5, color: '#F97316', label: '5 restants' },
          ]
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <span style={{ fontSize: 9 }}>⚠️</span>
                <span style={{ fontSize: 8, color: '#EF4444', fontWeight: 700 }}>Alertes stock</span>
              </div>
              {alerts.map((a, i) => (
                <div key={a.nom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', opacity: pt > i * 1.5 ? 1 : 0, transition: 'opacity 0.4s', animation: pt > i * 1.5 ? 'popIn 0.3s ease' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'white', fontWeight: 600 }}>{a.nom}</div>
                    <div style={{ fontSize: 7, color: a.color }}>{a.label}</div>
                  </div>
                  <div style={{ background: a.color, borderRadius: 4, padding: '2px 6px', fontSize: 8, color: 'white', fontWeight: 800, minWidth: 18, textAlign: 'center' }}>{a.qte}</div>
                </div>
              ))}
            </>
          )
        }
        if (phase === 3) {
          const txs = [
            { desc: 'Bière Flag ×2', total: '4 000 F', heure: '14:32' },
            { desc: 'Heineken ×1',   total: '2 500 F', heure: '14:28' },
            { desc: 'Coca-Cola ×3',  total: '4 500 F', heure: '14:15' },
            { desc: 'Pression ×2',   total: '6 000 F', heure: '14:01' },
          ]
          return (
            <>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 7, fontWeight: 600 }}>📋 Historique du jour</div>
              {txs.map((tx, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: pt > i * 1.5 ? 1 : 0, transition: 'opacity 0.4s' }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'white' }}>{tx.desc}</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>{tx.heure}</div>
                  </div>
                  <div style={{ fontSize: 9, color: C.orange, fontWeight: 700 }}>{tx.total}</div>
                </div>
              ))}
            </>
          )
        }
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '16px 20px', gap: 20, boxSizing: 'border-box' }}>
          <FeatureList />
          <div style={{ flexShrink: 0, width: 215, background: '#272744', borderRadius: 26, border: '5px solid #232342', boxShadow: '0 20px 56px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ background: C.dark2, padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.orange, fontSize: 11, fontWeight: 800 }}>Flowix</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>Maquis Koné</span>
            </div>
            <div style={{ padding: '10px 14px 8px', minHeight: 150, background: '#272744' }}>{renderContent()}</div>
            <div style={{ background: C.dark2, padding: '8px 14px', display: 'flex', justifyContent: 'space-around' }}>
              {navItems.map((nav, i) => (
                <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, opacity: nav.active ? 1 : 0.38 }}>{nav.icon}</span>
                  {nav.badge && (
                    <span style={{ position: 'absolute', top: -2, right: -5, background: '#EF4444', borderRadius: '50%', width: 9, height: 9, fontSize: 6, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, animation: 'popIn 0.3s ease' }}>{nav.badge}</span>
                  )}
                  {nav.active && <div style={{ width: 3, height: 3, borderRadius: '50%', background: C.orange, marginTop: 2 }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // ── CAISSIER ─────────────────────────────────────────────────────────────
    if (roleActif === 'caissier') {
      const PRODUITS = [
        { nom: 'Bière Flag', prix: 2000, color: '#F59E0B' },
        { nom: 'Heineken',   prix: 2500, color: '#16A34A' },
        { nom: 'Coca-Cola',  prix: 1500, color: '#DC2626' },
        { nom: 'Fanta',      prix: 1000, color: '#F97316' },
      ]
      const allCart = [
        { nom: 'Bière Flag', qte: 2, prix: 4000 },
        { nom: 'Coca-Cola',  qte: 1, prix: 1500 },
        { nom: 'Heineken',   qte: 1, prix: 2500 },
      ]
      const visible = phase === 0 ? [] : allCart.slice(0, phase === 1 ? Math.min(Math.ceil(pt / 2) + 1, 3) : 3)
      const total = visible.reduce((s, it) => s + it.prix, 0)
      const waveSelected = phase === 2 && pt >= 3
      const confirmed    = phase === 3

      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '16px 20px', gap: 20, boxSizing: 'border-box' }}>
          <FeatureList />
          <div style={{ flexShrink: 0, width: 192, background: '#272744', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ background: C.orange, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 10 }}>🖥️ Caisse</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9 }}>Fatou · 14:32</span>
            </div>
            <div style={{ display: 'flex', height: 162, background: '#272744' }}>
              <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.07)', padding: '6px' }}>
                <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase' }}>Catalogue</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  {PRODUITS.map(p => (
                    <div key={p.nom} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 5, padding: '5px 5px', borderTop: `2px solid ${p.color}` }}>
                      <div style={{ fontSize: 7, color: 'white', fontWeight: 600 }}>{p.nom}</div>
                      <div style={{ fontSize: 7, color: p.color, fontWeight: 700 }}>{p.prix.toLocaleString('fr-FR')} F</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ width: 80, padding: '6px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase' }}>Commande</div>
                <div style={{ flex: 1 }}>
                  {visible.map(it => (
                    <div key={it.nom} style={{ fontSize: 7, color: 'rgba(255,255,255,0.8)', marginBottom: 3, display: 'flex', justifyContent: 'space-between', animation: 'popIn 0.3s ease' }}>
                      <span>{it.nom} ×{it.qte}</span>
                      <span style={{ color: C.orange }}>{(it.prix/1000).toFixed(1)}k</span>
                    </div>
                  ))}
                  {visible.length === 0 && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', paddingTop: 4 }}>Vide</div>}
                </div>
                {total > 0 && (
                  <div style={{ background: 'rgba(255,107,53,0.15)', borderRadius: 5, padding: '4px', textAlign: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.4)' }}>TOTAL</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'white', lineHeight: 1 }}>{(total/1000).toFixed(1)}k<span style={{ fontSize: 6, color: C.orange }}> F</span></div>
                  </div>
                )}
                {phase >= 2 && !confirmed && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, animation: 'popIn 0.3s ease' }}>
                    {[['Esp.','#16A34A'],['Wave','#2563EB'],['OM','#F97316'],['MTN','#FFCC00']].map(([lbl,bg]) => (
                      <div key={lbl} style={{ background: waveSelected && lbl==='Wave' ? '#2563EB' : bg+'28', border: `1px solid ${bg}`, borderRadius: 4, padding: '3px 2px', textAlign: 'center', fontSize: 6, color: waveSelected && lbl==='Wave' ? 'white' : 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{lbl}</div>
                    ))}
                  </div>
                )}
                {confirmed && (
                  <div style={{ background: '#16A34A', borderRadius: 6, padding: '5px', textAlign: 'center', animation: 'popIn 0.3s ease' }}>
                    <div style={{ fontSize: 7, color: 'white', fontWeight: 700 }}>✓ Wave</div>
                    <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.8)' }}>Ticket 🖨️</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ── SERVEUR ──────────────────────────────────────────────────────────────
    if (roleActif === 'serveur') {
      const tables = [
        { num: 1, st: 'libre',   color: '#16A34A' }, { num: 2, st: 'occupée', color: '#F97316' },
        { num: 3, st: 'occupée', color: '#F97316' }, { num: 4, st: 'libre',   color: '#16A34A' },
        { num: 5, st: 'active',  color: C.orange  }, { num: 6, st: 'libre',   color: '#16A34A' },
      ]
      const allItems = [
        { nom: 'Bière Flag 33cl', qte: 2 },
        { nom: 'Fanta orange',   qte: 1 },
        { nom: 'Pression 50cl',  qte: 1 },
      ]
      const visible = phase <= 1 ? allItems.slice(0, phase === 0 ? 0 : Math.min(Math.ceil(pt / 2), 3)) : allItems
      const sent = phase >= 2

      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '16px 20px', gap: 20, boxSizing: 'border-box' }}>
          <FeatureList />
          {/* Tablet frame */}
          <div style={{ flexShrink: 0, width: 206, background: '#16162a', borderRadius: 18, border: '7px solid #1e1e36', boxShadow: '0 20px 56px rgba(0,0,0,0.65)', padding: '6px 5px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* Camera */}
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2e2e50', alignSelf: 'center' }} />
            {/* Screen */}
            <div style={{ width: '100%', background: '#272744', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: phase >= 1 ? C.orange : C.dark2, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.5s' }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 10 }}>{phase === 0 ? '📍 Sélection table' : '📍 Table 5 — Terrasse'}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9 }}>Koné</span>
            </div>
            <div style={{ padding: '8px 10px', minHeight: 130, background: '#272744' }}>
              {phase === 0 && (
                <>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Choisir une table</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                    {tables.map(t => (
                      <div key={t.num} style={{ background: t.st === 'active' ? C.orange : 'rgba(255,255,255,0.06)', borderRadius: 7, padding: '7px 4px', textAlign: 'center', border: `1px solid ${t.color}30` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: t.st === 'active' ? 'white' : t.color }}>{t.num}</div>
                        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)' }}>{t.st}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {phase >= 1 && (
                <>
                  {visible.length === 0 && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, paddingTop: 8 }}>Ajout articles...</div>}
                  {visible.map(it => (
                    <div key={it.nom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', animation: 'popIn 0.3s ease' }}>
                      <span style={{ fontSize: 10, color: 'white' }}>{it.nom}</span>
                      <span style={{ fontSize: 10, color: C.orange, fontWeight: 700, background: 'rgba(255,107,53,0.15)', borderRadius: 4, padding: '1px 6px' }}>×{it.qte}</span>
                    </div>
                  ))}
                  {!sent && visible.length > 0 && (
                    <div style={{ marginTop: 8, background: C.orange, borderRadius: 8, padding: '7px', textAlign: 'center', animation: 'pulse 1.4s infinite' }}>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: 10 }}>Envoyer au bar →</span>
                    </div>
                  )}
                  {sent && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ background: '#16A34A', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, animation: 'popIn 0.3s ease', marginBottom: 6 }}>
                        <span style={{ fontSize: 13 }}>✓</span>
                        <div>
                          <div style={{ color: 'white', fontWeight: 700, fontSize: 10 }}>Envoyé au bar</div>
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>Bon imprimé en cuisine</div>
                        </div>
                      </div>
                      {phase === 3 && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '5px 8px', fontSize: 8, color: 'rgba(255,255,255,0.6)', animation: 'popIn 0.3s ease' }}>
                          🔔 Suivi en cours · 3 articles
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            </div>{/* /screen */}
            {/* Home button */}
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #2e2e50', alignSelf: 'center' }} />
          </div>{/* /tablet frame */}
        </div>
      )
    }

    return null
  }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", margin: 0, padding: 0 }}>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.72; }
        }
      `}</style>

      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.logoRow}>
          <div style={S.logoMark}>F</div>
          <span style={S.logoName}>Flowix</span>
        </div>
        <div style={S.navLinks}>
          <span style={S.navLink} onClick={() => scrollTo('fonctionnalites')}>Fonctionnalités</span>
          <span style={S.navLink} onClick={() => scrollTo('roles')}>Par rôle</span>
          <span style={S.navLink} onClick={() => scrollTo('tarif')}>Tarif</span>
          <span style={S.navLink} onClick={() => scrollTo('contact')}>Contact</span>
          <Link to="/login" style={S.btnConnexion}>Connexion</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={S.hero}>
        {/* Slides background */}
        {SLIDES.map((slide, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${slide.url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === slideIdx ? 1 : 0,
            transition: 'opacity 1.4s ease',
          }} />
        ))}
        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(28,28,46,0.80) 0%, rgba(28,28,46,0.60) 60%, rgba(255,107,53,0.15) 100%)',
          pointerEvents: 'none', zIndex: 1,
        }} />
        {/* Slide dots */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 3 }}>
          {SLIDES.map((slide, i) => (
            <div key={i} onClick={() => setSlideIdx(i)} title={slide.label} style={{
              height: 8, width: i === slideIdx ? 28 : 8, borderRadius: 4,
              background: i === slideIdx ? C.orange : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.4s',
            }} />
          ))}
        </div>
        <div style={S.heroContent}>
          <h1 style={S.heroTitle}>
            Optimisez votre établissement<br />
            avec une gestion <span style={S.heroSpan}>intelligente</span>
          </h1>
          <p style={S.heroSub}>
            Flowix digitalise la gestion de votre bar, maquis ou restaurant — caisse, stock, commandes, dashboard patron — en une seule solution simple et fiable.
          </p>
          <div>
            <a
              href="https://wa.me/2250779127543?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20Flowix%20pour%20mon%20%C3%A9tablissement."
              target="_blank" rel="noreferrer"
              style={S.btnCTA}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.115 1.523 5.845L.057 23.854a.75.75 0 00.927.928l6.04-1.463A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.603-.498-5.112-1.371l-.367-.214-3.814.924.946-3.793-.232-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Nous contacter sur WhatsApp
            </a>
            <span
              style={S.btnSecondary}
              onClick={() => scrollTo('roles')}
            >
              Voir comment ça marche →
            </span>
          </div>
        </div>
      </section>

      {/* RÔLES */}
      <section id="roles" style={{ ...S.section, padding: '80px 48px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={S.sectionBadge}>Par rôle</div>
          <h2 style={S.sectionTitle}>Une solution pour toute votre équipe</h2>
          <p style={S.sectionSub}>Chaque membre de l'équipe a son interface adaptée à son rôle.</p>
        </div>

        <div style={S.roleTabs}>
          {ROLES.map(r => (
            <button key={r.id} style={S.roleTab(roleActif === r.id)} onClick={() => setRoleActif(r.id)}>
              {r.icon} {r.titre}
            </button>
          ))}
        </div>

        <div style={S.roleContent}>
          <div style={S.roleLeft}>
            <div style={S.roleIcon}>{role.icon}</div>
            <div style={S.roleTitre}>{role.titre}</div>
            <p style={S.roleDesc}>{role.desc}</p>
          </div>
          <div style={{ ...S.videoBox, justifyContent: 'center', alignItems: 'stretch', padding: 0, overflow: 'hidden' }}>
            {renderDemo()}
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section id="fonctionnalites" style={{ background: C.gray, padding: '80px 0' }}>
        <div style={S.section}>
          <div style={S.sectionBadge}>Modules inclus</div>
          <h2 style={S.sectionTitle}>Tout ce dont vous avez besoin</h2>
          <p style={S.sectionSub}>Un abonnement unique — tous les modules sont inclus, sans supplément.</p>
          <div style={S.modulesGrid}>
            {MODULES.map((m, i) => (
              <div key={i} style={S.moduleCard}>
                {m.img && <img src={m.img} alt={m.nom} style={S.moduleImg} />}
                <div style={S.moduleCardBody}>
                  <div style={S.moduleIcon}>{m.icon}</div>
                  <div style={S.moduleNom}>{m.nom}</div>
                  <div style={S.moduleDesc}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIF */}
      <section id="tarif" style={S.tarifSection}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ ...S.sectionBadge, background: 'rgba(255,107,53,0.15)' }}>Tarif</div>
            <h2 style={{ ...S.sectionTitle, color: 'white' }}>Simple et transparent</h2>
            <p style={{ ...S.sectionSub, color: 'rgba(255,255,255,0.5)', maxWidth: 400, margin: '0 auto' }}>
              Un seul tarif, tout inclus. Pas de surprise.
            </p>
          </div>
          <div style={S.tarifCard}>
            <div style={S.tarifNom}>Formule mensuelle</div>
            <div style={S.tarifPrix}>30 000 <span style={{ fontSize: 22 }}>F</span></div>
            <div style={S.tarifUnit}>par mois</div>
            <div style={S.tarifInstall}>
              + <strong style={{ color: 'white' }}>20 000 F CFA</strong> frais d'installation (une seule fois)
            </div>
            <ul style={S.tarifFeatures}>
              {['Tous les modules inclus', 'Formation du personnel comprise', 'Support technique continu', 'Mises à jour incluses', 'Mode hors-ligne intégré', 'Données sécurisées sur serveur dédié'].map((f, i) => (
                <li key={i} style={S.tarifFeature}>
                  <span style={{ color: C.orange }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href="https://wa.me/2250779127543?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20Flowix%20pour%20mon%20%C3%A9tablissement."
              target="_blank" rel="noreferrer"
              style={{ ...S.btnCTA, justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{marginRight:8}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.115 1.523 5.845L.057 23.854a.75.75 0 00.927.928l6.04-1.463A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.603-.498-5.112-1.371l-.367-.214-3.814.924.946-3.793-.232-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Démarrer avec Flowix
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={S.footer}>
        <div>
          <div style={S.footerBrand}>Flowix</div>
          <div style={S.footerSub}>Logiciel de gestion commerciale — Abidjan, Côte d'Ivoire</div>
        </div>
        <div style={S.footerContact}>
          <a href="https://wa.me/2250779127543" target="_blank" rel="noreferrer" style={{...S.footerLink, display:'flex', alignItems:'center', gap:8}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.115 1.523 5.845L.057 23.854a.75.75 0 00.927.928l6.04-1.463A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.603-.498-5.112-1.371l-.367-.214-3.814.924.946-3.793-.232-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            07 79 12 75 43
          </a>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 }}>
            akilassetia21@gmail.com
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Landing
