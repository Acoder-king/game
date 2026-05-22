import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Play,
  PlayCircle,
  HelpCircle,
  Users,
  Award,
  ShieldCheck,
  Compass,
  Volume2,
  VolumeX,
  User as UserIcon,
  LogOut,
  ChevronRight,
  TrendingUp,
  RotateCw,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Zap,
  BookOpen,
  Hourglass,
  CheckCircle,
  XCircle,
  Brain,
  MessageSquare,
  Flame,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';

const socket = io('/', { autoConnect: false });

import { soundManager } from './utils/proceduralAudio';
import { ParticleBackground } from './components/ParticleBackground';
import { MoneyLadder, LADDER_VALUES } from './components/MoneyLadder';
import { LifelineDisplay } from './components/LifelineDisplay';
import { User, Question, GameSession, LeaderboardEntry, GameStats } from './types';


const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, 30); // 30ms per character
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

export default function App() {
  // Global App States
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('qu_token'));
  const [view, setView] = useState<'landing' | 'auth' | 'classic' | 'multiplayer' | 'practice' | 'leaderboard' | 'admin'>('landing');

  // Auth Forms
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Game/Session States
  const [game, setGame] = useState<GameSession | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [roomData, setRoomData] = useState<any>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [muted, setMuted] = useState(soundManager.getMuted());

  // Category selection for practice seat
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [gameCategories, setGameCategories] = useState<string[]>(['geography', 'history', 'science', 'mythology', 'sports', 'technology', 'culture']);

  // Admin and lists
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [adminQuestions, setAdminQuestions] = useState<Question[]>([]);

  // Modals / Overlays
  const [currentModal, setCurrentModal] = useState<string | null>(null); // 'rules' | 'avatar' | 'new-question'
  const [avatarIndex, setAvatarIndex] = useState('');

  // Lifelines Reveal Results
  const [lifelineResult, setLifelineResult] = useState<{
    type: 'fifty' | 'poll' | 'phone' | 'expert' | null;
    deactivatedIndices?: number[];
    pollData?: Record<number, number>;
    message?: string;
  }>({ type: null });

  // Admin Creator Form
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    category: 'culture',
    hint: '',
    explanation: ''
  });

  // AI-Assisted Loading triggers
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Interval Tick Refs
  const timerIntervalRef = useRef<any>(null);
  const matchmakingIntervalRef = useRef<any>(null);
  const multiplayerPollIntervalRef = useRef<any>(null);

  // Standard Auto-authenticate on load
  useEffect(() => {
    if (token) {
      fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('qu_token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('qu_token');
          setToken(null);
        });
    }

    // Load general Leaderboard and Statistics
    fetchLeaderboard();
    fetchStats();
  }, [token]);

  const fetchLeaderboard = () => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(err => console.error(err));
  };

  const fetchStats = () => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  };

  const fetchAdminQuestions = () => {
    if (!token) return;
    fetch('/api/admin/questions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAdminQuestions(data.questions || []))
      .catch(err => console.error(err));
  };

  // Sound Suspense Drone Tracker
  useEffect(() => {
    if (view === 'classic' && !muted) {
      soundManager.playSuspense();
    } else {
      soundManager.stopSuspense();
    }
    return () => soundManager.stopSuspense();
  }, [view, muted]);

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login'
      ? { email: emailInput || undefined, username: usernameInput || undefined }
      : { username: usernameInput, email: emailInput };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('qu_token', data.token);
        setView('landing');
      } else {
        setAuthError(data.error || 'Identity credentials failed to validate.');
      }
    } catch (err: any) {
      setAuthError('Connection failure.');
    }
  };

  const handleMuteToggle = () => {
    const isMuted = soundManager.toggleMute();
    setMuted(isMuted);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('qu_token');
    setView('landing');
  };

  // CLASSIC GAME SEQUENCER
  const startClassicGame = async () => {
    if (!user) {
      setAuthMode('login');
      setView('auth');
      return;
    }

    try {
      const res = await fetch(`/api/questions?category=${selectedCategory}`);
      const data = await res.json();

      if (data.questions && data.questions.length > 0) {
        const gameQuestions = data.questions;
        const newSession: GameSession = {
          sessionId: 'classic_' + Date.now(),
          mode: 'classic',
          userId: user.id,
          currentQuestionIndex: 0,
          score: 0,
          winnings: 0,
          questions: gameQuestions,
          lifelinesUsed: {
            fiftyFifty: false,
            audiencePoll: false,
            phoneFriend: false,
            expertAdvice: false
          },
          status: 'active',
          currentQuestionLocked: false,
          timeLeft: 45
        };

        setGame(newSession);
        setActiveQuestion(gameQuestions[0]);
        setLifelineResult({ type: null });
        setAiResponse(null);
        setView('classic');
        startTimer();
      }
    } catch (err) {
      console.error('Failed to trigger KBC game set:', err);
    }
  };

  // PRACTISE MODE
  const startPracticeMode = async () => {
    if (!user) {
      setAuthMode('login');
      setView('auth');
      return;
    }

    try {
      const res = await fetch(`/api/questions?category=${selectedCategory}`);
      const data = await res.json();

      if (data.questions && data.questions.length > 0) {
        const gameQuestions = data.questions.sort(() => 0.5 - Math.random());
        const newSession: GameSession = {
          sessionId: 'practice_' + Date.now(),
          mode: 'practice',
          userId: user.id,
          currentQuestionIndex: 0,
          score: 0,
          winnings: 0,
          questions: gameQuestions,
          lifelinesUsed: {
            fiftyFifty: false,
            audiencePoll: false,
            phoneFriend: false,
            expertAdvice: false
          },
          status: 'active',
          currentQuestionLocked: false,
          timeLeft: 60
        };

        setGame(newSession);
        setActiveQuestion(gameQuestions[0]);
        setLifelineResult({ type: null });
        setAiResponse(null);
        setView('practice');
        startTimer();
      }
    } catch (err) {}
  };

  // MULTIPLAYER MATCH BATTLEFIELD (WebSockets Real-Time)
  const startMultiplayerMatching = () => {
    if (!user) {
      setAuthMode('login');
      setView('auth');
      return;
    }

    setSearchStatus('searching');
    setView('multiplayer');
    
    socket.connect();
    socket.emit('join_matchmaking', { id: user.id, username: user.username, avatar: user.avatar });

    socket.on('match_found', (data) => {
      setSearchStatus('matched');
      setRoomData(data.room);
      const initialGame: GameSession = {
        sessionId: data.roomId,
        mode: 'multiplayer',
        userId: user.id,
        currentQuestionIndex: 0,
        score: 0,
        winnings: 0,
        questions: data.room.questions,
        lifelinesUsed: {
          fiftyFifty: true,
          audiencePoll: true,
          phoneFriend: true,
          expertAdvice: true
        },
        status: 'active',
        currentQuestionLocked: false,
        timeLeft: 12
      };
      setGame(initialGame);
      setActiveQuestion(data.room.questions[0]);
      startTimer(12);
    });

    socket.on('room_update', (data) => {
      setRoomData(data.room);
      if (data.room.status === 'completed') {
        clearInterval(timerIntervalRef.current);
        setGame(g => g ? { ...g, status: 'completed' } : null);
        soundManager.playCelebration();
        socket.disconnect();
      }
    });
  };

  const startMultiplayerPolling = (roomId: string) => {
    // Deprecated. Socket events handle this now.
  };

  // Double timer tracking systems
  const startTimer = (seconds = 45) => {
    clearInterval(timerIntervalRef.current);
    if (!game) return;

    timerIntervalRef.current = setInterval(() => {
      setGame(prev => {
        if (!prev || prev.status !== 'active') {
          clearInterval(timerIntervalRef.current);
          return prev;
        }

        if (prev.timeLeft <= 1) {
          clearInterval(timerIntervalRef.current);
          // Auto-fail current locked selection or evaluate
          soundManager.playWrong();
          handleAnswerEvaluation(-1); // failed on time limit
          return { ...prev, timeLeft: 0 };
        }

        // Play ticking cue
        soundManager.playTick();
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  };

  // Answer locking and evaluate
  const handleLockSelection = (index: number) => {
    if (!game || game.currentQuestionLocked) return;
    soundManager.playLock();

    setGame(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentQuestionLocked: true,
        lockedAnswerIndex: index
      };
    });

    // Substantial suspense delay before feedback
    setTimeout(() => {
      handleAnswerEvaluation(index);
    }, 2000);
  };

  const handleAnswerEvaluation = (selectedIndex: number) => {
    if (!game || !activeQuestion) return;

    const isCorrect = selectedIndex === activeQuestion.correctIndex;
    const isMultiplayer = game.mode === 'multiplayer';

    if (isMultiplayer) {
      clearInterval(timerIntervalRef.current);
      const timeIncurred = 12 - game.timeLeft;
      socket.emit('submit_answer', {
        roomId: game.sessionId,
        userId: user!.id,
        questionIndex: game.currentQuestionIndex,
        selectedIndex,
        timeUsed: timeIncurred
      });
      // Delay before advancing visually
      setTimeout(() => {
        advanceMultiplayerQuestion();
      }, 2000);
      return;
    }

    if (isCorrect) {
      soundManager.playCorrect();

      // Complete winnings calculation based on ladder level index
      const nextIndex = game.currentQuestionIndex + 1;
      const currentLevelAmount = LADDER_VALUES[14 - game.currentQuestionIndex]?.amount || 0;

      if (nextIndex >= 15 && game.mode === 'classic') {
        // Ultimate Victory Crore win
        soundManager.playCelebration();
        setGame(prev => prev ? {
          ...prev,
          status: 'completed',
          winnings: 10000000,
          score: prev.score + 5000
        } : null);

        // Commit XP results
        fetch('/api/games/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ xpGained: 2500, payout: 10000000, gameFinished: true })
        });
      } else {
        // standard progress
        setGame(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentQuestionIndex: nextIndex,
            currentQuestionLocked: false,
            lockedAnswerIndex: undefined,
            winnings: currentLevelAmount,
            score: prev.score + (100 * (nextIndex)),
            timeLeft: game.mode === 'practice' ? 60 : 45
          };
        });

        const nextQuestion = game.questions[nextIndex];
        if (nextQuestion) {
          setActiveQuestion(nextQuestion);
          setLifelineResult({ type: null });
          setAiResponse(null);
          startTimer(game.mode === 'practice' ? 60 : 45);
        } else {
          // Finished practising setup
          setGame(prev => prev ? { ...prev, status: 'completed' } : null);
        }
      }
    } else {
      // Wrong response trigger
      soundManager.playWrong();

      // Classic rules fallback safe havens:
      // ₹20,000 (level 5 index 4)
      // ₹6,40,000 (level 10 index 9)
      let consolationPayout = 0;
      if (game.mode === 'classic') {
        if (game.currentQuestionIndex >= 10) {
          consolationPayout = 640000;
        } else if (game.currentQuestionIndex >= 5) {
          consolationPayout = 20000;
        }
      }

      setGame(prev => prev ? {
        ...prev,
        status: 'failed',
        winnings: consolationPayout
      } : null);

      // Save user metrics
      if (game.mode === 'classic') {
        fetch('/api/games/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            xpGained: Math.max(100, game.currentQuestionIndex * 150),
            payout: consolationPayout,
            gameFinished: true
          })
        });
      }
    }
  };

  const advanceMultiplayerQuestion = () => {
    if (!game) return;
    const nextIdx = game.currentQuestionIndex + 1;
    if (nextIdx < 10) {
      setGame(prev => prev ? {
        ...prev,
        currentQuestionIndex: nextIdx,
        currentQuestionLocked: false,
        lockedAnswerIndex: undefined,
        timeLeft: 12
      } : null);
      setActiveQuestion(game.questions[nextIdx]);
      startTimer(12);
    } else {
      // Match done! Evaluates leaderboard
      clearInterval(timerIntervalRef.current);
    }
  };

  // Walk Away Option (Take the current winnings safe!)
  const handleWalkAway = () => {
    if (!game || game.status !== 'active') return;
    soundManager.playCorrect();

    setGame(prev => prev ? { ...prev, status: 'completed' } : null);

    fetch('/api/games/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        xpGained: game.currentQuestionIndex * 200,
        payout: game.winnings,
        gameFinished: true
      })
    });
  };

  // LIFELINES IMPLEMENTATION
  const handleLifelineUse = async (type: 'fiftyFifty' | 'audiencePoll' | 'phoneFriend' | 'expertAdvice') => {
    if (!game || !activeQuestion) return;

    setGame(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lifelinesUsed: {
          ...prev.lifelinesUsed,
          [type]: true
        }
      };
    });

    if (type === 'fiftyFifty') {
      // Discard 2 incorrect options
      const correct = activeQuestion.correctIndex;
      const incorrect: number[] = [];
      while (incorrect.length < 2) {
        const rand = Math.floor(Math.random() * 4);
        if (rand !== correct && !incorrect.includes(rand)) {
          incorrect.push(rand);
        }
      }
      setLifelineResult({
        type: 'fifty',
        deactivatedIndices: incorrect
      });
    } else if (type === 'audiencePoll') {
      const correct = activeQuestion.correctIndex;
      const data: Record<number, number> = {};

      // Audience is 74% smart on average
      const mainChains = Math.floor(Math.random() * 25) + 55;
      data[correct] = mainChains;

      let remaining = 100 - mainChains;
      const otherIndices = [0, 1, 2, 3].filter(i => i !== correct);

      const second = Math.floor(Math.random() * (remaining - 5));
      data[otherIndices[0]] = second;
      remaining -= second;

      const third = Math.floor(Math.random() * remaining);
      data[otherIndices[1]] = third;
      data[otherIndices[2]] = remaining - third;

      setLifelineResult({
        type: 'poll',
        pollData: data
      });
    } else if (type === 'phoneFriend' || type === 'expertAdvice') {
      setIsAiGenerating(true);
      fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: activeQuestion.text,
          options: activeQuestion.options,
          lifelineType: type === 'phoneFriend' ? 'phone' : 'expert'
        })
      })
        .then(res => res.json())
        .then(data => {
          setIsAiGenerating(false);
          setAiResponse(data.response);
          setLifelineResult({
            type: type === 'phoneFriend' ? 'phone' : 'expert',
            message: data.response
          });
        })
        .catch(() => {
          setIsAiGenerating(false);
          setLifelineResult({
            type: type === 'phoneFriend' ? 'phone' : 'expert',
            message: "I am having bad communication channels under standard conditions but try choice: " + activeQuestion.options[activeQuestion.correctIndex]
          });
        });
    }
  };

  // AI ADVANCED: GENERATE REPLACEMENT QUESTION
  const handleAiQuestionGenerate = () => {
    setIsAiGenerating(true);
    setAiResponse(null);

    fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: selectedCategory === 'all' ? 'general culture' : selectedCategory,
        difficulty: game?.questions[game.currentQuestionIndex]?.difficulty || 'medium'
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsAiGenerating(false);
        if (data.question) {
          soundManager.playLifeline();
          setActiveQuestion(data.question);
          setLifelineResult({ type: null });

          // Swap active question in current matching list index
          setGame(prev => {
            if (!prev) return null;
            const updated = [...prev.questions];
            updated[prev.currentQuestionIndex] = data.question;
            return {
              ...prev,
              questions: updated
            };
          });
        }
      })
      .catch(() => setIsAiGenerating(false));
  };

  // Admin CRUD submittals
  const handleCreateQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newQuestion)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchAdminQuestions();
          setCurrentModal(null);
          // reset form
          setNewQuestion({
            text: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            difficulty: 'easy',
            category: 'culture',
            hint: '',
            explanation: ''
          });
        }
      });
  };

  const handleDeleteQuestion = (id: string) => {
    fetch(`/api/admin/questions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(() => {
        fetchAdminQuestions();
      });
  };

  // Profile Avatar Picker
  const handleAvatarSelect = (emoji: string) => {
    fetch('/api/auth/avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ avatar: emoji })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(prev => prev ? { ...prev, avatar: emoji } : null);
          setCurrentModal(null);
        }
      });
  };

  // Cleanup helper timers
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(matchmakingIntervalRef.current);
      clearInterval(multiplayerPollIntervalRef.current);
    };
  }, []);

  return (
    <div 
      className="min-h-screen relative overflow-x-hidden text-slate-100 flex flex-col font-sans select-none"
      style={{ background: 'radial-gradient(circle at 50% 25%, #ffffff 0%, #a1a1aa 12%, #18181b 45%, #000000 100%)' }}
    >
      {/* Background spotlights & particles canvas */}
      <ParticleBackground />

      {/* Particle Background Glow Overlays */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-zinc-400 rounded-full blur-sm"></div>
        <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-zinc-300 rounded-full"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-[120px] opacity-25"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-zinc-500 rounded-full blur-[120px] opacity-15"></div>
      </div>

      {/* Dramatic Lighting Overlays */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-black to-transparent pointer-events-none z-0"></div>

      {/* Side Spotlight Effects */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-48 h-[120%] bg-white/5 blur-[120px] pointer-events-none rotate-12 z-0"></div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-48 h-[120%] bg-white/5 blur-[120px] pointer-events-none -rotate-12 z-0"></div>

      {/* HEADER NAVIGATION */}
      <header className="border-b border-white/20 bg-zinc-950/40 backdrop-blur-md relative z-20">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div
            onClick={() => setView('landing')}
            className="flex items-center gap-3.5 cursor-pointer hover:opacity-95 group"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <span className="text-white font-bold text-xl">🏆</span>
              </div>
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tighter text-white uppercase italic drop-shadow-md leading-none">
                QUIZMASTER <span className="text-white">PRO</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-400 mt-1">
                MILLIONAIRE CHALLENGE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Audio configuration state */}
            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-300/30 transition-all"
              title={muted ? 'Unmute Game Sounds' : 'Mute Game Sounds'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setView('leaderboard');
                    fetchLeaderboard();
                  }}
                  className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 border border-transparent hover:border-zinc-800 rounded-lg px-2.5 py-1.5 transition-all"
                >
                  <Trophy className="w-3.5 h-3.5 text-zinc-300" />
                  Ranks
                </button>

                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      setView('admin');
                      fetchAdminQuestions();
                    }}
                    className="bg-white/10 hover:bg-white/20 text-zinc-300 border border-white/30 text-xs px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    Host Panel
                  </button>
                )}

                <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-full pl-2.5 pr-1.5 py-1 shadow-inner">
                  <div
                    onClick={() => setCurrentModal('avatar')}
                    className="w-7 h-7 rounded-full bg-white/10 border border-zinc-300/30 flex items-center justify-center text-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    title="Change Avatar Emoji"
                  >
                    {user.avatar || '😎'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold leading-none text-slate-200">{user.username}</p>
                    <p className="text-[9px] font-mono text-white/80 mt-0.5">{user.xp} XP</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1 rounded-full text-zinc-500 hover:text-red-400 transition-colors ml-1"
                    title="Exit Lobby"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setView('auth');
                }}
                className="bg-gradient-to-r from-white to-zinc-300 hover:from-zinc-300 hover:to-white text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORE VIEW LAYOUTS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 relative z-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">

          {/* 1. CINEMATIC LANDING SCREEN */}
          {view === 'landing' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid lg:grid-cols-12 gap-10 items-center py-4"
            >
              {/* Left Column content */}
              <div className="lg:col-span-7 text-left flex flex-col gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                      AUTHENTIC TV SHOW EXPERIENCE
                    </span>
                  </div>

                  <h2 className="font-display text-4xl sm:text-6xl font-black text-slate-50 tracking-tight leading-[1.1] uppercase">
                    Are you ready for the <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 via-white to-zinc-400 neon-gold-glow">
                      Hot Seat?
                    </span>
                  </h2>

                  <p className="text-zinc-400 text-sm sm:text-base max-w-lg mt-3.5 leading-relaxed">
                    Test your wisdom, ignite your rapid response reflexes, and climb the legendary money ladder using dynamic lifelines. Supported by real server AI Expert Advice.
                  </p>
                </div>

                {/* GAME MODES SELECTION BAR */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/20 rounded-2xl p-4 flex flex-col gap-3 group hover:border-zinc-300/40 transition-all shadow-lg text-left">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-zinc-300">
                      <PlayCircle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-slate-100 group-hover:text-zinc-300 transition-colors">CLASSIC KBC</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">15 Questions. Gradual difficulty. ₹1 Crore goal.</p>
                    </div>
                    <button
                      onClick={startClassicGame}
                      className="w-full mt-2 bg-white hover:bg-zinc-300 text-zinc-950 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Play Now
                    </button>
                  </div>

                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-300/20 rounded-2xl p-4 flex flex-col gap-3 group hover:border-white/40 transition-all shadow-lg text-left">
                    <div className="w-9 h-9 rounded-xl bg-zinc-300/10 flex items-center justify-center border border-zinc-300/20 text-white">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-slate-100 group-hover:text-white transition-colors">BATTLE DUEL</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Real-time matchmaking challenge.</p>
                    </div>
                    <button
                      onClick={startMultiplayerMatching}
                      className="w-full mt-2 bg-zinc-300 hover:bg-white text-zinc-950 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 text-zinc-950" /> Join Arena
                    </button>
                  </div>

                  <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-400/20 rounded-2xl p-4 flex flex-col gap-3 group hover:border-emerald-400/40 transition-all shadow-lg text-left">
                    <div className="w-9 h-9 rounded-xl bg-zinc-400/10 flex items-center justify-center border border-zinc-400/20 text-emerald-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">TRAIN ENGINE</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Practice seat. Category selection. Unlimited rounds.</p>
                    </div>
                    <button
                      onClick={startPracticeMode}
                      className="w-full mt-2 bg-zinc-400 hover:bg-emerald-400 text-zinc-950 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                    >
                      <Compass className="w-3.5 h-3.5" /> Start Training
                    </button>
                  </div>
                </div>

                {/* CATEGORIES SELECTION DROPDOWN/CAROUSEL */}
                <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wide flex items-center gap-1">
                    <Brain className="w-4 h-4 text-white" /> Focus Subject:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border capitalize transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-white/20 border-zinc-300 text-zinc-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-slate-200'
                      }`}
                    >
                      All Subjects
                    </button>
                    {gameCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border capitalize transition-all ${
                          selectedCategory === cat
                            ? 'bg-white/20 border-zinc-300 text-zinc-300'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Premium Rankings & Global Stats banner */}
              <div className="lg:col-span-5 flex flex-col gap-6 bento-animate">
                {/* Stats Widget */}
                <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800 p-5 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-zinc-300" />
                    <span className="font-display text-xs font-bold tracking-wider text-zinc-300">LIVE SPECTATOR METRICS</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mb-1">Total Rounds</p>
                      <p className="text-lg font-display font-black text-zinc-300">{stats?.totalGames || 195}</p>
                    </div>
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mb-1">Active Seats</p>
                      <p className="text-lg font-display font-black text-white">{stats?.totalPlayers || 4}</p>
                    </div>
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mb-1">Total Payout</p>
                      <p className="text-xs font-display font-black text-slate-100 flex items-center justify-center h-full">₹2.4 Cr</p>
                    </div>
                  </div>
                </div>

                {/* Hot Leaderboard */}
                <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800 p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-zinc-300" />
                      <span className="font-display text-xs font-bold tracking-wider text-zinc-300">LEADERBOARD TOP HEROES</span>
                    </div>
                    <span
                      onClick={() => setView('leaderboard')}
                      className="text-[10px] text-zinc-300 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      All Ranks <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {leaderboard.slice(0, 3).map((lead, idx) => (
                      <div
                        key={lead.userId}
                        className="flex items-center justify-between p-2.5 bg-zinc-950/80 border border-zinc-800/60 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-xs w-5 text-center ${idx === 0 ? 'text-zinc-300 font-black' : 'text-zinc-500'}`}>
                            #{idx + 1}
                          </span>
                          <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm">
                            {lead.avatar || '😎'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{lead.username}</p>
                            <p className="text-[9px] font-mono text-zinc-500">Highest Win: ₹{(lead.highestWinnings || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {lead.xp} XP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. AUTHENTICATION (AUTHENTIC KBC SEAT CARD) */}
          {view === 'auth' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full mx-auto"
            >
              <div className="bg-zinc-900/90 border border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
                <div className="border-b border-zinc-800/80 p-6 text-center bg-zinc-950/40 relative">
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => setView('landing')}
                      className="text-[10px] font-mono text-zinc-500 hover:text-slate-350 border border-zinc-800 rounded px-2 py-1 bg-zinc-950"
                    >
                      Lobby
                    </button>
                  </div>
                  <h3 className="font-display text-2xl font-black text-zinc-300 uppercase tracking-widest">
                    HOT SEAT LOGIN
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    State your identity to claim your prize wallet and register scores.
                  </p>
                </div>

                <form onSubmit={handleAuthSubmit} className="p-6 flex flex-col gap-4">
                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      {authError}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      Username / Nickname
                    </label>
                    <input
                      type="text"
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-zinc-300 transition-colors"
                      placeholder="e.g. KaunBanegaHost"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-zinc-300 transition-colors"
                      placeholder="e.g. smartchallenger@host.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-gradient-to-r from-white to-zinc-300 hover:from-zinc-300 hover:to-white text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(255,255,255,0.2)] active:scale-95 flex items-center justify-center gap-1"
                  >
                    Lock Identity <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="text-center mt-3 border-t border-slate-850 pt-3">
                    <button
                      type="button"
                      onClick={() => setAuthMode(m => m === 'login' ? 'register' : 'login')}
                      className="text-xs text-white/80 hover:text-zinc-300 font-medium"
                    >
                      {authMode === 'login'
                        ? "Don't have an identity account? Register here"
                        : 'Already have an account? Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* 3. GAME MODES: CLASSIC & PRACTICE (HOT SEAT MAIN SCREEN) */}
          {(view === 'classic' || view === 'practice') && game && activeQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Game board, timer, categories, options lines */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* HUD Panel: Timer and Score trackers */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      {/* Pulsing countdown circle */}
                      <div className="w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-950 relative">
                        <span className={`font-display text-xl font-black text-center ${game.timeLeft < 10 ? 'text-red-400 pulse-timer font-semibold' : 'text-white'}`}>
                          {game.timeLeft}s
                        </span>
                        {/* Outline progress track */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="26"
                            fill="transparent"
                            stroke={game.timeLeft < 10 ? '#ef4444' : '#00e5ff'}
                            strokeWidth="2.5"
                            strokeDasharray="163"
                            strokeDashoffset={163 - (163 * (game.timeLeft / (game.mode === 'practice' ? 60 : 45)))}
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="text-left">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">TIME SECONDS LEFT</p>
                      <p className="text-xs font-bold text-zinc-300 capitalize mt-1">Level {game.currentQuestionIndex + 1} • {activeQuestion.difficulty}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">SCORE WALLET</p>
                      <p className="text-sm font-display font-black text-zinc-300 mt-1">{game.score} PTS</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">WINNINGS SECURE</p>
                      <p className="text-sm font-display font-black text-slate-100 mt-1">₹{game.winnings.toLocaleString()}</p>
                    </div>

                    {game.mode === 'classic' && (
                      <button
                        onClick={handleWalkAway}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95"
                      >
                        Quit & Take Cash
                      </button>
                    )}
                  </div>
                 {/* GAME STAGE CENTER CORE PANEL (GLASSMORPHISM CARD) */}
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden text-center justify-center">
                  
                  {/* Dramatic internal spotlights */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/15 rounded-full filter blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 right-10 w-32 h-32 bg-zinc-300/5 rounded-full filter blur-3xl pointer-events-none" />

                  {/* IMMERSIVE CONCENTRIC TIMER DISPLAY */}
                  <div className="flex-grow flex items-center justify-center relative my-4 md:my-6">
                    <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-white/20 flex items-center justify-center relative bg-zinc-950/30">
                      <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-zinc-700/10 flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.15)] bg-zinc-950/80">
                        {/* Central Focus */}
                        <div className="text-center">
                          <div className="text-[10px] text-zinc-300 font-bold uppercase tracking-[0.4em] mb-1">Time Left</div>
                          <div className={`text-5xl sm:text-6xl font-black text-white tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] ${game.timeLeft < 10 ? 'text-red-400 pulse-timer font-semibold' : 'text-slate-100'}`}>
                            {game.timeLeft}
                          </div>
                        </div>
                      </div>
                      
                      {/* Circular Ring Graphic SVG */}
                      <svg className="absolute w-full h-full -rotate-90 p-1">
                        <circle 
                          cx="50%" 
                          cy="50%" 
                          r="44%" 
                          stroke={game.timeLeft < 10 ? '#ef4444' : '#fbbf24'} 
                          strokeWidth="4" 
                          fill="transparent" 
                          strokeDasharray="276" 
                          strokeDashoffset={276 - (276 * (game.timeLeft / (game.mode === 'practice' ? 60 : 45)))} 
                          strokeLinecap="round" 
                          className="drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] opacity-60 transition-all duration-1000" 
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Real-time Question display line */}
                  <div className="w-full mb-2">
                    <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/30 p-6 md:p-8 rounded-2xl shadow-xl overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-white"></div>
                      <div className="absolute top-0 right-0 w-1 h-full bg-white"></div>
                      
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 capitalize">
                          {activeQuestion.category}
                        </span>
                        {/* ADVANCED AI REPLACEMENT */}
                        {game.mode === 'practice' && (
                          <button
                            onClick={handleAiQuestionGenerate}
                            disabled={isAiGenerating}
                            className="bg-white/10 hover:bg-white/20 text-zinc-300 border border-white/30 text-[9px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-0.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" /> Swap (AI)
                          </button>
                        )}
                      </div>

                      <p className="text-lg md:text-2xl font-bold text-center leading-relaxed text-zinc-100 pt-2"><TypewriterText text={activeQuestion.text} /></p>
                    </div>
                  </div>

                  {/* OPTIONS GRID */}
                  <div className="grid md:grid-cols-2 gap-4 mt-2 text-left">
                    {activeQuestion.options.map((option, idx) => {
                      const letter = ['A', 'B', 'C', 'D'][idx];
                      const isOptionDisabled = lifelineResult.deactivatedIndices?.includes(idx);
                      const isLocked = game.lockedAnswerIndex === idx;

                      if (isOptionDisabled) {
                        return (
                          <button
                            key={option + idx}
                            disabled={true}
                            className="relative bg-zinc-950/25 border-2 border-slate-905 py-5 px-6 rounded-xl flex items-center text-left overflow-hidden opacity-20 cursor-not-allowed select-none text-zinc-600 line-through"
                          >
                            <span className="font-bold mr-4 text-xl">{letter}:</span>
                            <span className="text-sm font-medium">{option}</span>
                          </button>
                        );
                      }

                      if (isLocked) {
                        return (
                          <button
                            key={option + idx}
                            disabled={true}
                            className="relative bg-zinc-700/40 border-2 border-zinc-300 py-5 px-6 rounded-xl flex items-center text-left overflow-hidden ring-4 ring-white/20 text-white font-semibold cursor-wait w-full"
                          >
                            <span className="text-zinc-300 font-bold mr-4 text-xl">{letter}:</span>
                            <span className="text-sm md:text-base font-bold text-slate-5  flex-1">{option}</span>
                            <div className="absolute right-4 text-white text-[10px] font-mono animate-pulse tracking-widest hidden sm:block">
                              LOCKING...
                            </div>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={option + idx}
                          disabled={game.currentQuestionLocked}
                          onClick={() => handleLockSelection(idx)}
                          className="relative bg-zinc-900/80 border-2 border-zinc-700 py-5 px-6 rounded-xl flex items-center hover:border-white hover:bg-zinc-800 transition-all text-left overflow-hidden group w-full cursor-pointer"
                        >
                          <span className="text-white font-bold mr-4 text-xl group-hover:text-zinc-300 transition-colors">
                            {letter}:
                          </span>
                          <span className="text-sm md:text-base font-semibold text-slate-200 group-hover:text-white transition-colors flex-1">
                            {option}
                          </span>
                          <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </div>

                {/* REVEAL LIFELINE EXPANDABLE AREA */}
                {lifelineResult.type && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800"
                  >
                    {lifelineResult.type === 'poll' && lifelineResult.pollData && (
                      <div className="flex flex-col gap-3">
                        <h4 className="font-display text-xs font-bold text-zinc-300 tracking-wider text-left flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-white animate-pulse" /> AUDIENCE ESTIMATE GRAPHS
                        </h4>
                        <div className="grid grid-cols-4 gap-3 text-center">
                          {activeQuestion.options.map((opt, idx) => {
                            const percent = lifelineResult.pollData?.[idx] || 0;
                            return (
                              <div key={opt} className="flex flex-col gap-1.5">
                                <div className="h-24 bg-zinc-950 border border-slate-850 rounded-lg flex items-end overflow-hidden p-1 relative">
                                  {/* Vertical growing bar */}
                                  <div
                                    style={{ height: `${percent}%` }}
                                    className="bg-gradient-to-t from-zinc-600 to-white w-full rounded-md transition-all duration-1000"
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-zinc-300 font-bold leading-none">{percent}%</span>
                                <span className="text-[9px] font-mono text-zinc-500 uppercase">Option {['A', 'B', 'C', 'D'][idx]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(lifelineResult.type === 'phone' || lifelineResult.type === 'expert') && (
                      <div className="flex gap-4 items-start text-left">
                        <div className="w-12 h-12 rounded-full border border-white/20 bg-zinc-950 flex items-center justify-center text-xl shrink-0">
                          {lifelineResult.type === 'phone' ? '📞' : '🎓'}
                        </div>
                        <div className="flex flex-col gap-1">
                          <h4 className="font-display text-xs font-bold text-zinc-300 tracking-wider">
                            {lifelineResult.type === 'phone' ? 'PHONE CALL ADVICE RECEIVED:' : 'STUDIO EXPERT ADVICE RESOLUTION:'}
                          </h4>
                          <p className="text-xs text-slate-100 font-mono italic leading-relaxed py-1 bg-zinc-950/40 px-3 rounded-lg border border-slate-850">
                            "{lifelineResult.message}"
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Right Column: Lifelines selectors & cash ladder lists */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <LifelineDisplay
                  used={game.lifelinesUsed}
                  onUse={handleLifelineUse}
                  disabled={game.currentQuestionLocked}
                />

                <MoneyLadder currentLevelIndex={game.currentQuestionIndex} />
              </div>
            </motion.div>
          )}

          {/* 4. MULTIPLAYER BATTLE ARENA MATCH */}
          {view === 'multiplayer' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl w-full mx-auto"
            >
              {searchStatus === 'searching' && (
                <div className="bg-zinc-900/80 border border-zinc-300/20 p-8 rounded-2xl shadow-xl text-center flex flex-col items-center justify-center gap-6 backdrop-blur-md">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-zinc-300/20 border-t-white animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-xl">
                      ⚔️
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-black text-slate-100 tracking-wide uppercase">Searching Arena lobby...</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                      Connecting you to contestants globally. Matching takes ~3s. (Auto-spawns smart AI Bot Challenger if alone!)
                    </p>
                  </div>
                </div>
              )}

              {searchStatus === 'matched' && game && activeQuestion && roomData && (
                <div className="flex flex-col gap-6">
                  {/* Versus Header */}
                  <div className="grid grid-cols-3 items-center bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
                    {/* User profile left */}
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-full border border-zinc-300/35 bg-zinc-900 flex items-center justify-center text-lg shadow-lg">
                        {user?.avatar || '😎'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{user?.username}</p>
                        <p className="text-[11px] font-mono text-white font-bold">{roomData.players[0]?.id === user?.id ? roomData.players[0]?.currentScore : roomData.players[1]?.currentScore} PTS</p>
                      </div>
                    </div>

                    {/* Arena central VS clock */}
                    <div className="text-center flex flex-col items-center justify-center gap-1">
                      <span className="text-red-400 font-display text-lg font-black tracking-widest leading-none pulse-timer animate-pulse">VS</span>
                      <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Round {game.currentQuestionIndex + 1}/10</span>
                      <div className="bg-zinc-300/10 border border-white text-white font-mono text-xs font-bold px-2 py-0.5 rounded mt-1 shadow-inner">
                        {game.timeLeft}s
                      </div>
                    </div>

                    {/* Opponent content right */}
                    <div className="flex items-center gap-3 text-right justify-end">
                      <div>
                        <p className="text-xs font-bold text-slate-200">{roomData.players.find((p: any) => p.id !== user?.id)?.username || 'Challenger'}</p>
                        <p className="text-[11px] font-mono text-white font-bold">{roomData.players.find((p: any) => p.id !== user?.id)?.currentScore || 0} PTS</p>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-white/35 bg-zinc-900 flex items-center justify-center text-lg shadow-lg">
                        {roomData.players.find((p: any) => p.id !== user?.id)?.avatar || '🦁'}
                      </div>
                    </div>
                  </div>

                  {/* Active Game card question */}
                  <div className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-zinc-300/10 p-6 md:p-8 rounded-2xl relative shadow-2xl text-center">
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-white capitalize">
                      {activeQuestion.category}
                    </div>

                    <h3 className="font-display text-base md:text-xl font-bold tracking-wide leading-relaxed text-slate-100 min-h-[50px] flex items-center justify-center"><TypewriterText text={activeQuestion.text} /></h3>

                    <div className="grid md:grid-cols-2 gap-4 mt-6 text-left">
                      {activeQuestion.options.map((option, idx) => {
                        const isLocked = game.lockedAnswerIndex === idx;

                        return (
                          <button
                            key={option + idx}
                            disabled={game.currentQuestionLocked}
                            onClick={() => handleLockSelection(idx)}
                            className={`group w-full text-left rounded-xl border p-4 transition-all duration-350 flex items-center gap-3 cursor-pointer ${
                              isLocked
                                ? 'border-white bg-zinc-300/15 text-white cyan-border-glow font-bold'
                                : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-300/40 hover:bg-zinc-300/5 hover:scale-[1.01]'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${isLocked ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-white border border-zinc-800'}`}>
                              {['A', 'B', 'C', 'D'][idx]}
                            </span>
                            <span className="text-xs md:text-sm text-slate-200 font-medium">
                              {option}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 5. LEADERBOARD SYSTEM (MEDAL PLATES SCREEN) */}
          {view === 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl w-full mx-auto bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <div>
                  <h3 className="font-display text-2xl font-black text-slate-100 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-white" />
                    HALL OF HEROES
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">See ultimate contestants climbing global rankings.</p>
                </div>
                <button
                  onClick={() => setView('landing')}
                  className="text-xs font-mono text-zinc-400 hover:text-zinc-300 border border-zinc-800 bg-zinc-950 rounded-xl px-3 py-1.5 transition-all"
                >
                  Return Lobby
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {leaderboard.map((lead, idx) => (
                  <div
                    key={lead.userId}
                    className="flex justify-between items-center bg-zinc-950/60 rounded-xl p-3 border border-slate-850/60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 text-slate-350 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base">
                        {lead.avatar || '😎'}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-100">{lead.username}</p>
                        <p className="text-[10px] font-mono text-zinc-500">Games: {lead.gamesPlayed || 0} • Win Streak: {lead.streak || 0}</p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {lead.xp} XP
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase leading-none mt-1">
                        Peak: ₹{(lead.highestWinnings || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 6. ADMIN PANEL (FULL CRUD AND LIVE CONTROL) */}
          {view === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-zinc-900/80 border border-white/20 p-5 rounded-2xl flex items-center justify-between">
                <div className="text-left">
                  <h3 className="font-display text-xl font-black text-zinc-300 tracking-wider">HOST MASTER ANALYTICS</h3>
                  <p className="text-xs text-zinc-400">Add, edit or delete KBC-inspired database tables questions.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewQuestion({
                        text: '',
                        options: ['', '', '', ''],
                        correctIndex: 0,
                        difficulty: 'easy',
                        category: 'culture',
                        hint: '',
                        explanation: ''
                      });
                      setCurrentModal('new-question');
                    }}
                    className="bg-white hover:bg-zinc-300 text-zinc-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Create Question
                  </button>
                  <button
                    onClick={() => setView('landing')}
                    className="text-xs bg-zinc-950 font-mono text-zinc-300 hover:text-zinc-300 border border-zinc-800 px-3 py-2 rounded-xl"
                  >
                    Lobby
                  </button>
                </div>
              </div>

              {/* ANALYTICS PLATES CARDS */}
              <div className="grid sm:grid-cols-4 gap-4 text-left">
                <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Total Questions</span>
                  <p className="font-display text-2xl font-black text-slate-200 mt-1">{adminQuestions.length || 15}</p>
                </div>
                <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Easy Tier</span>
                  <p className="font-display text-2xl font-black text-green-400 mt-1">
                    {adminQuestions.filter(q => q.difficulty === 'easy').length || 5}
                  </p>
                </div>
                <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Medium Tier</span>
                  <p className="font-display text-2xl font-black text-white mt-1">
                    {adminQuestions.filter(q => q.difficulty === 'medium').length || 5}
                  </p>
                </div>
                <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Hard Tier</span>
                  <p className="font-display text-2xl font-black text-red-400 mt-1">
                    {adminQuestions.filter(q => q.difficulty === 'hard').length || 5}
                  </p>
                </div>
              </div>

              {/* QUESTIONS LISTING CONTROLLER */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 max-h-[450px] overflow-y-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 font-mono tracking-widest text-[10px] uppercase">
                      <th className="pb-2.5">Category</th>
                      <th className="pb-2.5">Difficulty</th>
                      <th className="pb-2.5">Text Question</th>
                      <th className="pb-2.5 text-center">Correct Options</th>
                      <th className="pb-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(adminQuestions.length ? adminQuestions : []).map((item) => (
                      <tr key={item.id} className="border-b border-slate-850/60 hover:bg-zinc-950/40">
                        <td className="py-2.5 capitalize">{item.category}</td>
                        <td className="py-2.5 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono leading-none font-bold ${item.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' : item.difficulty === 'medium' ? 'bg-zinc-300/10 text-white' : 'bg-red-500/10 text-red-400'}`}>
                            {item.difficulty}
                          </span>
                        </td>
                        <td className="py-2.5 max-w-sm truncate">{item.text}</td>
                        <td className="py-2.5 text-center font-mono">
                          {['A', 'B', 'C', 'D'][item.correctIndex]}
                        </td>
                        <td className="py-2.5 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setNewQuestion({
                                text: item.text,
                                options: [...item.options],
                                correctIndex: item.correctIndex,
                                difficulty: item.difficulty,
                                category: item.category,
                                hint: item.hint || '',
                                explanation: item.explanation || ''
                              });
                              // To avoid adding duplicates, we just delete old and insert new, or edit
                              handleDeleteQuestion(item.id);
                              setCurrentModal('new-question');
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-300"
                            title="Edit question parameters"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(item.id)}
                            className="p-1 text-zinc-400 hover:text-red-400"
                            title="Delete question permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* WIN/LOSS / ACTIONS SPLASH MODAL SCREEN ENDSTATES */}
      <AnimatePresence>
        {game && game.status !== 'active' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className={`max-w-md w-full rounded-2xl p-6 border text-center relative ${game.status === 'completed' ? 'border-zinc-300 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 shadow-[0_0_35px_rgba(255,255,255,0.25)]' : 'border-red-950 bg-zinc-900/90'}`}
            >
              {game.status === 'completed' ? (
                <>
                  <div className="w-16 h-16 rounded-full border-2 border-zinc-300 flex items-center justify-center bg-zinc-950 text-2xl mx-auto mb-4 animate-bounce">
                    🎉
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-300 neon-gold-glow uppercase">
                    CROREPATI RESOLUTION!
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    You have successfully answered all standard questions and sealed your name in legendary trivia history!
                  </p>
                  <div className="my-5 p-4 bg-white/10 border border-white/20 rounded-xl">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">CASH EARNED PRIZE</span>
                    <span className="text-2xl font-display font-black text-white neon-gold-glow font-semibold select-all">
                      ₹{game.winnings.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full border border-red-800 flex items-center justify-center bg-zinc-950 text-2xl mx-auto mb-4">
                    🛑
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-red-500 uppercase">
                    SEAT DROPPED!
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Ah, the spotlight pressure got tough. You dropped the seat but walked away with safety guarantee payout.
                  </p>
                  <div className="my-5 p-4 bg-red-950/20 border border-red-950/45 rounded-xl">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">SAFEHAVEN CONSOLATION</span>
                    <span className="text-xl font-display font-black text-slate-200">
                      ₹{game.winnings.toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setGame(null);
                    setView('landing');
                    fetchLeaderboard();
                  }}
                  className="w-full bg-gradient-to-r from-white to-zinc-300 text-zinc-950 font-bold py-2.5 rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-md"
                >
                  Return Lobbies
                </button>
                <button
                  onClick={() => {
                    setGame(null);
                    if (game.mode === 'multiplayer') {
                      startMultiplayerMatching();
                    } else if (game.mode === 'practice') {
                      startPracticeMode();
                    } else {
                      startClassicGame();
                    }
                  }}
                  className="w-full bg-zinc-950 text-zinc-300 font-bold border border-zinc-800 py-2.5 rounded-xl text-xs sm:text-sm active:scale-95 transition-all"
                >
                  Play Seat Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* PROFILE AVATAR CHOICE SELECTOR MODAL */}
        {currentModal === 'avatar' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative text-left"
            >
              <h4 className="font-display text-base font-bold text-slate-100 uppercase tracking-wider mb-1">
                SELECT PROFILE ICON
              </h4>
              <p className="text-xs text-zinc-500 mb-4">Choose a spirit beast to represent you inside the contestant lobbies.</p>

              <div className="grid grid-cols-5 gap-3">
                {['🦁', '🦉', '🐯', '🐍', '🦅', '🦊', '🐼', '🐺', '👑', '😎'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAvatarSelect(emoji)}
                    className="aspect-square bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-xl hover:bg-white/10 hover:border-zinc-300/50 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentModal(null)}
                className="w-full mt-4 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 text-xs py-2 rounded-xl font-bold border border-slate-850"
              >
                Close Picker
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* NEW QUESTION EDITOR FORM MODAL FOR ADMIN */}
        {currentModal === 'new-question' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-left"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <h4 className="font-display text-sm font-black text-zinc-300 capitalize flex items-center gap-1">
                  <Plus className="w-4 h-4" /> KBC Question Editor
                </h4>
                <button onClick={() => setCurrentModal(null)} className="text-zinc-500 text-xs hover:text-red-400 font-mono">
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateQuestionSubmit} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Question Text</label>
                  <textarea
                    className="bg-zinc-950 border border-slate-850 rounded-lg p-2 text-slate-200 outline-none focus:border-zinc-300"
                    rows={2}
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Difficulty</label>
                    <select
                      className="bg-zinc-950 border border-slate-850 rounded-lg p-2 text-slate-200 outline-none capitalize"
                      value={newQuestion.difficulty}
                      onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Category</label>
                    <select
                      className="bg-zinc-950 border border-slate-850 rounded-lg p-2 text-slate-200 outline-none capitalize"
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    >
                      {gameCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Options (A, B, C, D)</label>
                  {newQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 font-mono text-white text-[10px] uppercase font-bold text-center">
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <input
                        type="text"
                        className="bg-zinc-950 border border-slate-850 rounded-lg p-2 flex-1 text-slate-200 outline-none focus:border-zinc-300"
                        value={option}
                        onChange={(e) => {
                          const updated = [...newQuestion.options];
                          updated[idx] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: updated });
                        }}
                        placeholder={`Option text ${idx + 1}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1.5 align-middle items-center">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Correct Option Index</label>
                    <select
                      className="bg-zinc-950 border border-slate-850 rounded-lg p-2 text-zinc-300 outline-none"
                      value={newQuestion.correctIndex}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctIndex: Number(e.target.value) })}
                    >
                      <option value={0}>A (Option ID 1)</option>
                      <option value={1}>B (Option ID 2)</option>
                      <option value={2}>C (Option ID 3)</option>
                      <option value={3}>D (Option ID 4)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Hint</label>
                    <input
                      type="text"
                      className="bg-zinc-950 border border-slate-850 rounded-lg p-2 text-zinc-300 outline-none focus:border-zinc-300"
                      value={newQuestion.hint}
                      onChange={(e) => setNewQuestion({ ...newQuestion, hint: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-white hover:bg-zinc-300 text-zinc-950 font-bold py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
                >
                  Post to Database Question
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LUXURY SLATE STUDIO FOOTER */}
      <footer className="border-t border-white/5 bg-black/40 py-4 px-6 text-center mt-10 text-[10px] text-zinc-500 font-mono tracking-[0.2em] relative z-20 uppercase">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Server: Mumbai-West-01</div>
            <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-white mr-2 border-b border-transparent"></span> 24,802 Players Live</div>
          </div>
          <div className="italic text-zinc-500 text-[10px] tracking-normal lowercase sm:text-right first-letter:uppercase">
            Press [ESC] to Quit Game • QuizMaster Pro v4.2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
