<div align="center">

<img src="/public/logo.svg" alt="SongSpot Logo" width="420" />

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

### 👑 Mode 100% Un Seul Artiste (Discographie Complète)
- **Toute la discographie de l'artiste :** Récupération automatique de la discographie authentique (top titres, albums studio, featurings) avec dédoublonnage strict des titres (0 doublon garanti).
- **Fin de discographie & Score :** Dès qu'il n'y a plus de morceaux à jouer, la partie coupe immédiatement et affiche le bilan récapitulatif complet avec le score final, le taux de réussite et le détail titre par titre.
- **Cartes de suggestion d'artistes en direct :** Pendant la saisie du nom d'un artiste, autocomplétion instantanée via l'API musicale affichant une carte avec la photo carrée de l'artiste, son nom et son nombre de fans/abonnés.
- **Boutons d'accès rapide :** Suggestions populaires en un clic (Theodort, Jul, Gazo, Ninho, SDM, Tiakola, Werenoi, PLK, etc.).

### ⚙️ Paramètres Avancés (Solo & Multijoueur)
- **Nombre de manches modulable :** Choix entre `5`, `10`, `15`, `20` manches, ou `Tout` pour parcourir l'intégralité de la discographie de l'artiste sélectionné.
- **Temps par manche :** Choix entre `30s`, `45s`, `60s` ou `Illimité` (avec compte à rebours visuel et bonus de rapidité).

### 🎛️ Barre Temporelle Interactive & Glissable (Scrubber Draggable)
- **Glisser pour choisir :** Cliquez et faites glisser le curseur le long de la barre de progression pour naviguer et sélectionner librement l'instant d'écoute souhaité.
- **Poignée de scrubbing tactile :** Compatible souris et écrans tactiles (`pointer events` avec capture), affichage en temps réel du timestamp sélectionné.

### 🔗 Importation de Playlists (Spotify & Deezer)
- **Compatibilité totale :** Collez directement l'URL d'une playlist, d'un album ou d'un artiste Spotify ou Deezer (avec ou sans `https://`).
- **Résolution automatique des extraits :** Conversion et vérification des 30 secondes d'extrait pour chaque morceau importé.

### 🕹️ Multijoueur Temps Réel
- **Salons privés :** Création instantanée avec code d'accès à 6 caractères ou lien d'invitation direct.
- **Synchronisation en direct (WebSockets) :** Horloge de manche synchronisée pour tous les joueurs, scores instantanés, validation des états prêts.
- **Interactions & Ambiance :** Chat textuel en direct, réactions émojis flottantes (`🔥`, `🤯`, `😂`, `👏`, `💀`, `⚡`) et bruitages sonores.
- **Podium final :** Classement dynamique avec pluie de confettis (`canvas-confetti`) et podium interactif.

### 🔍 Moteur de Recherche Instantané & Bouton Dynamique
- **Bouton Morphing « Passer / Valider » :** Lorsque le champ est vide, le bouton affiche `Passer` ; dès qu'un titre est tapé, il se transforme dynamiquement en `Valider`.
- **Tolérance aux fautes (Fuzzy Search) :** Détection automatique des fautes de frappe, accents, majuscules, featurings et alias d'artistes.

---

## 🎨 Thèmes Musicaux Intégrés

| Thème | Description | Icône |
| :--- | :--- | :---: |
| **Rap FR** | Gazo, SDM, Tiakola, Werenoi, PLK, Jul, Theodort, Ninho, Yamê... | ⚡ |
| **Rap Mondial** | Drake, Travis Scott, Kendrick Lamar, Eminem, 21 Savage, Metro Boomin... | 🌐 |
| **R&B** | SZA, The Weeknd, Brent Faiyaz, Frank Ocean, Beyoncé, Chris Brown, Usher... | 💜 |
| **Hits Français** | Stromae, Angèle, Orelsan, Pierre Garnier, Santa, Clara Luciani, Indochine... | 🇫🇷 |
| **Hits Mondiaux** | Taylor Swift, Bruno Mars, Dua Lipa, Billie Eilish, Sabrina Carpenter, Ed Sheeran... | 🌍 |
| **100% Un Seul Artiste** | Discographie complète dédiée à l'artiste de votre choix | 👑 |
| **Lien Personnalisé** | Import d'URL Spotify ou Deezer | 🔗 |

---

## 🛠️ Architecture & Stack Technique

- **Frontend :** React 19, TypeScript, Tailwind CSS v4, Lucide React, Canvas Confetti.
- **Backend :** Express, Node.js, WebSockets (`ws`), Tsx.
- **APIs Musicales :** Intégration Deezer & Spotify avec proxy audio pour contourner les restrictions CORS.
- **Assets :** Favicon vectoriel SVG dédié (`/favicon.svg`) et logo haute résolution (`/public/logo.svg`).

---

## 💻 Installation & Démarrage

```bash
# Installation des dépendances
npm install

# Lancement en mode développement (Serveur Express + Vite sur port 3000)
npm run dev

# Construction pour la production
npm run build
```
