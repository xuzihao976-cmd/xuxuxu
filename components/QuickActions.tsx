
import React from 'react';
import { GameStats } from '../types';

interface QuickActionsProps {
  onAction: (cmd: string) => void;
  disabled: boolean;
  stats: GameStats;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, disabled, stats }) => {
  const actions = [
    { label: '🛠️ 加固', cmd: `加固${stats.location}`, color: 'border-neutral-600 text-neutral-300' },
    { label: '🚑 救治', cmd: '治疗伤员', color: 'border-green-800 text-green-500' },
    { label: '💤 休息', cmd: '休息整顿', color: 'border-blue-800 text-blue-400' },
    { label: '📣 演讲', cmd: '演讲鼓舞', color: 'border-amber-800 text-amber-500' },
    { label: '🌙 夜袭', cmd: '火力突袭', color: 'border-purple-900 text-purple-400' }, 
  ];

  return (
    <div className="flex gap-1 w-full px-1 pb-2">
      {actions.map((act) => (
        <button
            key={act.label}
            onClick={() => onAction(act.cmd)}
            disabled={disabled}
            className={`flex-1 min-w-0 flex items-center justify-center whitespace-nowrap px-1 py-1.5 rounded border bg-neutral-900/80 hover:bg-neutral-800 text-[10px] sm:text-xs font-mono transition-colors active:scale-95 disabled:opacity-50 ${act.color}`}
        >
            {act.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
