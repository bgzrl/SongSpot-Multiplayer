import React, { useState } from 'react';
import { HelpCircle, Users, Headphones, X } from 'lucide-react';

interface NavbarProps {
  currentTab: 'multiplayer' | 'solo';
  onTabChange: (tab: 'multiplayer' | 'solo') => void;
  isConnected?: boolean;
  onHomeClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isConnected = true,
  onHomeClick,
}) => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo Songspot moderne, pro et naturel */}
          <button
            onClick={onHomeClick}
            type="button"
            className="flex items-center gap-3 text-left group transition-all cursor-pointer focus:outline-none"
            title="Retour à l'accueil"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 text-slate-950"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                {/* 4 barres d'onde sonore stylisées et dynamiques */}
                <rect x="3" y="8" width="3" height="8" rx="1.5" />
                <rect x="8.5" y="3.5" width="3" height="17" rx="1.5" />
                <rect x="14" y="6.5" width="3" height="11" rx="1.5" />
                <rect x="19.5" y="9.5" width="3" height="5" rx="1.5" />
              </svg>
            </div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Songspot
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 mb-0.5"></span>
            </div>
          </button>

          {/* Onglets : Multijoueur & Solo (design segmenté sobre et soigné) */}
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

          {/* Bouton d'aide à droite */}
          <div className="flex items-center gap-2">
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
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950">
                <svg className="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="8" width="3" height="8" rx="1.5" />
                  <rect x="8.5" y="3.5" width="3" height="17" rx="1.5" />
                  <rect x="14" y="6.5" width="3" height="11" rx="1.5" />
                  <rect x="19.5" y="9.5" width="3" height="5" rx="1.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">
                Règles de Songspot
              </h3>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-5">
              Le blind test musical ultra-rapide où chaque milliseconde compte.
            </p>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-lg">⏱️</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Extraits ultra-courts
                  </strong>
                  Chaque manche démarre avec <strong>0.2 seconde</strong>. Si vous passez ou ratez, l’extrait s'allonge progressivement : 0.5s, 1.5s, 4s, 9s puis 15s.
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
