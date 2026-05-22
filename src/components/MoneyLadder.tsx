import React from 'react';
import { Award, ShieldAlert } from 'lucide-react';

interface MoneyLadderProps {
  currentLevelIndex: number; // 0 to 14
}

export const LADDER_VALUES = [
  { level: 15, value: '₹1 Crore', amount: 10000000, milestone: true },
  { level: 14, value: '₹75,00000', amount: 7500000, milestone: false },
  { level: 13, value: '₹50,00000', amount: 5000000, milestone: false },
  { level: 12, value: '₹25,00000', amount: 2500000, milestone: false },
  { level: 11, value: '₹12,50,000', amount: 1250000, milestone: false },
  { level: 10, value: '₹6,40,000', amount: 640000, milestone: true },
  { level: 9, value: '₹3,20,000', amount: 320000, milestone: false },
  { level: 8, value: '₹1,60,000', amount: 160000, milestone: false },
  { level: 7, value: '₹80,000', amount: 80000, milestone: false },
  { level: 6, value: '₹40,000', amount: 40000, milestone: false },
  { level: 5, value: '₹20,000', amount: 20000, milestone: true },
  { level: 4, value: '₹10,000', amount: 10000, milestone: false },
  { level: 3, value: '₹5,000', amount: 5000, milestone: false },
  { level: 2, value: '₹2,000', amount: 2000, milestone: false },
  { level: 1, value: '₹1,000', amount: 1000, milestone: false }
];

export const MoneyLadder: React.FC<MoneyLadderProps> = ({ currentLevelIndex }) => {
  return (
    <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 w-full shadow-2xl overflow-hidden text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <h3 className="font-display text-xs font-bold text-white tracking-[0.2em] flex items-center gap-2">
          <Award className="w-4 h-4 text-white animate-pulse" />
          PRIZE LADDER ROADMAP
        </h3>
        <span className="text-[9px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-black border border-zinc-800">
          KBC SEAT
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {LADDER_VALUES.map((item, idx) => {
          const itemIdx = 14 - idx; // Match array order where level 15 is index 14
          const isActive = itemIdx === currentLevelIndex;
          const isPassed = itemIdx < currentLevelIndex;

          return (
            <div
              key={item.level}
              className={`flex items-center justify-between px-3 py-1 rounded transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-white/20 to-transparent border-l-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] font-bold'
                  : isPassed
                  ? 'opacity-40 text-zinc-400'
                  : item.milestone
                  ? 'opacity-90 font-semibold'
                  : 'opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5 py-0.5">
                <span
                  className={`font-mono text-xs w-6 text-right leading-none ${
                    isActive ? 'text-white font-bold' : 'text-zinc-400'
                  }`}
                >
                  {item.level.toString().padStart(2, '0')}
                </span>

                <span
                  className={`font-display text-[13px] tracking-wide leading-none ${
                    isActive
                      ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                      : item.milestone
                      ? 'text-zinc-200 italic'
                      : 'text-zinc-400'
                  }`}
                >
                  {item.value} {item.milestone && '(Safe)'}
                </span>
              </div>

              {isActive ? (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              ) : item.milestone ? (
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-300/60" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
