import React, { useMemo } from 'react';

// 0: Stay, 1: Up, 2: Down, 3: Basic, 4: Medium, 5: Special
interface BattleArenaProps {
  replayStep: number;
  p1Moves: number[];
  p2Moves: number[];
  p1Name: string;
  p2Name: string;
  isReplaying: boolean;
  isReversePerspective?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ replayStep, p1Moves, p2Moves, p1Name, p2Name, isReplaying, isReversePerspective = false }) => {
  // Compute heights for P1 and P2
  const getPlayerHeight = (moves: number[], step: number) => {
    let position = 'Ground';
    for (let i = 0; i <= step; i++) {
        const move = moves[i];
        if (move === 1) position = 'Up';
        if (move === 2) position = 'Ground';
    }
    return position;
  };

  const p1Position = getPlayerHeight(p1Moves, replayStep);
  const p2Position = getPlayerHeight(p2Moves, replayStep);

  // Derive projectile type visuals
  const getProjectileStyle = (type: number, owner: 'p1' | 'p2') => {
      const isP1 = owner === 'p1';
      if (type === 3) {
          // Basic Attack (Blue for P1, Red for P2)
          return `w-6 h-6 rounded-full bg-gradient-to-r ${isP1 ? 'from-blue-400 to-cyan-300 shadow-[0_0_15px_#38bdf8]' : 'from-red-400 to-orange-300 shadow-[0_0_15px_#f87171]'}`;
      }
      if (type === 4) {
          // Medium Attack
          return `w-12 h-6 rounded-full bg-gradient-to-r ${isP1 ? 'from-purple-500 to-pink-500 shadow-[0_0_20px_#d946ef]' : 'from-yellow-500 to-orange-500 shadow-[0_0_20px_#f59e0b]'}`;
      }
      if (type === 5) {
          // Special Attack (Beam)
          return `w-32 h-16 rounded-xl bg-gradient-to-r ${isP1 ? 'from-indigo-600 to-blue-400 shadow-[0_0_30px_#6366f1]' : 'from-rose-600 to-red-400 shadow-[0_0_30px_#e11d48]'}`;
      }
      return '';
  };

  // Extract active attacks that should traverse the screen right NOW
  const getActiveProjectiles = () => {
    if (!isReplaying) return [];
    
    const act = [];
    if (p1Moves[replayStep] >= 3) {
      act.push({ id: `p1_${replayStep}`, owner: 'p1', type: p1Moves[replayStep], lane: getPlayerHeight(p1Moves, replayStep) });
    }
    if (p2Moves[replayStep] >= 3) {
      act.push({ id: `p2_${replayStep}`, owner: 'p2', type: p2Moves[replayStep], lane: getPlayerHeight(p2Moves, replayStep) });
    }
    return act;
  };

  const projectiles = useMemo(() => getActiveProjectiles(), [replayStep, p1Moves, p2Moves, isReplaying]);

  const leftName = isReversePerspective ? p2Name : p1Name;
  const rightName = isReversePerspective ? p1Name : p2Name;
  const leftPosition = isReversePerspective ? p2Position : p1Position;
  const rightPosition = isReversePerspective ? p1Position : p2Position;

  return (
    <div className="w-full h-96 bg-neutral-900 rounded-b-3xl border-2 border-t-0 border-primary/30 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] flex">
      {/* Background Styling */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#110e24] via-[#1f193d] to-[#0f0b1a] opacity-90" />
      
      {/* Grid / Lanes */}
      <div className="absolute top-1/3 left-0 w-full h-[2px] bg-primary/20 shadow-[0_0_10px_var(--tw-colors-primary)] border-b border-primary/10 border-dashed" />
      <div className="absolute bottom-1/3 left-0 w-full h-[2px] bg-secondary/20 shadow-[0_0_10px_var(--tw-colors-secondary)] border-b border-secondary/10 border-dashed" />

      {/* Players */}
      <div 
        className="absolute left-[8%] transition-all duration-300 ease-in-out z-10 flex flex-col items-center"
        style={{ top: leftPosition === 'Up' ? '15%' : '50%' }}
      >
         <div className="text-sm font-bold text-blue-300 mb-2 drop-shadow-lg tracking-widest w-max bg-black/60 px-3 py-1 rounded-full">{leftName}</div>
         <div className="w-24 h-24 rounded-full bg-blue-900/40 border-[3px] border-blue-400 flex items-center justify-center shadow-[0_0_25px_#3b82f6] relative">
             <span className="text-5xl drop-shadow-md">🧙‍♂️</span>
             {/* Character Aura */}
             <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-md animate-pulse" />
         </div>
      </div>

      <div 
        className="absolute right-[8%] transition-all duration-300 ease-in-out z-10 flex flex-col items-center"
        style={{ top: rightPosition === 'Up' ? '15%' : '50%' }}
      >
         <div className="text-sm font-bold text-red-300 mb-2 drop-shadow-lg tracking-widest w-max bg-black/60 px-3 py-1 rounded-full">{rightName}</div>
         <div className="w-24 h-24 rounded-full bg-red-900/40 border-[3px] border-red-500 flex items-center justify-center shadow-[0_0_25px_#ef4444] transform -scale-x-100 relative">
             <span className="text-5xl drop-shadow-md pb-2">👺</span>
             {/* Character Aura */}
             <div className="absolute inset-0 rounded-full bg-red-500/20 blur-md animate-pulse" />
         </div>
      </div>

      {/* Projectiles */}
      {projectiles.map((p) => {
          const isLeftShooter = isReversePerspective ? p.owner === 'p2' : p.owner === 'p1';
          const styleConfig = isLeftShooter 
              ? { animation: 'travelRight 1s linear forwards', top: p.lane === 'Up' ? '25%' : '60%' }
              : { animation: 'travelLeft 1s linear forwards', top: p.lane === 'Up' ? '25%' : '60%' };
          
          return (
             <div 
                 key={p.id}
                 className={`absolute z-0 flex items-center justify-center ${getProjectileStyle(p.type, p.owner as 'p1'|'p2')}`}
                 style={styleConfig}
             />
          );
      })}

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes travelRight {
           0% { left: 15%; opacity: 0; transform: scale(0.5); }
           5% { opacity: 1; transform: scale(1); }
           95% { opacity: 1; transform: scale(1); }
           100% { left: 85%; opacity: 0; transform: scale(2); }
        }
        @keyframes travelLeft {
           0% { right: 15%; opacity: 0; transform: scale(0.5); }
           5% { opacity: 1; transform: scale(1); }
           95% { opacity: 1; transform: scale(1); }
           100% { right: 85%; opacity: 0; transform: scale(2); }
        }
      `}} />
      
      {/* Title Overlay */}
      <div className="absolute top-6 w-full text-center z-20 pointer-events-none">
          <div className="inline-block bg-black/80 backdrop-blur-sm px-8 py-2 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
             <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-[0_2px_2px_rgba(0,0,0,1)] tracking-[0.2em] uppercase">
               {isReplaying ? `FRAME ${replayStep + 1}` : 'AWAITING MOVES'}
             </h3>
          </div>
      </div>
    </div>
  );
};
