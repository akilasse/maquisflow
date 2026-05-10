# Flowix — SaaS de gestion commerciale

## Stack technique
- Backend : Node.js + Express + Prisma v5 + MySQL (port 3000)
- Frontend : React + Vite + Tailwind CSS (port 5173)
- Mobile : React Native + Expo (APK patron uniquement)
- Electron : App desktop caisse professionnelle
- Auth : JWT accessToken (15min) + refreshToken (7j cookie)

## Infrastructure production
- VPS Contabo : 31.220.81.96 (Ubuntu 24.04)
- Domaine : maquisflow.com (SSL Let's Encrypt)
- PM2 : process "maquisflow-backend"
- Nginx : proxy /api → localhost:3000, static → frontend/dist

## Comptes production
- SuperAdmin : admin@maquisflow.com / nimdA123 → /admin/login
- JWT_SECRET : maquisflow_jwt_secret_2026

## Structure projet
```
MaquisFlow/
├── backend/
│   ├── modules/
│   │   ├── auth/         # Login universel, multi-établissements, refresh
│   │   ├── admin/        # Super admin, création établissements
│   │   ├── dashboard/    # Stats jour/semaine/mois, wallets, top produits
│   │   ├── stock/        # Produits, mouvements stock
│   │   ├── ventes/       # Caisse, historique, annulation
│   │   ├── inventaire/   # Inventaires physiques
│   │   ├── parametrage/  # Utilisateurs, upload photos
│   │   └── fournisseurs/ # Fournisseurs, bons livraison
│   ├── middlewares/
│   │   └── upload.js     # Multer : logos, photos produits/utilisateurs
│   └── prisma/
│       └── schema.prisma # Modèles DB
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Maquis/   # Dashboard, Caisse, Stock, Inventaire, Parametrage, Login
│       │   └── admin/    # AdminLogin, AdminDashboard
│       ├── context/
│       │   ├── AuthContext.jsx   # Login, multi-établissements, selectionRequise
│       │   └── SocketContext.jsx # WebSocket pour updates temps réel
│       └── utils/
│           ├── api.js      # Axios avec intercepteur refresh token
│           └── offlineDB.js # IndexedDB pour ventes offline
├── mobile/
│   └── src/
│       ├── screens/
│       │   ├── LoginScreen.js    # Login universel + sélection établissement
│       │   ├── DashboardScreen.js # Stats + paiements 2x3 + top produits
│       │   └── VentesScreen.js   # 3 onglets : aujourd'hui/mois/période
│       └── context/
│           └── AuthContext.js    # Multi-établissements mobile
└── electron-caisse/
    ├── main.js       # Process principal Electron + IPC + impression ESC/POS
    ├── preload.js    # Bridge sécurisé Electron ↔ renderer
    └── renderer/
        └── index.html # Interface caisse HTML pur

## Règles importantes
- Plus de dossier Resto/ — interface universelle pour tous types d'établissements
- Login sans type — l'API détecte automatiquement le type d'établissement
- Si utilisateur a plusieurs établissements → écran de sélection avec "← Changer de compte"
- Couleurs par activité : Maquis=#FF6B35, Restaurant=#1D4ED8, Boutique=#7C3AED, Pharmacie=#16A34A, Salon=#EC4899, MTN MoMo toujours #FFCC00
- Dashboard web et mobile : 6 modes paiement TOUJOURS affichés (même à 0), 2 lignes de 3
- Mode offline caisse : IndexedDB (web) / electron-store (Electron), sync auto au retour connexion

## Déploiement VPS
```bash
ssh root@31.220.81.96
cd /var/www/maquisflow
git pull
npm install --prefix backend
cd backend && npx prisma db push && cd ..
cd frontend && npm run build && cd ..
pm2 restart maquisflow-backend
```

## À développer
1. Génération .exe Electron (en cours)
2. Module Fast Food : tablette serveur, routage cuisine/bar, écran KDS
3. Impression ESC/POS automatique après vente
4. Mode offline mobile patron
5. Intégration imprimantes thermiques