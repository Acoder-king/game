/**
 * Types and Interfaces for QuizMaster Pro
 */

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  xp: number;
  coins: number;
  gamesPlayed: number;
  highestWin: number;
  streak: number;
  achievements: string[];
  role: 'user' | 'admin';
}

export interface Question {
  id: string;
  text: string;
  options: string[]; // 4 options
  correctIndex: number; // 0-3
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  hint?: string;
  explanation?: string;
  mediaType?: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
}

export interface GameSession {
  sessionId: string;
  mode: 'classic' | 'multiplayer' | 'practice';
  userId: string;
  opponentId?: string; // For multiplayer
  opponentName?: string;
  opponentAvatar?: string;
  currentQuestionIndex: number;
  score: number;
  winnings: number; // For classic, in ₹
  questions: Question[];
  lifelinesUsed: {
    fiftyFifty: boolean;
    audiencePoll: boolean;
    phoneFriend: boolean;
    expertAdvice: boolean;
  };
  status: 'active' | 'completed' | 'failed';
  currentQuestionLocked: boolean;
  lockedAnswerIndex?: number;
  timeLeft: number;
  multiplayerState?: {
    playerAnswers: Record<string, number>; // questionIndex -> selectedIndex
    opponentAnswers: Record<string, number>;
    playerScore: number;
    opponentScore: number;
    playerTimeBonus: number;
    opponentTimeBonus: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  xp: number;
  highestWinnings: number;
  gamesPlayed: number;
  streak: number;
  rank?: number;
}

export interface GameStats {
  totalGames: number;
  totalPlayers: number;
  totalWinningsDist: number;
  popularCategory: string;
}
