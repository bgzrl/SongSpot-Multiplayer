import React, { useState } from 'react';
import { HelpCircle, Users, Headphones, X } from 'lucide-react';

interface NavbarProps {
  currentTab: 'multiplayer' | 'solo';
  onTabChange: (tab: 'multiplayer' | 'solo') => void;
  isConnected?: boolean;
  onHomeClick?: () => void;
  isInRoom?: boolean;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isConnected = true,
  onHomeClick,
  isInRoom = false,
  onLeaveRoom,
}) => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Clean, authentic music brand mark */}
          <button
            onClick={onHomeClick}
            type="button"
            className="flex items-center gap-2.5 text-left group transition-all cursor-pointer focus:outline-none"
            title="Accueil"
          >
            <div className="relative w-8 h-8 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-md group-hover:border-emerald-500/60 transition-colors">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <div className="absolute inset-1 rounded-full border border-slate-700/50 pointer-events-none"></div>
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                SongSpot
              </span>
            </div>
          </button>

          {/* Onglets : Multijoueur & Solo */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
            <button
              onClick={() => onTabChange('multiplayer')}
              type="button"
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'multiplayer'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Multijoueur</span>
            </button>

            <button
              onClick={() => onTabChange('solo')}
              type="button"
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'solo'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>Solo</span>
            </button>
          </div>

          {/* Right Controls: Quitter la salle if in room + Help button */}
          <div className="flex items-center gap-2">
            {isInRoom && onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                type="button"
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                title="Quitter la partie et retourner à l'accueil"
              >
                <span>Quitter 🚪</span>
              </button>
            )}

            <button
              onClick={() => setShowRules(true)}
              type="button"
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Règles du jeu"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <h3 className="text-xl font-bold text-white">
                Règles du jeu
              </h3>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-5">
              Le blind test musical ultra-rapide où chaque fraction de seconde compte.
            </p>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-lg">⏱️</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Extraits progressifs
                  </strong>
                  Chaque manche démarre avec <strong>1 seconde</strong> de musique. Si vous passez ou devinez faux, l'extrait s'allonge : 2s, 4s, 7s, 11s puis 16s.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-lg">🏆</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Points & Rapidité
                  </strong>
                  Trouver dès les premières fractions de seconde rapporte le maximum de points.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-lg">👥</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Multijoueur en temps réel
                  </strong>
                  Créez une salle, partagez le code avec vos amis et devinez ensemble sur le même extrait sonore.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-lg">🎧</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Mode Solo & Artiste Unique
                  </strong>
                  Jouez en continu sur les hits du moment ou testez-vous à 100% sur un artiste particulier sans aucun intrus.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              type="button"
              className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer shadow-md"
            >
              C'est compris, jouer !
            </button>
          </div>
        </div>
      )}
    </>
  );
};
