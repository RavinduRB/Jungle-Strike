
import React from 'react';
import { GameStatus, GunType, MissionType } from '../types';

interface MenuProps {
  status: GameStatus;
  onStart: () => void;
  onBackToMenu: () => void;
  score: number;
  message?: string;
  selectedGun: GunType;
  onSelectGun: (gun: GunType) => void;
  selectedMission: MissionType;
  onSelectMission: (mission: MissionType) => void;
}

const Menu: React.FC<MenuProps> = ({ 
  status, onStart, onBackToMenu, score, message, 
  selectedGun, onSelectGun, selectedMission, onSelectMission 
}) => {
  const guns = [
    { type: GunType.PISTOL, name: 'Pistol', desc: 'Agile & Compact' },
    { type: GunType.RIFLE, name: 'Rifle', desc: 'Precision Long-Range' },
    { type: GunType.SMG, name: 'SMG', desc: 'Tactical Fast-Fire' },
    { type: GunType.MACHINE_GUN, name: 'Machine Gun', desc: 'Heavy Suppression' },
    { type: GunType.SHOTGUN, name: 'Shotgun', desc: 'Close Quarters Power' },
    { type: GunType.FLAMETHROWER, name: 'Flame Thrower', desc: 'Continuous Inferno' },
  ];

  const missions = [
    { type: MissionType.JUNGLE, name: 'Green Hell', desc: 'Dense Jungle Outpost' },
    { type: MissionType.DESERT, name: 'Dust Storm', desc: 'Arid Desert Fort' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="max-w-xl w-full p-8 text-center bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-green-600/10 rounded-full blur-3xl"></div>

        {status === GameStatus.START ? (
          <>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic">
              JUNGLE <span className="text-red-600">STRIKE</span>
            </h1>
            <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
              {message || "The extraction point is compromised. Eliminate all hostile geometric entities."}
            </p>

            <div className="mb-6">
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-3">Target Location</p>
              <div className="grid grid-cols-2 gap-3">
                {missions.map((m) => (
                  <button
                    key={m.type}
                    onClick={() => onSelectMission(m.type)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedMission === m.type 
                        ? 'border-emerald-600 bg-emerald-600/10 shadow-lg shadow-emerald-900/20' 
                        : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <p className={`font-black text-xs uppercase ${selectedMission === m.type ? 'text-emerald-500' : 'text-zinc-400'}`}>
                      {m.name}
                    </p>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-tight">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-3">Loadout</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {guns.map((gun) => (
                  <button
                    key={gun.type}
                    onClick={() => onSelectGun(gun.type)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedGun === gun.type 
                        ? 'border-red-600 bg-red-600/10 shadow-lg shadow-red-900/20' 
                        : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <p className={`font-black text-xs uppercase ${selectedGun === gun.type ? 'text-red-500' : 'text-zinc-400'}`}>
                      {gun.name}
                    </p>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-tight">{gun.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-left text-[10px] text-zinc-500 uppercase tracking-widest font-bold bg-black/30 p-4 rounded-xl">
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> WASD Move</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Mouse Aim</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> L-Click Fire</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> [G] Grenade</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> [Y] Buy Grenades</div>
            </div>

            <button 
              onClick={onStart}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/40 uppercase tracking-widest"
            >
              Initiate Mission
            </button>
          </>
        ) : (
          <>
            <h1 className="text-6xl font-black text-white mb-2 tracking-tighter italic">
              MISSION <span className="text-red-600">FAILED</span>
            </h1>
            <p className="text-zinc-400 mb-8 font-mono">Casualties detected. Mission objective incomplete.</p>
            
            <div className="bg-black/40 p-6 rounded-2xl mb-8 border border-white/5">
                <p className="text-zinc-500 text-xs uppercase font-black tracking-widest mb-1">Final Score</p>
                <p className="text-white text-5xl font-black tabular-nums">{score.toLocaleString()}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={onStart}
                className="w-full py-5 bg-white text-black font-black text-xl rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10 uppercase tracking-widest"
              >
                START AGAIN
              </button>
              
              <button 
                onClick={onBackToMenu}
                className="w-full py-3 bg-transparent border-2 border-zinc-700 text-zinc-400 font-black text-sm rounded-xl transition-all hover:bg-zinc-800 hover:text-white uppercase tracking-widest"
              >
                Return to Base (Main Menu)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Menu;
