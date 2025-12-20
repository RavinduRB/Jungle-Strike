
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, WeatherType } from '../types';

// Declare THREE global
declare const THREE: any;

interface HUDProps {
  state: GameState;
}

const HUD: React.FC<HUDProps> = ({ state }) => {
  const [isNearVehicle, setIsNearVehicle] = useState(false);
  const [isNearVending, setIsNearVending] = useState(false);
  const [playerRotation, setPlayerRotation] = useState(0);
  const [jeepWorldPos, setJeepWorldPos] = useState({ x: 0, z: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const radarSize = 120;
  const radarScale = 2; 

  const VENDING_MACHINE_POS = { x: 10.2, z: -3.5 };

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    const interval = setInterval(() => {
      const player = document.querySelector('#player');
      const jeep = document.querySelector('#jeep');
      if (player && jeep) {
        const pObj = (player as any).object3D;
        const jObj = (jeep as any).object3D;
        const dist = pObj.position.distanceTo(jObj.position);
        setIsNearVehicle(dist < 4);
        
        const vendingPos = new THREE.Vector3(VENDING_MACHINE_POS.x, 0, VENDING_MACHINE_POS.z);
        const distVending = pObj.position.distanceTo(vendingPos);
        setIsNearVending(distVending < 3);

        setPlayerRotation(pObj.rotation.y);
        setJeepWorldPos({ x: jObj.position.x, z: jObj.position.z });
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const timeString = useMemo(() => {
    const hours = Math.floor(state.gameTime);
    const mins = Math.floor((state.gameTime % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }, [state.gameTime]);

  const timePhaseLabel = useMemo(() => {
    const t = state.gameTime;
    if (t >= 6 && t < 10) return "Morning";
    if (t >= 10 && t < 16) return "Noon";
    if (t >= 16 && t < 19) return "Evening";
    return "Night";
  }, [state.gameTime]);

  const weatherLabel = useMemo(() => {
    switch (state.weather) {
      case WeatherType.RAIN: return "⛈️ Storming";
      case WeatherType.SNOW: return "❄️ Snowing";
      default: return "☀️ Clear";
    }
  }, [state.weather]);

  const rotationDegrees = -playerRotation * (180 / Math.PI);
  const waterZones = (window as any).gameActions?.waterZones || [];

  const getRadarCoords = (targetX: number, targetZ: number) => {
    const playerEl = document.querySelector('#player');
    if (!playerEl) return { dx: 0, dz: 0, out: true };
    const pPos = (playerEl as any).object3D.position;
    const dx = (targetX - pPos.x) * radarScale;
    const dz = (targetZ - pPos.z) * radarScale;
    const out = Math.sqrt(dx*dx + dz*dz) > radarSize/2 - 5;
    return { dx, dz, out };
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6 z-[9999]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-2 border-white/50 rounded-full flex items-center justify-center">
        <div className="absolute w-4 h-[1px] bg-white/80"></div>
        <div className="absolute h-4 w-[1px] bg-white/80"></div>
        <div className="w-1 h-1 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]"></div>
      </div>

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-4">
          <div 
            className="relative bg-black/60 border-2 border-green-500/50 rounded-full overflow-hidden shadow-lg shadow-green-900/20 backdrop-blur-sm pointer-events-auto"
            style={{ width: radarSize, height: radarSize }}
          >
            <div className="absolute inset-0 border border-green-500/10 rounded-full"></div>
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-green-500/20"></div>
            <div className="absolute left-1/2 top-0 w-[1px] h-full bg-green-500/20"></div>

            <div className="absolute inset-0 flex items-center justify-center">
               {waterZones.map((zone: any) => {
                  const { dx, dz } = getRadarCoords(zone.x, zone.z);
                  const visualSize = zone.radius * radarScale * 2;
                  return (
                    <div key={zone.id} className="absolute bg-blue-500/40 rounded-full border border-blue-400/50" style={{ width: visualSize, height: visualSize, transform: `translate(${dx}px, ${dz}px)` }} />
                  );
               })}
               {(() => {
                 const { dx, dz, out } = getRadarCoords(VENDING_MACHINE_POS.x, VENDING_MACHINE_POS.z);
                 if (out) return null;
                 return (
                    <div className="absolute w-3 h-3 bg-cyan-400 rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.8)] border border-white/40 z-20" style={{ transform: `translate(${dx}px, ${dz}px)` }}>
                      <div className="w-full h-full flex items-center justify-center text-[6px] font-black text-black leading-none">$</div>
                    </div>
                 );
               })()}
               {(() => {
                 const { dx, dz, out } = getRadarCoords(jeepWorldPos.x, jeepWorldPos.z);
                 if (out) return null;
                 return (
                    <div className="absolute w-3.5 h-2.5 bg-yellow-400 rounded-sm shadow-[0_0_8px_rgba(250,204,21,0.8)] border border-black/40 z-20" style={{ transform: `translate(${dx}px, ${dz}px)` }}>
                      <div className="w-full h-full flex items-center justify-center text-[5px] font-black text-black leading-none">V</div>
                    </div>
                 );
               })()}
               <div className="relative z-30 transition-transform duration-75" style={{ transform: `rotate(${rotationDegrees}deg)` }}>
                 <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)] border border-white/20"></div>
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid rgba(74, 222, 128, 0.9)' }}></div>
               </div>
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-green-500/5 to-transparent animate-[spin_4s_linear_infinite]"></div>
               {state.enemies.map(enemy => {
                  const { dx, dz, out } = getRadarCoords(enemy.position.x, enemy.position.z);
                  if (out) return null;
                  return (
                    <div key={enemy.id} className="absolute w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)] border border-black/40 transition-all duration-100 z-10" style={{ transform: `translate(${dx}px, ${dz}px)` }} />
                  );
               })}
            </div>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-green-500/80">N</div>
          </div>

          <div className="bg-black/60 px-4 py-2 border-l-4 border-cyan-500 rounded-r-lg backdrop-blur-sm shadow-xl flex flex-col gap-1">
            <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              {timePhaseLabel} <span className="opacity-50">|</span> {weatherLabel}
            </p>
            <p className="text-white text-xl font-black tabular-nums">{timeString}</p>
          </div>

          {/* Grenade HUD */}
          <div className="flex flex-col gap-2">
            <div className="bg-black/60 px-4 py-2 border-l-4 border-green-500 rounded-r-lg backdrop-blur-sm transition-all flex items-center gap-3">
               <div className="w-6 h-6 bg-green-900 rounded-full flex items-center justify-center border border-green-400">
                  <div className="w-2 h-3 bg-green-400 rounded-sm"></div>
               </div>
               <div>
                  <p className="text-green-500 text-[8px] font-black uppercase">Grenade [G]</p>
                  <p className="text-white text-base font-black">{state.grenades} <span className="text-[10px] opacity-40">/ 5</span></p>
               </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="bg-black/60 px-6 py-3 border-b-4 border-emerald-500 rounded-lg backdrop-blur-sm shadow-xl">
            <p className="text-emerald-500 text-xs font-bold tracking-widest uppercase text-right">Money</p>
            <p className="text-white text-3xl font-black tabular-nums text-right">${state.money.toLocaleString()}</p>
          </div>
          <div className="bg-black/60 px-6 py-3 border-b-4 border-yellow-500 rounded-lg backdrop-blur-sm shadow-xl">
            <p className="text-yellow-500 text-xs font-bold tracking-widest uppercase text-right">Score</p>
            <p className="text-white text-3xl font-black tabular-nums text-right">{state.score.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
         {isNearVehicle && !state.isDriving && (
           <button onClick={() => (window as any).document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'}))} className="bg-black/70 px-6 py-3 rounded-full border border-white/30 animate-pulse shadow-2xl backdrop-blur-md mb-4 pointer-events-auto">
             <span className="text-white font-black text-base uppercase tracking-widest">Enter Vehicle <span className="text-yellow-400">[E]</span></span>
           </button>
         )}
         {isNearVending && (
           <div className="flex flex-col gap-2 pointer-events-auto">
             <button onClick={() => (window as any).gameActions.buyGrenades()} className="bg-black/70 px-6 py-3 rounded-full border border-green-500/50 shadow-2xl backdrop-blur-md">
               <span className="text-white font-black text-sm uppercase tracking-widest">Buy Grenades ($500) <span className="text-lime-400">[Y]</span></span>
             </button>
           </div>
         )}
         {state.isDriving && (
           <button onClick={() => (window as any).document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'}))} className="bg-black/70 px-6 py-3 rounded-full border border-red-500/50 shadow-2xl backdrop-blur-md pointer-events-auto">
             <span className="text-white font-black text-base uppercase tracking-widest">Exit Vehicle <span className="text-red-400">[E]</span></span>
           </button>
         )}
      </div>

      {isTouchDevice && (
        <div className="absolute bottom-24 right-6 flex flex-col gap-4 pointer-events-auto">
          <button onPointerDown={(e) => { e.preventDefault(); (window as any).gameActions.manualFire(); }} className="w-20 h-20 bg-red-600/60 rounded-full border-4 border-red-500 shadow-2xl flex items-center justify-center backdrop-blur-md"><div className="w-8 h-8 border-4 border-white rounded-full"></div></button>
          <button onPointerDown={(e) => { e.preventDefault(); (window as any).gameActions.manualGrenade(); }} className="w-16 h-16 bg-green-600/60 rounded-full border-4 border-green-500 shadow-2xl flex items-center justify-center backdrop-blur-md"><div className="w-6 h-6 bg-white rounded-sm"></div></button>
        </div>
      )}

      <div className="w-full max-w-md mx-auto mb-4">
        <div className="flex justify-between items-end mb-2"><span className="text-white font-bold text-lg uppercase tracking-tighter">Vitality</span><span className="text-white font-black text-2xl">{state.health}%</span></div>
        <div className="w-full h-5 bg-gray-900/90 rounded-full border border-white/20 overflow-hidden backdrop-blur-sm shadow-inner">
          <div className="h-full transition-all duration-300 ease-out" style={{ width: `${state.health}%`, backgroundColor: state.health > 50 ? '#10b981' : state.health > 25 ? '#f59e0b' : '#ef4444' }} />
        </div>
      </div>
    </div>
  );
};

export default HUD;
