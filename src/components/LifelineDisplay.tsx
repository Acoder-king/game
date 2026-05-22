import React from 'react';
import { HelpCircle, Users, PhoneCall, Award } from 'lucide-react';
import { soundManager } from '../utils/proceduralAudio';

interface LifelineDisplayProps {
  used: {
    fiftyDirty?: boolean; // backwards fallback
    fiftyFifty: boolean;
    audiencePoll: boolean;
    phoneFriend: boolean;
    expertAdvice: boolean;
  };
  onUse: (type: 'fiftyFifty' | 'audiencePoll' | 'phoneFriend' | 'expertAdvice') => void;
  disabled?: boolean;
}

export const LifelineDisplay: React.FC<LifelineDisplayProps> = ({ used, onUse, disabled }) => {
  const lifelines = [
    {
      id: 'fiftyFifty' as const,
      name: '50 : 50',
      icon: HelpCircle,
      description: 'Discards two incorrect choices',
    },
    {
      id: 'audiencePoll' as const,
      name: 'AUDIENCE',
      icon: Users,
      description: 'See live percentage rooms',
    },
    {
      id: 'phoneFriend' as const,
      name: 'PHONE',
      icon: PhoneCall,
      description: 'Call a remote friend for tips',
    },
    {
      id: 'expertAdvice' as const,
      name: 'EXPERT',
      icon: Award,
      description: 'Consult the studio jury panel',
    }
  ];

  const handleActivation = (id: 'fiftyFifty' | 'audiencePoll' | 'phoneFriend' | 'expertAdvice') => {
    if (used[id] || disabled) return;
    soundManager.playLifeline();
    onUse(id);
  };

  return (
    <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="font-display text-xs font-bold text-white tracking-[0.2em]">HOT LIFELINES ROOM</h4>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-black text-zinc-500 border border-zinc-800">ONCE PER ROUND</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {lifelines.map((lifeline) => {
          const Icon = lifeline.icon;
          const isUsed = used[lifeline.id];

          return (
            <button
              key={lifeline.id}
              disabled={isUsed || disabled}
              onClick={() => handleActivation(lifeline.id)}
              className={`relative flex flex-col items-center justify-center p-2 pt-3 pb-2 rounded-xl transition-all duration-300 w-full ${
                isUsed
                  ? 'border-2 border-zinc-800 bg-black/40 text-zinc-600 cursor-not-allowed opacity-30'
                  : disabled
                  ? 'border-2 border-zinc-700 bg-zinc-900/30 text-zinc-400 cursor-not-allowed opacity-60'
                  : 'border-2 border-white bg-zinc-900 text-white shadow-[0_0_12px_rgba(255,255,255,0.25)] hover:bg-zinc-800 hover:shadow-[0_0_20px_rgba(255,255,255,0.45)] hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              <div className="relative flex items-center justify-center mb-1">
                <Icon className={`w-4 h-4 ${!isUsed && !disabled ? 'animate-pulse' : ''}`} />
              </div>
              
              <span className="font-display text-[10px] font-bold leading-none tracking-tight uppercase">
                {lifeline.name}
              </span>

              {/* Red Crossed line overlay when deactivated */}
              {isUsed && (
                <div className="absolute inset-0 bg-zinc-950/10 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center pointer-events-none">
                  <div className="w-[110%] h-[1.5px] bg-zinc-500/40 rotate-12" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
