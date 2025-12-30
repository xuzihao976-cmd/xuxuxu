
import React from 'react';

interface StartScreenProps {
  onNewGame: () => void;
  onOpenLoadMenu: () => void;
  hasSaves: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({ onNewGame, onOpenLoadMenu, hasSaves }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#050505] text-[#e5e5e5] p-6 relative overflow-hidden">
      {/* Atmospheric Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-10 left-0 w-full h-32 bg-gradient-to-b from-red-900/10 to-transparent pointer-events-none"></div>
      
      {/* Title Section */}
      <div className="z-10 text-center mb-16 animate-fade-in">
        <div className="text-red-700 text-xs tracking-[0.5em] mb-2 font-bold uppercase">
            一九三七 · 上海
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold font-serif text-neutral-200 tracking-wider mb-2 drop-shadow-2xl">
          孤军
        </h1>
        <h2 className="text-2xl sm:text-3xl font-serif text-neutral-400 tracking-widest border-t border-neutral-800 pt-4 mt-2">
          四行仓库
        </h2>
        <div className="mt-6 text-sm text-neutral-600 font-mono">
            八百壮士 · 民族之魂
        </div>
      </div>

      {/* Action Buttons */}
      <div className="z-10 flex flex-col gap-4 w-full max-w-xs">
        
        <button
          onClick={onNewGame}
          className="w-full py-4 bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 hover:border-red-600 text-neutral-200 font-bold tracking-widest transition-all duration-300 shadow-lg transform hover:scale-[1.02] active:scale-95 relative overflow-hidden"
        >
          <span className="relative z-10">开始新战役</span>
        </button>

        <button
          onClick={onOpenLoadMenu}
          disabled={!hasSaves}
          className={`w-full py-3 bg-neutral-800 border border-neutral-600 text-amber-500 font-bold tracking-widest transition-all duration-300 shadow-lg flex flex-col items-center gap-1 ${hasSaves ? 'hover:bg-neutral-700 hover:border-amber-600 transform hover:scale-[1.02] active:scale-95' : 'opacity-50 cursor-not-allowed grayscale'}`}
        >
            <span>读取作战记录</span>
        </button>

        <div className="text-[10px] text-neutral-600 text-center mt-8 font-mono leading-relaxed">
            建议佩戴耳机体验沉浸式音效（脑补）<br/>
            v1.3.2 | 支持 50 个存档位
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 text-[10px] text-neutral-700 font-mono">
        &copy; 2024 孤军项目组
      </div>
    </div>
  );
};

export default StartScreen;
