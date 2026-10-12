import React, { useState } from 'react';
import { Music, Volume2, VolumeX, HelpCircle, Users, Headphones, X } from 'lucide-react';
import { soundFX } from '../services/soundEffects';

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
  const [soundEnabled, setSoundEnabled] = useState(soundFX.enabled);
  const [showRules, setShowRules] = useState(false);

  const toggleSound = () => {
    soundFX.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo - Clic pour retourner à l'accueil */}
          <button
            onClick={onHomeClick}
            type="button"
            className="flex items-center gap-3 text-left group transition-transform active:scale-95 cursor-pointer focus:outline-none"
            title="Retour à l'accueil SongSpot"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black group-hover:scale-105 transition-transform">
              <Music className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  Song<span className="text-emerald-400">Spot</span>
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {currentTab === 'solo' ? 'Solo' : 'Multiplayer'}
                </span>
              </div>
            </div>
          </button>

          {/* Center Tabs: Multiplayer vs Solo */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
            <button
              onClick={() => onTabChange('multiplayer')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentTab === 'multiplayer'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Multijoueur</span>
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping hidden sm:inline-block" />
              )}
            </button>

            <button
              onClick={() => onTabChange('solo')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentTab === 'solo'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>Mode Solo</span>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              type="button"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title={soundEnabled ? 'Désactiver les effets sonores' : 'Activer les effets sonores'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowRules(true)}
              type="button"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl sm:text-2xl font-black text-white mb-2 flex items-center gap-2">
              <Music className="w-6 h-6 text-emerald-400" /> Règles de SongSpot
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              Le blind test musical ultime où chaque milliseconde compte !
            </p>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xl">⏱️</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Extraits ultra-courts
                  </strong>
                  Chaque manche démarre avec un extrait de seulement <strong>0.2 seconde</strong> ! Si vous séchez ou passez, l’extrait grandit : 0.5s, 1.5s, 4s, 9s et 15s.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xl">🏆</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Points & Bonus de vitesse
                  </strong>
                  Trouver dès le premier extrait rapporte <strong>1000 points</strong>. Plus vous trouvez vite, plus vous engrangez de points bonus !
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xl">👥</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Multijoueur en temps réel
                  </strong>
                  Créez une salle, partagez le code ou le lien avec vos amis. Tout le monde écoute le même extrait en direct et se bat pour le podium !
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xl">✨</span>
                <div>
                  <strong className="text-white block font-semibold mb-0.5">
                    Recherche gratuite & Illimitée
                  </strong>
                  Accédez à des millions de titres légaux via les APIs publiques et gratuites (iTunes, Deezer), sans aucune pub !
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              type="button"
              className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer"
            >
              C'est compris, que la musique commence ! 🎵
            </button>
          </div>
        </div>
      )}
    </>
  );
};
