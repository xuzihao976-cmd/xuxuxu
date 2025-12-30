
import React from 'react';
import { GameStats } from '../types';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onExit: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart, onExit }) => {
  const isVictory = stats.gameResult === 'victory';
  
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-6 animate-fade-in">
      <div className={`w-full max-w-md border-2 rounded-lg p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center relative overflow-hidden flex flex-col gap-4 ${
          isVictory 
          ? 'border-yellow-600 bg-yellow-900/10' 
          : 'border-red-900 bg-red-900/10'
      }`}>
        
        {/* Background Effect */}
        <div className={`absolute inset-0 opacity-10 pointer-events-none ${isVictory ? 'bg-yellow-500' : 'bg-red-500'}`}></div>

        <div className="text-6xl mb-2 filter drop-shadow-lg animate-bounce-slow">
            {isVictory ? '🎖️' : '🕯️'}
        </div>
        
        <div>
            <h2 className={`text-3xl font-bold font-serif tracking-[0.2em] mb-1 ${isVictory ? 'text-yellow-500' : 'text-red-500'}`}>
                {isVictory ? '四行孤军' : '壮烈殉国'}
            </h2>
            <div className="text-sm font-mono text-neutral-400 uppercase tracking-widest border-t border-white/10 pt-2 inline-block px-4">
                {isVictory ? '永垂不朽 · GLORY TO HEROES' : '魂归中华 · MISSION FAILED'}
            </div>
        </div>
        
        {/* Stats Grid */}
        <div className="bg-black/50 p-4 rounded border border-white/10 grid grid-cols-2 gap-y-3 gap-x-6 text-sm font-mono text-left mt-2">
            <div className="text-neutral-500 text-right text-xs">最终存活</div>
            <div className="text-white font-bold">{stats.soldiers} 人</div>
            
            <div className="text-neutral-500 text-right text-xs">坚守时长</div>
            <div className="text-white font-bold">{stats.day} 天</div>

            <div className="text-neutral-500 text-right text-xs">历史评价</div>
            <div className="text-amber-500 font-bold">{stats.finalRank || '无名英雄'}</div>

            <div className="text-neutral-500 text-right text-xs">击毙日军</div>
            <div className="text-red-500 font-bold">{stats.enemiesKilled || 0} 人</div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-4 z-10">
            <button 
                onClick={onRestart} 
                className="w-full py-3 bg-neutral-100 hover:bg-white text-black font-bold tracking-widest rounded shadow-lg transition-transform active:scale-95"
            >
                再次挑战
            </button>
            <button 
                onClick={onExit} 
                className="w-full py-3 bg-transparent border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 rounded transition-colors"
            >
                返回主菜单
            </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
