<div align="center">

# 🎵 SongSpot Multiplayer

### *Le Blind Test musical nouvelle génération en solo & multijoueur temps réel*

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-ws-41B883?style=for-the-badge&logo=socketdotio&logoColor=white)](https://github.com/websockets/ws)

<p align="center">
  <b>Écoutez des extraits musicaux ultra-courts, devinez le titre et l'artiste en un minimum d'étapes, et défiez vos amis en direct !</b>
</p>

[Fonctionnalités](#-fonctionnalités-clés) •
[Modes de Jeu](#-modes-de-jeu) •
[Architecture](#-architecture--stack-technique) •
[Installation](#-installation--démarrage) •
[Contrôles](#-contrôles--raccourcis)

---

</div>

## ✨ Présentation

**SongSpot** réinvente le concept du célèbre jeu *Heardle* en y apportant une expérience multijoueur en direct, un moteur de son haute précision et un catalogue musical ultra-complet axé sur les hits francophones et mondiaux.

Chaque manche propose un morceau mystère découpé en tranches progressives :
- **Étape 1 :** `0s` ➔ `1.0s` *(1 seconde pour deviner !)*
- **Étape 2 :** `1.0s` ➔ `2.0s` *(nouvel extrait dédié)*
- **Étape 3 :** `2.0s` ➔ `4.0s`
- **Étape 4 :** `4.0s` ➔ `7.0s`
- **Étape 5 :** `7.0s` ➔ `11.0s`
- **Étape 6 :** `11.0s` ➔ `16.0s` *(dernière chance avant révélation)*

---

## 🚀 Fonctionnalités Clés

### 🕹️ Multijoueur Temps Réel
- **Salons personnalisés :** Création instantanée de salons privés avec code d'accès à 6 caractères ou lien d'invitation direct.
- **Synchronisation en direct (WebSockets) :** Horloge de manche synchronisée pour tous les joueurs, scores instantanés, animations d'essais en direct.
- **Interactions & Ambiance :** Chat textuel en direct, réactions émojis flottantes (`🔥`, `🤯`, `😂`, `👏`, `💀`, `⚡`) et sons interactifs.
- **Podium final :** Classement dynamique avec célébration, pluie de confettis (`canvas-confetti`) et détail des points par manche.

### 🎧 Moteur Audio Haute Précision
- **Zéro conflit audio :** Architecture autoritaire garantissant qu'un seul son joue à la fois dans le navigateur.
- **Système de tranches isolées :** À l'étape 2, vous écoutez uniquement l'extrait de `1s` à `2s` sans être obligé de réécouter depuis le début.
- **Réécoute interactive des étapes :** Cliquez sur n'importe quel segment débloqué (`0s-1s`, `1s-2s`, etc.) sur la barre pour le réécouter individuellement.
- **Bouton « Tout écouter » :** Possibilité de réécouter d'un clic tout l'extrait cumulé débloqué (`0s` à `Xs`).
- **Barre segmentée millimétrée :** Alignement fidèle des repères de temps au-dessus des séparateurs de segments.
- **Contrôle du volume persistant :** Curseur de volume avec sauvegarde automatique dans `localStorage`.

### 🔍 Moteur de Recherche Instantané & Intelligent
- **Autocomplétion ultra-rapide :** Cache client réactif et système anti-blocage (fallback serveur résilient en cas de latence réseau).
- **Tolérance aux fautes (Fuzzy Search) :** Détection automatique des fautes de frappe, accents, majuscules, featurings et alias d'artistes.
- **Validation souple :** Les variantes (titres avec parenthèses, versions remasterisées, featurings) sont reconnues automatiquement pour éviter les frustrations.

### 📻 Playlists Thématiques & Modes Spéciaux
- 🔥 **Top Tendances France & TikTok :** Les plus gros hits récents.
- ⚡ **Rap FR & Bangers Gen Z :** Gazo, SDM, Tiakola, Werenoi, PLK, Jul, Ninho, Theodort...
- 👑 **Mode 100% Un Seul Artiste :** Tapez le nom de votre artiste préféré pour générer une partie dédiée sur sa discographie complète.
- 🌍 **Hits Internationaux :** The Weeknd, Billie Eilish, Bruno Mars, Dua Lipa, Kendrick Lamar...
- 🇫🇷 **Variété Française & Classiques :** Stromae, Angèle, Céline Dion, Indochine, Orelsan...
- 📻 **Nostalgie 2000s & 2010s :** Rihanna, Britney, Eminem, Shakira, Coldplay...
- 🎸 **Classiques Rock & Pop (80s/90s) & Electro / Dance.**

### 📊 Statistiques & Partage
- **Tableau de bord statistique :** Taux de victoire, série actuelle (streak), meilleure série, répartition du nombre d'essais.
- **Grille de partage Heardle :** Copiez votre résultat sous forme de carrés émojis (🟩 🟥 ⬛) pour défier vos amis sur Discord ou Twitter/X.

---

## 🎮 Modes de Jeu

| Mode | Description | Idéal pour... |
| :--- | :--- | :--- |
| **Solo Quotidien / Infini** | Jouez en solo, enchaînez les morceaux ou rejouez à volonté sur la playlist de votre choix. | S'entraîner et tester sa culture musicale. |
| **Multijoueur Privé** | Créez un salon de 2 à 10+ joueurs, configurez le nombre de manches (3 à 15) et le temps par manche (20s à 60s). | Soirées entre amis, streams et pauses café. |

---

## 🛠️ Architecture & Stack Technique

```
songspot/
├── server.ts                   # Serveur HTTP Express + Serveur WebSocket (ws)
├── server/
│   └── musicService.ts         # Service de musique, API iTunes/Deezer, proxy audio & fuzzy match
├── src/
│   ├── components/
│   │   ├── AudioWaveform.tsx       # Barre audio segmentée interactive & scrubber
│   │   ├── ChatAndReactions.tsx    # Chat en direct & bulles d'émojis flottantes
│   │   ├── GamePodium.tsx          # Écran de fin de partie multijoueur & podium
│   │   ├── GameRound.tsx           # Manche active multijoueur
│   │   ├── HeardleAttemptsList.tsx # Historique des 6 essais avec pastilles d'état
│   │   ├── MultiplayerLobby.tsx    # Salle d'attente multijoueur avec code de salon
│   │   ├── Navbar.tsx              # Barre de navigation & sélecteur de thème
│   │   ├── RoundResultsModal.tsx   # Modal de fin de manche & écoute complète (30s)
│   │   ├── SoloGame.tsx            # Expérience de jeu solo
│   │   ├── SongSearchInput.tsx     # Barre de recherche avec autocomplétion & cache
│   │   └── StatsModal.tsx          # Modal de statistiques & export de score
│   ├── services/
│   │   ├── audioController.ts      # Lecteur HTML5 haute précision (gestion des sessions)
│   │   └── soundEffects.ts         # Moteur de synthétiseur Web Audio (bip, succès, erreur)
│   ├── types/
│   │   └── game.ts                 # Définitions TypeScript complètes (Room, Song, Player...)
│   ├── App.tsx                     # Routeur d'écrans & gestion des vues
│   └── index.css                   # Styles globaux Tailwind CSS v4
├── package.json
└── tsconfig.json
```

---

## 🚀 Installation & Démarrage

### Prérequis
- **Node.js** (v18 ou supérieur recommandé)
- **npm**, **pnpm** ou **yarn**

### 1. Cloner le dépôt
```bash
git clone https://github.com/votre-compte/songspot-multiplayer.git
cd songspot-multiplayer
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Lancer en mode développement
```bash
npm run dev
```

L'application démarre sur [http://localhost:3000](http://localhost:3000) :
- Le serveur Express et les WebSockets sont lancés sur le port 3000.
- Vite sert le frontend avec rechargement à chaud.

### 4. Compiler pour la production
```bash
npm run build
npm start
```

---

## ⌨️ Contrôles & Raccourcis

| Raccourci | Action |
| :--- | :--- |
| <kbd>Espace</kbd> | Lancer / Mettre en pause l'extrait audio en cours |
| <kbd>Entrée</kbd> | Valider la suggestion sélectionnée dans la barre de recherche |
| <kbd>Échap</kbd> | Fermer les modales de statistiques ou de résultats |
| **Clic sur tranche** | Écouter spécifiquement le segment correspondant (`0s-1s`, `1s-2s`, etc.) |

---

## 🤝 Contribution

Les contributions, signalements de bugs et suggestions de fonctionnalités sont les bienvenus !
1. Forkez le projet
2. Créez votre branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos modifications (`git commit -m 'feat: ajout d'une nouvelle fonctionnalité'`)
4. Poussez sur votre branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une **Pull Request**

---

<div align="center">
  <sub>Fait avec ❤️ pour les passionnés de musique. Bon jeu sur SongSpot ! 🎶</sub>
</div>
