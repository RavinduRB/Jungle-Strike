
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameStatus, GameState, EnemyData, GunType, WeatherType, MissionType, ThrowableType } from './types';
import HUD from './components/HUD';
import Menu from './components/Menu';
import { GoogleGenAI } from "@google/genai";

// FIX: Expanded JSX IntrinsicElements declaration to ensure A-Frame tags are recognized by the TypeScript compiler
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any;
      'a-entity': any;
      'a-assets': any;
      'a-asset-item': any;
      'a-image': any;
      'a-plane': any;
      'a-box': any;
      'a-sphere': any;
      'a-cylinder': any;
      'a-cone': any;
      'a-sky': any;
      'a-text': any;
      'a-light': any;
      'a-camera': any;
      'a-cursor': any;
      'a-circle': any;
      'a-octahedron': any;
      [elemName: string]: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'a-scene': any;
        'a-entity': any;
        'a-assets': any;
        'a-asset-item': any;
        'a-image': any;
        'a-plane': any;
        'a-box': any;
        'a-sphere': any;
        'a-cylinder': any;
        'a-cone': any;
        'a-sky': any;
        'a-text': any;
        'a-light': any;
        'a-camera': any;
        'a-cursor': any;
        'a-circle': any;
        'a-octahedron': any;
        [elemName: string]: any;
      }
    }
  }
}

// Declare AFRAME and THREE globals
declare const AFRAME: any;
declare const THREE: any;

const ENEMY_SPAWN_RATE = 2000; // Faster spawns
const INITIAL_HEALTH = 100;
const GRENADE_COST = 500;
const KILL_REWARD = 200;
const MAX_GRENADES = 5;

const GUN_ORDER = [
  GunType.PISTOL,
  GunType.RIFLE,
  GunType.SMG,
  GunType.MACHINE_GUN,
  GunType.SHOTGUN,
  GunType.FLAMETHROWER
];

const WEAPON_DATA: Record<string, any> = {
  [GunType.PISTOL]: {
    damage: 35,
    cooldown: 250,
    spread: 0.01,
    recoil: 0.1,
    automatic: false,
    muzzleScale: 0.07,
    recoilDuration: 60
  },
  [GunType.RIFLE]: {
    damage: 60,
    cooldown: 400,
    spread: 0.005,
    recoil: 0.25,
    automatic: false,
    muzzleScale: 0.12,
    recoilDuration: 100
  },
  [GunType.SMG]: {
    damage: 15,
    cooldown: 80,
    spread: 0.04,
    recoil: 0.08,
    automatic: true,
    muzzleScale: 0.08,
    recoilDuration: 40
  },
  [GunType.MACHINE_GUN]: {
    damage: 25,
    cooldown: 100,
    spread: 0.06,
    recoil: 0.2,
    automatic: true,
    muzzleScale: 0.15,
    recoilDuration: 70
  },
  [GunType.SHOTGUN]: {
    damage: 15,
    cooldown: 900,
    spread: 0.15,
    recoil: 0.6,
    automatic: false,
    muzzleScale: 0.2,
    recoilDuration: 200,
    pellets: 10
  },
  [GunType.FLAMETHROWER]: {
    damage: 12, 
    cooldown: 40,
    spread: 0.3,
    recoil: 0.02,
    automatic: true,
    muzzleScale: 0,
    recoilDuration: 0
  }
};

const WATER_ZONES = [
  { id: 'w1', x: -10, z: -15, radius: 5 },
  { id: 'w2', x: 15, z: 20, radius: 7 },
  { id: 'w3', x: -20, z: 5, radius: 4 },
];

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

/**
 * Creates a punchy, realistic gunshot sound using a combination of noise and synthesized waveforms.
 */
const playShotSound = (gunType: GunType) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);

  const createNoiseBurst = (duration: number, volume: number, filterFreq: number) => {
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
  };

  const createBody = (freq: number, type: OscillatorType, duration: number, volume: number) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.1, now + duration);
    
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.1);
  };

  switch (gunType) {
    case GunType.FLAMETHROWER:
      masterGain.gain.setValueAtTime(0.4, now);
      const bufferSize = audioCtx.sampleRate * 0.2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start(now);
      break;

    case GunType.PISTOL:
      createNoiseBurst(0.05, 0.6, 2000);
      createBody(400, 'sine', 0.1, 0.8);
      break;

    case GunType.RIFLE:
      createNoiseBurst(0.1, 0.8, 1500);
      createBody(150, 'square', 0.25, 0.7);
      createBody(60, 'sine', 0.3, 1.0);
      break;

    case GunType.SMG:
      createNoiseBurst(0.03, 0.4, 3000);
      createBody(500, 'triangle', 0.08, 0.5);
      break;

    case GunType.MACHINE_GUN:
      createNoiseBurst(0.08, 0.9, 1200);
      createBody(100, 'square', 0.15, 0.8);
      createBody(50, 'sine', 0.2, 0.6);
      break;

    case GunType.SHOTGUN:
      createNoiseBurst(0.2, 1.0, 800);
      createBody(80, 'square', 0.4, 1.0);
      createBody(40, 'sine', 0.5, 1.2);
      break;

    default:
      createNoiseBurst(0.1, 0.5, 1000);
      createBody(200, 'sine', 0.15, 0.9);
      break;
  }
};

const playExplosionSound = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.setValueAtTime(1.0, now);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

  const noise = audioCtx.createBufferSource();
  const bufferSize = audioCtx.sampleRate * 1.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(40, now + 1.2);

  noise.connect(filter);
  filter.connect(masterGain);
  noise.start(now);
};

const lerpColor = (c1: string, c2: string, t: number) => {
  const color1 = new THREE.Color(c1);
  const color2 = new THREE.Color(c2);
  color1.lerp(color2, t);
  return `#${color1.getHexString()}`;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    money: 0,
    health: INITIAL_HEALTH,
    grenades: 2,
    selectedThrowable: 'GRENADE',
    status: GameStatus.START,
    enemies: [],
    lastDamageTime: 0,
    selectedGun: GunType.PISTOL,
    selectedMission: MissionType.JUNGLE,
    isDriving: false,
    gameTime: 5, 
    weather: WeatherType.CLEAR
  });

  const [aiMessage, setAiMessage] = useState<string>("");

  const handleEnemyKill = useCallback((id: string) => {
    setGameState(prev => ({
      ...prev,
      score: prev.score + KILL_REWARD,
      money: prev.money + KILL_REWARD
    }));
  }, []);

  const handlePlayerDamage = useCallback((amount: number) => {
    setGameState(prev => {
      const newHealth = Math.max(0, prev.health - amount);
      if (newHealth <= 0 && prev.status === GameStatus.PLAYING) {
        return { ...prev, health: 0, status: GameStatus.GAMEOVER };
      }
      return { ...prev, health: newHealth, lastDamageTime: Date.now() };
    });
  }, []);

  const backToMenu = useCallback(() => {
    setGameState(prev => ({ ...prev, status: GameStatus.START }));
  }, []);

  const setGun = useCallback((gun: GunType) => {
    setGameState(prev => ({ ...prev, selectedGun: gun }));
  }, []);

  const setMission = useCallback((mission: MissionType) => {
    setGameState(prev => ({ ...prev, selectedMission: mission }));
  }, []);

  const handleWeaponSwitch = useCallback((direction: 'next' | 'prev') => {
    setGameState(prev => {
      const currentIndex = GUN_ORDER.indexOf(prev.selectedGun);
      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      
      if (nextIndex >= GUN_ORDER.length) nextIndex = 0;
      if (nextIndex < 0) nextIndex = GUN_ORDER.length - 1;
      
      return { ...prev, selectedGun: GUN_ORDER[nextIndex] };
    });
  }, []);

  const fetchEncouragement = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Give a short, aggressive 1-sentence action movie quote for a jungle FPS soldier.",
        config: { temperature: 0.9 }
      });
      setAiMessage(response.text || "Eliminate all hostiles.");
    } catch (e) {
      setAiMessage("Target neutralized. Keep moving.");
    }
  };

  useEffect(() => {
    if (gameState.status === GameStatus.START) fetchEncouragement();
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING) {
      const timer = setInterval(() => {
        setGameState(prev => {
          const t = prev.gameTime;
          const isDaytime = t >= 6 && t < 19;
          const currentIncrement = isDaytime ? 0.015 : 0.09;
          const nextTime = (t + currentIncrement) % 24;

          let weather = WeatherType.CLEAR;
          if (nextTime >= 6 && nextTime < 9) weather = WeatherType.SNOW;
          else if (nextTime >= 14 && nextTime < 17) weather = WeatherType.RAIN;

          return { ...prev, gameTime: nextTime, weather };
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [gameState.status]);

  const missionConfig = useMemo(() => {
    if (gameState.selectedMission === MissionType.DESERT) {
      return {
        envPreset: 'volcano',
        groundColor: '#4a3728',
        groundColor2: '#2b1f15',
        dressingColor: '#7d5a3c',
        houseColor: '#a67b5b',
        skyBase: '#ffaa66'
      };
    }
    return {
      envPreset: 'forest',
      groundColor: '#2b3a1a',
      groundColor2: '#1e2a12',
      dressingColor: '#3d5a2d',
      houseColor: '#5c4033',
      skyBase: '#88ccff'
    };
  }, [gameState.selectedMission]);

  const lightingParams = useMemo(() => {
    const t = gameState.gameTime;
    const normalizedTime = (t - 6) / 12;
    const angle = normalizedTime * Math.PI;
    const sunX = Math.cos(angle) * 100;
    const sunY = Math.sin(angle) * 100;
    const sunZ = -50;

    let ambientIntensity = 0.5;
    let sunIntensity = 1.0;
    let sunColor = "#ffffff";
    let skyColor = missionConfig.skyBase;
    let dressingColor = missionConfig.dressingColor;
    let isNight = false;
    let fogDensity = 0;

    if (t >= 6 && t < 9) {
      const factor = (t - 6) / 3;
      isNight = false;
      skyColor = lerpColor("#1a1a2e", missionConfig.skyBase, factor);
      sunColor = lerpColor("#444466", "#ffaa44", factor);
      ambientIntensity = 0.1 + factor * 0.4;
      sunIntensity = 0.2 + factor * 0.8;
    } else if (t >= 9 && t < 16) {
      isNight = false;
      skyColor = missionConfig.skyBase;
      sunColor = "#ffffff";
      ambientIntensity = 0.5;
      sunIntensity = 1.0;
    } else if (t >= 16 && t < 19) {
      const factor = (t - 16) / 3;
      isNight = false;
      skyColor = lerpColor(missionConfig.skyBase, "#3a1c5d", factor);
      sunColor = lerpColor("#ffffff", "#ff4500", factor);
      ambientIntensity = 0.5 - factor * 0.35;
      sunIntensity = 1.0 - factor * 0.8;
    } else {
      isNight = true;
      ambientIntensity = 0.15;
      sunIntensity = 0.2; 
      sunColor = "#b0b0ff";
      skyColor = "#050510";
    }

    if (gameState.weather === WeatherType.RAIN) {
      skyColor = lerpColor(skyColor, "#4a5568", 0.6);
      ambientIntensity *= 0.7;
      sunIntensity *= 0.4;
      fogDensity = 0.6;
    } else if (gameState.weather === WeatherType.SNOW) {
      skyColor = lerpColor(skyColor, "#cbd5e0", 0.4);
      fogDensity = 0.8;
      dressingColor = missionConfig.dressingColor;
    }

    return { 
      sunPos: `${sunX} ${sunY} ${sunZ}`, 
      ambientIntensity, 
      sunIntensity, 
      sunColor, 
      skyColor, 
      dressingColor,
      isNight,
      fogDensity
    };
  }, [gameState.gameTime, gameState.weather, missionConfig]);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      score: 0,
      money: 0,
      health: INITIAL_HEALTH,
      grenades: 2,
      selectedThrowable: 'GRENADE',
      status: GameStatus.PLAYING,
      enemies: [],
      lastDamageTime: 0,
      isDriving: false,
      gameTime: 12, 
      weather: WeatherType.CLEAR
    }));

    const scene = document.querySelector('a-scene') as any;
    if (scene) {
      const existingEnemies = scene.querySelectorAll('[enemy-logic]');
      existingEnemies.forEach((e: any) => e.parentNode?.removeChild(e));

      const player = document.querySelector('#player') as any;
      if (player) {
        player.setAttribute('position', '0 1.6 0');
        player.setAttribute('wasd-controls', 'enabled: true');
        if (player.body) {
          player.body.velocity.set(0, 0, 0);
          player.body.angularVelocity.set(0, 0, 0);
        }
      }

      scene.addEventListener('click', () => {
        scene.canvas.requestPointerLock();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      }, { once: true });
    }
  };

  useEffect(() => {
    (window as any).gameActions = {
      onKill: handleEnemyKill,
      onDamage: handlePlayerDamage,
      updateEnemyPositions: (data: EnemyData[]) => {
        setGameState(prev => ({ ...prev, enemies: data }));
      },
      setDriving: (driving: boolean) => {
        setGameState(prev => ({ ...prev, isDriving: driving }));
      },
      buyGrenades: () => {
        setGameState(prev => {
          if (prev.money >= GRENADE_COST && prev.grenades < MAX_GRENADES) {
            return { ...prev, money: prev.money - GRENADE_COST, grenades: Math.min(MAX_GRENADES, prev.grenades + 3) };
          }
          return prev;
        });
      },
      useThrowable: (type: ThrowableType) => {
        setGameState(prev => {
          return { ...prev, grenades: Math.max(0, prev.grenades - 1) };
        });
      },
      waterZones: WATER_ZONES,
      manualFire: () => {
        const weapon = document.querySelector('#weapon') as any;
        if (weapon?.components['weapon-controller']) weapon.components['weapon-controller'].fire();
      },
      manualGrenade: () => {
        const player = document.querySelector('#player') as any;
        if (player?.components['player-logic']) {
          if (gameState.grenades > 0) player.components['player-logic'].throwThrowable('GRENADE');
        }
      },
      getSelectedThrowable: () => 'GRENADE',
      switchWeapon: (direction: 'next' | 'prev') => handleWeaponSwitch(direction)
    };
  }, [handleEnemyKill, handlePlayerDamage, gameState.grenades, handleWeaponSwitch]);

  return (
    <div className="relative w-screen h-screen">
      <div className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 bg-red-900/30 ring-[60px] ring-inset ring-red-600/40 ${Date.now() - gameState.lastDamageTime < 500 ? 'opacity-100' : 'opacity-0'}`} />
      
      <HUD state={gameState} />

      {gameState.status !== GameStatus.PLAYING && (
        <Menu 
          status={gameState.status} 
          onStart={startGame} 
          onBackToMenu={backToMenu}
          score={gameState.score}
          message={aiMessage}
          selectedGun={gameState.selectedGun}
          onSelectGun={setGun}
          selectedMission={gameState.selectedMission}
          onSelectMission={setMission}
        />
      )}

      <a-scene 
        physics="debug: false; gravity: -9.8; friction: 0.1; restitution: 0.3"
        environment={`preset: ${missionConfig.envPreset}; dressingAmount: 500; groundColor: ${missionConfig.groundColor}; groundColor2: ${missionConfig.groundColor2}; dressingColor: ${lightingParams.dressingColor}; shadow: true; fog: ${lightingParams.fogDensity}; skyColor: ${lightingParams.skyColor}; lighting: none;`}
        renderer="antialias: true; colorManagement: true"
      >
        <a-plane static-body rotation="-90 0 0" width="1000" height="1000" visible="false"></a-plane>

        <a-entity 
          id="player" 
          position="0 1.6 0" 
          wasd-controls={`acceleration: ${gameState.isDriving ? 0 : 100}; enabled: ${!gameState.isDriving}`} 
          look-controls="pointerLockEnabled: true"
          kinematic-body="radius: 0.6"
          player-logic={`grenades: ${gameState.grenades}; selectedThrowable: GRENADE`}
          height-adjuster
          splash-controller
        >
          <a-entity camera position="0 0 0">
            <a-entity weather-system={`type: ${gameState.weather}`} position="0 0 0"></a-entity>

            <a-entity 
              id="weapon" 
              position="0.45 -0.45 -0.6" 
              rotation="5 175 10"
              weapon-controller={`gunType: ${gameState.selectedGun}; active: ${!gameState.isDriving}`}
              visible={!gameState.isDriving}
            >
              {gameState.selectedGun === GunType.RIFLE && (
                <a-entity>
                  <a-box width="0.06" height="0.1" depth="0.8" color="#2d3a22"></a-box>
                  <a-box width="0.04" height="0.14" depth="0.06" position="0 -0.1 0.3" color="#111" rotation="-10 0 0"></a-box>
                  <a-cylinder radius="0.02" height="0.2" position="0 0.08 -0.1" rotation="90 0 0" color="#333"></a-cylinder>
                </a-entity>
              )}
              {gameState.selectedGun === GunType.SMG && (
                <a-entity>
                  <a-box width="0.1" height="0.14" depth="0.4" color="#111"></a-box>
                  <a-box width="0.05" height="0.18" depth="0.06" position="0 -0.1 0.1" color="#000"></a-box>
                </a-entity>
              )}
              {gameState.selectedGun === GunType.MACHINE_GUN && (
                <a-entity>
                  <a-box width="0.12" height="0.16" depth="0.9" color="#1a1a1a"></a-box>
                  <a-box width="0.1" height="0.2" depth="0.3" position="0 -0.2 -0.1" color="#2d3a22"></a-box>
                  <a-cylinder radius="0.03" height="0.5" position="0 0.08 -0.4" rotation="90 0 0" color="#333"></a-cylinder>
                  <a-box width="0.06" height="0.2" depth="0.06" position="0 -0.15 0.3" color="#000" rotation="-5 0 0"></a-box>
                </a-entity>
              )}
              {gameState.selectedGun === GunType.SHOTGUN && (
                <a-entity>
                  <a-box width="0.1" height="0.1" depth="0.8" color="#3d2b1f"></a-box>
                  <a-cylinder radius="0.035" height="0.7" position="0 0.04 -0.15" rotation="90 0 0" color="#222"></a-cylinder>
                  <a-box width="0.09" height="0.08" depth="0.3" position="0 -0.05 -0.2" color="#111"></a-box>
                  <a-box width="0.06" height="0.15" depth="0.06" position="0 -0.1 0.35" color="#000"></a-box>
                </a-entity>
              )}
              {gameState.selectedGun === GunType.PISTOL && (
                <a-entity>
                  <a-box width="0.08" height="0.12" depth="0.5" color="#1a1a1a"></a-box>
                  <a-box width="0.06" height="0.18" depth="0.06" position="0 -0.12 0.18" color="#0a0a0a" rotation="-15 0 0"></a-box>
                </a-entity>
              )}
              {gameState.selectedGun === GunType.FLAMETHROWER && (
                <a-entity>
                  <a-box width="0.2" height="0.28" depth="0.65" color="#2a2a2a"></a-box>
                  <a-box width="0.22" height="0.18" depth="0.2" position="0 0.05 0.28" color="#333"></a-box>
                  <a-cylinder radius="0.09" height="0.5" rotation="0 0 0" position="0.14 -0.1 0.12" color="#b71c1c" material="roughness: 0.8; metalness: 0.2"></a-cylinder>
                  <a-cylinder radius="0.09" height="0.5" rotation="0 0 0" position="-0.14 -0.1 0.12" color="#b71c1c" material="roughness: 0.8; metalness: 0.2"></a-cylinder>
                  <a-cylinder radius="0.05" height="1.1" rotation="90 0 0" position="0 0.06 -0.5" color="#111"></a-cylinder>
                  <a-cylinder radius="0.065" height="0.65" rotation="90 0 0" position="0 0.06 -0.35" color="#1a1a1a" open-ended="true" opacity="0.95"></a-cylinder>
                  <a-box width="0.05" height="0.1" depth="0.15" position="0 0.15 -1.0" color="#444"></a-box>
                  <a-sphere radius="0.03" position="0 0.18 -1.05" color="#ff3300" material="emissive: #ff3300; emissiveIntensity: 2.5">
                    <a-light type="point" intensity="0.6" distance="1.2" color="#ff4500"></a-light>
                  </a-sphere>
                  <a-cylinder radius="0.015" height="0.5" rotation="50 0 0" position="0.1 0.12 -0.2" color="#555"></a-cylinder>
                  <a-cylinder radius="0.015" height="0.5" rotation="50 0 0" position="-0.1 0.12 -0.2" color="#555"></a-cylinder>
                  <a-box width="0.05" height="0.22" depth="0.08" position="0 -0.18 -0.55" color="#050505"></a-box>
                  <a-box width="0.06" height="0.28" depth="0.1" position="0 -0.25 0.18" rotation="-12 0 0" color="#000"></a-box>
                </a-entity>
              )}
              <a-entity id="muzzle-flash" visible="false" position="0 0.05 -0.35">
                <a-sphere radius="0.07" color="#ffcc00" material="emissive: #ffaa00; emissiveIntensity: 3"></a-sphere>
                <a-light type="point" intensity="1.5" distance="3" color="#ffaa00"></a-light>
              </a-entity>
            </a-entity>
          </a-entity>
          <a-entity class="splash-particles" position="0 -1.6 0"></a-entity>
        </a-entity>

        <a-entity light={`type: ambient; intensity: ${lightingParams.ambientIntensity}; color: ${lightingParams.sunColor}`}></a-entity>
        <a-entity 
          light={`type: directional; intensity: ${lightingParams.sunIntensity}; castShadow: true; shadowCameraFar: 80; color: ${lightingParams.sunColor}`} 
          position={lightingParams.sunPos}
        ></a-entity>

        <a-entity id="jeep" position="5 0.5 -5" vehicle-logic kinematic-body="radius: 1.5" height-adjuster splash-controller>
           <a-box width="1.8" height="0.8" depth="3.5" color="#3d5a2d" shadow></a-box>
           <a-box width="1.6" height="0.6" depth="1.5" position="0 0.6 -0.5" color="#2d3a22" shadow></a-box>
           <a-box width="1.5" height="0.6" depth="0.05" position="0 0.9 0.2" rotation="-20 0 0" color="#88ccff" opacity="0.4"></a-box>
           
           <a-cylinder radius="0.4" height="0.3" rotation="0 0 90" position="0.9 -0.3 1.2" color="#111"></a-cylinder>
           <a-cylinder radius="0.4" height="0.3" rotation="0 0 90" position="-0.9 -0.3 1.2" color="#111"></a-cylinder>
           <a-cylinder radius="0.4" height="0.3" rotation="0 0 90" position="0.9 -0.3 -1.2" color="#111"></a-cylinder>
           <a-cylinder radius="0.4" height="0.3" rotation="0 0 90" position="-0.9 -0.3 -1.2" color="#111"></a-cylinder>
           
           <a-entity visible={lightingParams.isNight}>
             <a-sphere radius="0.15" position="0.6 0.2 1.7" color="#ffffaa" material="emissive: #ffffaa; emissiveIntensity: 2"></a-sphere>
             <a-sphere radius="0.15" position="-0.6 0.2 1.7" color="#ffffaa" material="emissive: #ffffaa; emissiveIntensity: 2"></a-sphere>
             <a-light type="spot" intensity="2" distance="15" angle="45" position="0.6 0.2 1.8" rotation="0 180 0"></a-light>
             <a-light type="spot" intensity="2" distance="15" angle="45" position="-0.6 0.2 1.8" rotation="0 180 0"></a-light>
           </a-entity>
           <a-entity class="splash-particles" position="0 -0.5 0"></a-entity>
        </a-entity>

        <a-entity id="world">
          <a-entity>
            {WATER_ZONES.map(zone => (
              <a-circle key={zone.id} class="water-zone" position={`${zone.x} 0.01 ${zone.z}`} radius={zone.radius} rotation="-90 0 0" material="color: #0077ff; opacity: 0.6; transparent: true; emissive: #004488; emissiveIntensity: 0.5"></a-circle>
            ))}

            <a-entity position="8 0 -5" static-body>
                <a-box width="4" height="3" depth="4" color={missionConfig.houseColor} shadow></a-box>
                <a-cone radius-bottom="3.5" height="2" position="0 2.5 0" color={missionConfig.dressingColor} shadow></a-cone>
                <a-entity position="2.2 1.1 1.5">
                    <a-box width="0.8" height="2.2" depth="0.8" color="#d32f2f" shadow></a-box>
                    <a-box width="0.7" height="1.0" depth="0.1" position="0 0.3 0.41" color="#121212" material="opacity: 0.9; transparent: true; emissive: #111">
                      <a-text value="STRIKE AMMO" align="center" position="0 0.4 0.06" scale="0.3 0.3 0.3" color="#ffeb3b" font="monoid"></a-text>
                      <a-text value="GRENADES: $500 [Y]" align="center" position="0 0.2 0.06" scale="0.25 0.25 0.25" color="#fff"></a-text>
                    </a-box>
                </a-entity>
            </a-entity>

            <a-box position="3 0.5 -5" width="1" height="1" depth="1" color="#8B4513" shadow static-body></a-box>
            <a-entity position="0 -5 -60"><a-cone class="mountain" radius-bottom="40" height="30" color={missionConfig.dressingColor} shadow static-body></a-cone></a-entity>
            <a-entity position="40 -5 -50"><a-cone class="mountain" radius-bottom="35" height="25" color={missionConfig.dressingColor} shadow static-body></a-cone></a-entity>
            <a-entity position="-50 -5 -40"><a-cone class="mountain" radius-bottom="45" height="35" color={missionConfig.dressingColor} shadow static-body></a-cone></a-entity>
            <a-entity position="-20 -5 40"><a-cone class="mountain" radius-bottom="30" height="20" color={missionConfig.dressingColor} shadow static-body></a-cone></a-entity>
            <a-entity position="60 -5 20"><a-cone class="mountain" radius-bottom="35" height="25" color={missionConfig.dressingColor} shadow static-body></a-cone></a-entity>
          </a-entity>
        </a-entity>
        <a-entity enemy-manager></a-entity>
      </a-scene>
    </div>
  );
};

export default App;

if (typeof AFRAME !== 'undefined') {
  if (!AFRAME.components['height-adjuster']) {
    AFRAME.registerComponent('height-adjuster', {
      init: function () {
        this.raycaster = new THREE.Raycaster();
        this.down = new THREE.Vector3(0, -1, 0);
        this.groundMesh = null;
      },
      tick: function () {
        if (!this.groundMesh) {
          const ground = this.el.sceneEl.querySelector('.environmentGround');
          if (ground) this.groundMesh = ground.object3D;
          return;
        }
        const pos = this.el.object3D.position;
        this.raycaster.set(new THREE.Vector3(pos.x, pos.y + 5, pos.z), this.down);
        const intersects = this.raycaster.intersectObject(this.groundMesh, true);
        if (intersects.length > 0) {
          const groundY = intersects[0].point.y;
          const targetY = groundY + (this.el.id === 'player' ? 1.6 : 0.5);
          pos.y = THREE.MathUtils.lerp(pos.y, targetY, 0.1);
        }
      }
    });
  }

  if (!AFRAME.components['player-logic']) {
    AFRAME.registerComponent('player-logic', {
      schema: { 
        grenades: { type: 'number', default: 0 },
        selectedThrowable: { type: 'string', default: 'GRENADE' }
      },
      init: function() {
        this.lastActionTime = 0;
        window.addEventListener('keydown', (e) => {
          const now = Date.now();
          if (now - this.lastActionTime < 100) return;
          this.lastActionTime = now;

          if (e.code === 'KeyE') {
            const jeep = document.querySelector('#jeep') as any;
            if (jeep) {
              const dist = (this.el as any).object3D.position.distanceTo(jeep.object3D.position);
              if (dist < 4) jeep.emit('toggle-vehicle');
            }
          }
          
          const vendingPos = new THREE.Vector3(10.2, 0, -3.5);
          const nearVending = (this.el as any).object3D.position.distanceTo(vendingPos) < 4;

          if (nearVending) {
            if (e.code === 'KeyY') (window as any).gameActions?.buyGrenades();
          }

          if (e.code === 'KeyG') {
            const count = this.data.grenades;
            if (count > 0) this.throwThrowable('GRENADE');
          }
        });

        window.addEventListener('wheel', (e) => {
          if ((window as any).gameActions?.switchWeapon) {
            const direction = e.deltaY > 0 ? 'next' : 'prev';
            (window as any).gameActions.switchWeapon(direction);
          }
        });
      },
      throwThrowable: function(type: ThrowableType) {
        (window as any).gameActions?.useThrowable(type);
        const playerPos = this.el.object3D.position.clone();
        const camera = document.querySelector('[camera]') as any;
        if (!camera) return;
        const direction = new THREE.Vector3();
        camera.object3D.getWorldDirection(direction);
        direction.multiplyScalar(-1);
        
        const throwable = document.createElement('a-entity') as any;
        throwable.setAttribute('position', `${playerPos.x} ${playerPos.y} ${playerPos.z}`);
        throwable.setAttribute('dynamic-body', 'shape: sphere; sphereRadius: 0.2; mass: 2');
        
        throwable.setAttribute('grenade-logic', '');
        const body = document.createElement('a-cylinder');
        body.setAttribute('radius', '0.08'); body.setAttribute('height', '0.18');
        body.setAttribute('color', '#2e4a1d'); throwable.appendChild(body);
        
        this.el.sceneEl.appendChild(throwable);
        setTimeout(() => {
          if (throwable.body) {
            throwable.body.velocity.set(direction.x * 18, direction.y * 18 + 4, direction.z * 18);
            throwable.body.angularVelocity.set(Math.random() * 5, Math.random() * 5, Math.random() * 5);
          }
        }, 0);
      }
    });
  }

  if (!AFRAME.components['weapon-controller']) {
    AFRAME.registerComponent('weapon-controller', {
      schema: { gunType: { type: 'string', default: 'PISTOL' }, active: { type: 'boolean', default: true } },
      init: function () {
        this.isFiring = false;
        this.isMouseDown = false;
        this.lastShotTime = 0;
        this.muzzleFlash = this.el.sceneEl.querySelector('#muzzle-flash');
        
        window.addEventListener('mousedown', (e) => {
          if (e.button === 0 && this.data.active) {
            this.isMouseDown = true;
            if (!WEAPON_DATA[this.data.gunType]?.automatic) this.fire();
          }
        });
        window.addEventListener('mouseup', (e) => { if (e.button === 0) this.isMouseDown = false; });
      },
      tick: function(time: number) {
        if (this.isMouseDown && this.data.active) {
          const weapon = WEAPON_DATA[this.data.gunType];
          if (this.data.gunType === GunType.FLAMETHROWER) {
             this.fireContinuous(time);
          } else if (weapon?.automatic && time - this.lastShotTime > weapon.cooldown) {
             this.lastShotTime = time;
             this.fire();
          }
        }
      },
      fireContinuous: function(time: number) {
        const weapon = WEAPON_DATA[GunType.FLAMETHROWER];
        if (time - (this.lastFlameTime || 0) < weapon.cooldown) return;
        this.lastFlameTime = time;
        playShotSound(GunType.FLAMETHROWER);
        
        const camera = this.el.sceneEl.querySelector('[camera]') as any;
        if (!camera) return;
        const direction = new THREE.Vector3();
        camera.object3D.getWorldDirection(direction).multiplyScalar(-1);
        const origin = camera.object3D.getWorldPosition(new THREE.Vector3());
        
        document.querySelectorAll('[enemy-logic]').forEach((enemyEl: any) => {
          const toEnemy = enemyEl.object3D.position.clone().sub(origin);
          if (toEnemy.length() < 9 && toEnemy.normalize().dot(direction) > 0.75) {
            enemyEl.emit('hit-flame', { damage: weapon.damage });
          }
        });
      },
      fire: function () {
        if (this.data.gunType === GunType.FLAMETHROWER) return;
        const weapon = WEAPON_DATA[this.data.gunType];
        if (!weapon?.automatic && this.isFiring) return;
        this.isFiring = true;
        playShotSound(this.data.gunType as GunType);
        
        const recoilAmt = (weapon.recoil || 0.1) * 0.1;
        this.el.setAttribute('animation', { 
          property: 'position', to: `${0.45} ${-0.45 + recoilAmt} ${-0.6 + (weapon.recoil || 0.1) * 0.5}`, 
          dur: (weapon.recoilDuration || 60) / 2, dir: 'alternate', loop: 1, easing: 'easeOutQuad' 
        });

        if (this.muzzleFlash) {
          this.muzzleFlash.setAttribute('visible', 'true');
          const flashSphere = this.muzzleFlash.querySelector('a-sphere');
          if (flashSphere) flashSphere.setAttribute('radius', String(weapon.muzzleScale || 0.07));
          setTimeout(() => this.muzzleFlash.setAttribute('visible', 'false'), 50);
        }

        const camera = this.el.sceneEl.querySelector('[camera]') as any;
        if (!camera) return;
        const direction = new THREE.Vector3();
        camera.object3D.getWorldDirection(direction).multiplyScalar(-1);
        const origin = camera.object3D.getWorldPosition(new THREE.Vector3());
        const raycaster = new THREE.Raycaster();
        const enemies = Array.from(document.querySelectorAll('[enemy-logic]')).map((e: any) => e.object3D);

        const shoot = (dir: any) => {
          raycaster.set(origin, dir);
          const hit = raycaster.intersectObjects(enemies, true)[0];
          if (hit) {
            let root = hit.object;
            while (root.parent && !root.el) root = root.parent;
            if (root.el) root.el.emit('hit', { damage: weapon.damage });
          }
        };

        if (this.data.gunType === GunType.SHOTGUN) {
          for (let i = 0; i < (weapon.pellets || 8); i++) {
            const sDir = direction.clone();
            sDir.x += (Math.random()-0.5)*weapon.spread; sDir.y += (Math.random()-0.5)*weapon.spread; sDir.z += (Math.random()-0.5)*weapon.spread;
            shoot(sDir.normalize());
          }
        } else {
          const sDir = direction.clone();
          sDir.x += (Math.random()-0.5)*weapon.spread; sDir.y += (Math.random()-0.5)*weapon.spread; sDir.z += (Math.random()-0.5)*weapon.spread;
          shoot(sDir.normalize());
        }
        if (!weapon.automatic) setTimeout(() => { this.isFiring = false; }, weapon.cooldown); else this.isFiring = false;
      }
    });
  }

  if (!AFRAME.components['enemy-logic']) {
    AFRAME.registerComponent('enemy-logic', {
      init: function () {
        this.health = 100; 
        this.moveSpeed = 4.2; 
        this.attackRange = 2.5;
        this.attackCooldown = 1500;
        this.lastAttackTime = 0;
        this.raycaster = new THREE.Raycaster();
        this.down = new THREE.Vector3(0, -1, 0); 
        this.groundMesh = null;
        this.removed = false;
        this.el.addEventListener('hit', (e: any) => { this.health -= (e.detail?.damage || 50); this.checkDeath(); });
        this.el.addEventListener('hit-flame', (e: any) => { this.health -= (e.detail?.damage || 5); this.checkDeath(); });
      },
      checkDeath: function() {
        if (this.health <= 0 && !this.removed) {
          this.removed = true; 
          (window as any).gameActions?.onKill(this.el.id); 
          this.el.parentNode?.removeChild(this.el);
        }
      },
      performAttack: function(player: any) {
        this.lastAttackTime = Date.now();
        const visual = this.el.querySelector('a-octahedron');
        if (visual) {
          visual.setAttribute('animation', {
            property: 'scale',
            from: '1 1 1',
            to: '1.8 1.8 1.8',
            dur: 200,
            dir: 'alternate',
            loop: 1,
            easing: 'easeInQuad'
          });
          visual.setAttribute('material', 'color', '#ffffff');
          setTimeout(() => visual.setAttribute('material', 'color', '#ff3333'), 400);
        }
        
        // Lunge logic
        if (this.el.body) {
           const playerPos = player.object3D.position;
           const currentPos = this.el.object3D.position;
           const lungeDir = new THREE.Vector3().subVectors(playerPos, currentPos).normalize();
           this.el.body.velocity.x += lungeDir.x * 10;
           this.el.body.velocity.z += lungeDir.z * 10;
        }

        (window as any).gameActions?.onDamage(10);
      },
      tick: function () {
        if (this.removed) return;
        if (!this.groundMesh) {
          const ground = this.el.sceneEl.querySelector('.environmentGround');
          if (ground) this.groundMesh = ground.object3D;
          return;
        }

        const currentPos = this.el.object3D.position;
        const player = document.querySelector('#player') as any;
        if (!player) return;
        const targetPos = player.object3D.position;
        const distToPlayer = currentPos.distanceTo(targetPos);

        // Attack Logic
        if (distToPlayer < this.attackRange && Date.now() - this.lastAttackTime > this.attackCooldown) {
          this.performAttack(player);
        }

        // VEHICLE COLLISION LOGIC
        const jeep = document.querySelector('#jeep') as any;
        if (jeep) {
          const distToJeep = currentPos.distanceTo(jeep.object3D.position);
          if (distToJeep < 2.2) { 
            this.removed = true;
            (window as any).gameActions?.onKill(this.el.id);
            const crash = document.createElement('a-entity');
            crash.setAttribute('geometry', 'primitive: sphere; radius: 0.6');
            crash.setAttribute('material', 'color: #ff5500; emissive: #ff5500; emissiveIntensity: 3');
            crash.setAttribute('position', `${currentPos.x} ${currentPos.y} ${currentPos.z}`);
            crash.setAttribute('animation', 'property: scale; to: 2.5 2.5 2.5; dur: 250; easing: easeOutQuad');
            crash.setAttribute('animation__opacity', 'property: material.opacity; to: 0; dur: 250; easing: easeOutQuad');
            this.el.sceneEl.appendChild(crash);
            setTimeout(() => crash.parentNode?.removeChild(crash), 250);
            this.el.parentNode?.removeChild(this.el);
            return;
          }
        }

        const dir = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
        dir.y = 0;

        const ahead = currentPos.clone().add(dir.clone().multiplyScalar(1.2));
        this.raycaster.set(new THREE.Vector3(ahead.x, 10, ahead.z), this.down);
        const hit = this.raycaster.intersectObject(this.groundMesh, true)[0];
        
        let canMove = true;
        document.querySelectorAll('.mountain').forEach((mtn: any) => {
          const mPos = mtn.object3D.getWorldPosition(new THREE.Vector3());
          const radius = parseFloat(mtn.getAttribute('radius-bottom') || '1');
          if (currentPos.distanceTo(mPos) < radius + 1.2) canMove = false;
        });

        if (canMove) {
          if (this.el.body) {
            this.el.body.velocity.x = dir.x * this.moveSpeed;
            this.el.body.velocity.z = dir.z * this.moveSpeed;
          } else {
            this.el.object3D.position.addScaledVector(dir, this.moveSpeed * 0.016);
          }
          this.el.object3D.lookAt(targetPos.x, currentPos.y, targetPos.z);
        } else if (this.el.body) {
          const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
          this.el.body.velocity.x = sideDir.x * this.moveSpeed * 0.5;
          this.el.body.velocity.z = sideDir.z * this.moveSpeed * 0.5;
        }
      }
    });
  }

  if (!AFRAME.components['enemy-manager']) {
    AFRAME.registerComponent('enemy-manager', {
      init: function () { this.spawnTimer = 0; },
      tick: function (time: number, delta: number) {
        this.spawnTimer += delta;
        if (Math.floor(time / 100) > (this.lastRadarUpdate || 0)) {
          this.lastRadarUpdate = Math.floor(time / 100);
          const data: EnemyData[] = [];
          document.querySelectorAll('[enemy-logic]').forEach((el: any) => {
            data.push({ id: el.id, position: { x: el.object3D.position.x, y: el.object3D.position.y, z: el.object3D.position.z }, health: 100 });
          });
          (window as any).gameActions?.updateEnemyPositions(data);
        }
        if (this.spawnTimer > ENEMY_SPAWN_RATE) { this.spawnTimer = 0; this.spawnEnemy(); }
      },
      spawnEnemy: function () {
        const player = document.querySelector('#player') as any;
        if (!player) return;
        
        const dist = 30 + Math.random() * 15;
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(player.object3D.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const behind = forward.clone().negate();
        const spreadAngle = (Math.random() - 0.5) * (Math.PI / 2); // 90 degree arc behind
        const axis = new THREE.Vector3(0, 1, 0);
        behind.applyAxisAngle(axis, spreadAngle);
        
        const spawnX = player.object3D.position.x + behind.x * dist;
        const spawnZ = player.object3D.position.z + behind.z * dist;

        const enemy = document.createElement('a-entity');
        enemy.setAttribute('id', 'enemy-' + Date.now() + '-' + Math.floor(Math.random()*1000));
        enemy.setAttribute('enemy-logic', '');
        enemy.setAttribute('position', `${spawnX} 0.5 ${spawnZ}`);
        enemy.setAttribute('dynamic-body', 'shape: sphere; sphereRadius: 0.6; mass: 5; linearDamping: 0.01');
        
        const body = document.createElement('a-octahedron');
        body.setAttribute('radius', '0.6'); body.setAttribute('color', '#ff3333');
        enemy.appendChild(body);
        
        this.el.appendChild(enemy);
      }
    });
  }

  if (!AFRAME.components['grenade-logic']) {
    AFRAME.registerComponent('grenade-logic', {
      init: function() { this.timer = 2000; },
      tick: function(time: number, delta: number) { this.timer -= delta; if (this.timer <= 0) this.explode(); },
      explode: function() {
        const pos = this.el.object3D.position;
        const explosion = document.createElement('a-entity');
        explosion.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
        explosion.setAttribute('material', 'color: #ff9800; opacity: 0.8; transparent: true');
        explosion.setAttribute('position', pos);
        explosion.setAttribute('animation', 'property: geometry.radius; to: 6; dur: 400; easing: easeOutQuad');
        explosion.setAttribute('animation__opacity', 'property: material.opacity; to: 0; dur: 400; easing: easeOutQuad');
        this.el.sceneEl.appendChild(explosion);
        playExplosionSound();
        document.querySelectorAll('[enemy-logic]').forEach((enemyEl: any) => {
          if (enemyEl.object3D.position.distanceTo(pos) < 8.0) {
            (window as any).gameActions?.onKill(enemyEl.id);
            enemyEl.parentNode.removeChild(enemyEl);
          }
        });
        this.el.parentNode?.removeChild(this.el);
        setTimeout(() => explosion.parentNode?.removeChild(explosion), 400);
      }
    });
  }

  if (!AFRAME.components['splash-controller']) {
    AFRAME.registerComponent('splash-controller', {
      init: function() {
        this.particles = [];
        const container = this.el.querySelector('.splash-particles');
        for (let i = 0; i < 15; i++) {
          const p = document.createElement('a-sphere'); p.setAttribute('radius', '0.05'); p.setAttribute('visible', 'false');
          container?.appendChild(p);
          this.particles.push({ el: p, vel: new THREE.Vector3(), active: false });
        }
      },
      tick: function(time: number) {
        let inWater = false;
        const pos = this.el.object3D.position;
        document.querySelectorAll('.water-zone').forEach((zone: any) => {
          if (new THREE.Vector2(pos.x - zone.object3D.position.x, pos.z - zone.object3D.position.z).length() < parseFloat(zone.getAttribute('radius') || '0')) inWater = true;
        });
        if (inWater && time - (this.lastSplash || 0) > 100) {
          this.lastSplash = time;
          const inactive = this.particles.filter((p:any) => !p.active).slice(0, 3);
          inactive.forEach((p:any) => {
            p.active = true; p.el.setAttribute('visible', 'true'); p.el.setAttribute('position', '0 0 0');
            p.vel.set((Math.random()-0.5)*0.1, 0.2 + Math.random()*0.1, (Math.random()-0.5)*0.1);
          });
        }
        this.particles.forEach((p:any) => {
          if (!p.active) return;
          const current:any = p.el.getAttribute('position');
          current.x += p.vel.x; current.y += p.vel.y; current.z += p.vel.z; p.vel.y -= 0.01;
          p.el.setAttribute('position', current);
          if (current.y < -0.5) { p.active = false; p.el.setAttribute('visible', 'false'); }
        });
      }
    });
  }

  if (!AFRAME.components['weather-system']) {
    AFRAME.registerComponent('weather-system', {
      schema: { type: { type: 'string', default: 'CLEAR' } },
      init: function () {
        this.parts = [];
        for (let i = 0; i < 150; i++) {
          const p = document.createElement('a-entity');
          p.setAttribute('position', `${(Math.random()-0.5)*40} ${Math.random()*20+5} ${(Math.random()-0.5)*40}`);
          this.el.appendChild(p); this.parts.push(p);
        }
      },
      update: function () {
        this.parts.forEach((p:any) => {
          if (this.data.type === 'RAIN') { p.setAttribute('geometry', 'primitive: box; width: 0.02; height: 0.5; depth: 0.02'); p.setAttribute('material', 'color: #88ccff; opacity: 0.5'); }
          else if (this.data.type === 'SNOW') { p.setAttribute('geometry', 'primitive: sphere; radius: 0.05'); p.setAttribute('material', 'color: #fff'); }
          p.setAttribute('visible', this.data.type !== 'CLEAR');
        });
      },
      tick: function () {
        if (this.data.type === 'CLEAR') return;
        this.parts.forEach((p:any) => {
          const pos = p.getAttribute('position');
          pos.y -= this.data.type === 'RAIN' ? 0.3 : 0.05;
          if (pos.y < -2) pos.y = 20;
          p.setAttribute('position', pos);
        });
      }
    });
  }

  if (!AFRAME.components['vehicle-logic']) {
    AFRAME.registerComponent('vehicle-logic', {
      init: function () {
        this.speed = 0; this.max = 0.5; this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        this.el.addEventListener('toggle-vehicle', () => {
          this.isDriving = !this.isDriving; (window as any).gameActions?.setDriving(this.isDriving);
          const p = document.querySelector('#player') as any;
          if (this.isDriving) { p.setAttribute('wasd-controls', 'enabled: false'); p.removeAttribute('kinematic-body'); }
          else { p.setAttribute('wasd-controls', 'enabled: true'); p.setAttribute('kinematic-body', 'radius: 0.6'); p.object3D.position.x -= 3; }
        });
      },
      tick: function (time: number, delta: number) {
        const p = document.querySelector('#player') as any;
        if (this.isDriving && p) {
          if (this.keys['KeyW']) this.speed += 0.01; if (this.keys['KeyS']) this.speed -= 0.01;
          this.speed *= 0.98; this.speed = Math.max(-0.25, Math.min(this.speed, this.max));
          if (Math.abs(this.speed) > 0.01) {
            const rot = (this.speed > 0 ? 1 : -1) * (delta/1000);
            if (this.keys['KeyA']) this.el.object3D.rotation.y += rot; if (this.keys['KeyD']) this.el.object3D.rotation.y -= rot;
          }
          const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.el.object3D.quaternion);
          this.el.object3D.position.addScaledVector(dir, this.speed);
          const seat = this.el.object3D.position.clone(); seat.y += 1.2; p.object3D.position.copy(seat);
        }
      }
    });
  }
}
