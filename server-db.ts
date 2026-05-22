import fs from 'fs';
import path from 'path';
import { User, Question, LeaderboardEntry } from './src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Default initial questions list inspired by KBC
const DEFAULT_QUESTIONS: Question[] = [
  // Easy (Levels 1-5, values up to 20,000)
  {
    id: 'easy1',
    text: 'Which of these is the traditional Indian greeting representing respect and harmony?',
    options: ['Namaste', 'Bonjour', 'Hello', 'Konnichiwa'],
    correctIndex: 0,
    difficulty: 'easy',
    category: 'culture',
    hint: 'It is a Sanskrit word meaning "bowing to you".',
    explanation: 'Namaste is a respectful form of greeting in Hindu custom, found on the Indian subcontinent.'
  },
  {
    id: 'easy2',
    text: 'What is the color of the middle band of the Indian National Flag?',
    options: ['Saffron', 'White', 'Green', 'Navy Blue'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'general',
    hint: 'It represents peace and truth, and cradles the Ashoka Chakra.',
    explanation: 'The Indian National Flag is a horizontal tricolour of saffron at the top, white in the middle, and green at the bottom.'
  },
  {
    id: 'easy3',
    text: 'In the Ramayana, which bird tried to stop Ravana from kidnapping Sita?',
    options: ['Garuda', 'Sugriva', 'Jatayu', 'Sampati'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'mythology',
    hint: 'He is characterized as an old, heroic vulture.',
    explanation: 'Jatayu was a demigod vulture who fought bravely against Ravana to save Sita but was fatally wounded.'
  },
  {
    id: 'easy4',
    text: 'Which of these devices is primarily used to input textual data into a computer?',
    options: ['Monitor', 'Keyboard', 'Printer', 'Speaker'],
    correctIndex: 1,
    difficulty: 'easy',
    category: 'technology',
    hint: 'It consists of keys representing letters, numbers, and commands.',
    explanation: 'A keyboard is the primary user input device for typing text on computing devices.'
  },
  {
    id: 'easy5',
    text: 'Which of the following is NOT an Indian state?',
    options: ['Goa', 'Punjab', 'Delhi', 'Assam'],
    correctIndex: 2,
    difficulty: 'easy',
    category: 'geography',
    hint: 'It is a Union Territory containing the national capital.',
    explanation: 'Delhi is a Union Territory of India, while Goa, Punjab, and Assam are full-fledged states.'
  },
  // Medium (Levels 6-10, values 40,000 to 6,40,000)
  {
    id: 'med1',
    text: 'Which of the following elements has the chemical symbol "Fe"?',
    options: ['Fluorine', 'Iron', 'Fermium', 'Lead'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'science',
    hint: 'Its Latin name is "Ferrum". It is highly magnetic and found in blood.',
    explanation: 'The chemical symbol Fe is derived from "Ferrum", the Latin word for Iron.'
  },
  {
    id: 'med2',
    text: 'Who is known as the "Father of the Indian Constitution"?',
    options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Dr. B.R. Ambedkar', 'Sardar Vallabhbhai Patel'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'history',
    hint: 'He was a social reformer, jurist, and India\'s first Law Minister.',
    explanation: 'Dr. Bhimrao Ramji Ambedkar is recognized as the chief architect of the Indian Constitution.'
  },
  {
    id: 'med3',
    text: 'Which planet in our solar system has the highest mountain, Olympus Mons?',
    options: ['Mars', 'Venus', 'Saturn', 'Jupiter'],
    correctIndex: 0,
    difficulty: 'medium',
    category: 'science',
    hint: 'It is commonly referred to as the Red Planet.',
    explanation: 'Olympus Mons is a large shield volcano on the planet Mars, standing at over 21 km high.'
  },
  {
    id: 'med4',
    text: 'Which ocean occupies the area between Africa, Asia, Australia, and Antarctica?',
    options: ['Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Arctic Ocean'],
    correctIndex: 2,
    difficulty: 'medium',
    category: 'geography',
    hint: 'It is named after a major South Asian nation.',
    explanation: 'The Indian Ocean is the third-largest of the world\'s oceanic divisions, bounded by Asia to the north and Africa to the west.'
  },
  {
    id: 'med5',
    text: 'Which country won the ICC Men\'s T20 World Cup in 2024?',
    options: ['South Africa', 'India', 'Australia', 'England'],
    correctIndex: 1,
    difficulty: 'medium',
    category: 'sports',
    hint: 'They defeated South Africa in a thrilling final in Barbados.',
    explanation: 'India won the ICC Men\'s T20 World Cup in June 2024 by defeating South Africa under Rohit Sharma\'s captaincy.'
  },
  // Hard (Levels 11-15, values 12.5L to 1 Crore)
  {
    id: 'hard1',
    text: 'In which city did Rabindranath Tagore establish the Visva-Bharati University?',
    options: ['Kolkata', 'Santiniketan', 'Darjeeling', 'Shillong'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'history',
    hint: 'Its name means "Abode of Peace", located in West Bengal\'s Birbhum district.',
    explanation: 'Visva-Bharati was founded by Nobel laureate Rabindranath Tagore in Santiniketan, West Bengal, in the year 1921.'
  },
  {
    id: 'hard2',
    text: 'Which of these is the oldest mountain range in India, structurally?',
    options: ['Himalayas', 'Western Ghats', 'Aravalli Range', 'Satpura Range'],
    correctIndex: 2,
    difficulty: 'hard',
    category: 'geography',
    hint: 'These hills run through Rajasthan and Haryana, heading towards Delhi.',
    explanation: 'The Aravalli Range is one of the oldest fold mountain systems in the world, dating back to the Proterozoic era.'
  },
  {
    id: 'hard3',
    text: 'What was the code name of the Indian Army operation to capture the Siachen Glacier in 1984?',
    options: ['Operation Vijay', 'Operation Meghdoot', 'Operation Cactus', 'Operation Rajiv'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'history',
    hint: 'Named after Kalidasa\'s classical Sanskrit play, referring to a cloud messenger.',
    explanation: 'Operation Meghdoot was launched by the Indian Armed Forces in April 1984, securing control over the Siachen Glacier.'
  },
  {
    id: 'hard4',
    text: 'Which legendary filmmaker wrote and directed the famous "Apu Trilogy"?',
    options: ['Satyajit Ray', 'Ritwik Ghatak', 'Mrinal Sen', 'Guru Dutt'],
    correctIndex: 0,
    difficulty: 'hard',
    category: 'culture',
    hint: 'He received an honorary Oscar in 1992 and was famed for Pather Panchali.',
    explanation: 'Satyajit Ray created the classic Apu Trilogy: Pather Panchali (1955), Aparajito (1956), and Apur Sansar (1959).'
  },
  {
    id: 'hard5',
    text: 'In the context of standard Indian currency, whose signature appears on the 1 Rupee note?',
    options: ['Governor of RBI', 'Finance Secretary of India', 'President of India', 'Minister of Finance'],
    correctIndex: 1,
    difficulty: 'hard',
    category: 'general',
    hint: 'Unlike other currency bills signed by the RBI Governor, this note is issued directly by the Ministry of Finance.',
    explanation: 'Under the Coinage Act, the One-Rupee note is signed by the Finance Secretary of India, while all other banknotes are signed by the Governor of RBI.'
  }
];

interface DBState {
  users: User[];
  questions: Question[];
  leaderboards: LeaderboardEntry[];
  stats: {
    totalGames: number;
    totalWinnings: number;
  };
}

let dbInMemory: DBState = {
  users: [
    {
      id: 'admin-user',
      username: 'KBC_Host',
      email: 'host@kbc.com',
      avatar: '👑',
      xp: 25000,
      coins: 5000,
      gamesPlayed: 120,
      highestWin: 10000000, // 1 Crore!
      streak: 5,
      achievements: ['crorepati', 'quiz_god', 'consecut_5'],
      role: 'admin'
    },
    {
      id: 'player1',
      username: 'Rohan Sharma',
      email: 'rohan@gmail.com',
      avatar: '🦁',
      xp: 8500,
      coins: 1200,
      gamesPlayed: 45,
      highestWin: 640000,
      streak: 3,
      achievements: ['lakhpati'],
      role: 'user'
    },
    {
      id: 'player2',
      username: 'Priya Patel',
      email: 'priya@gmail.com',
      avatar: '🦉',
      xp: 6200,
      coins: 800,
      gamesPlayed: 30,
      highestWin: 320000,
      streak: 2,
      achievements: ['lakhpati'],
      role: 'user'
    }
  ],
  questions: [...DEFAULT_QUESTIONS],
  leaderboards: [],
  stats: {
    totalGames: 195,
    totalWinnings: 24750000
  }
};

// Sync Leaderboards with memory updates
function rebuildLeaderboard() {
  dbInMemory.leaderboards = dbInMemory.users
    .map(u => ({
      userId: u.id,
      username: u.username,
      avatar: u.avatar,
      xp: u.xp,
      highestWinnings: u.highestWin,
      gamesPlayed: u.gamesPlayed,
      streak: u.streak
    }))
    .sort((a, b) => b.xp - a.xp);
}

export function initDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const loaded = JSON.parse(data);
      dbInMemory = {
        users: loaded.users || dbInMemory.users,
        questions: loaded.questions || dbInMemory.questions,
        leaderboards: loaded.leaderboards || [],
        stats: loaded.stats || dbInMemory.stats
      };
      // Keep default questions if none exist
      if (!dbInMemory.questions || dbInMemory.questions.length === 0) {
        dbInMemory.questions = [...DEFAULT_QUESTIONS];
      }
    } else {
      rebuildLeaderboard();
      saveDB();
    }
  } catch (err) {
    console.error('Error loading DB, resetting to defaults:', err);
    rebuildLeaderboard();
  }
}

export function saveDB() {
  try {
    rebuildLeaderboard();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbInMemory, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write to DB file:', err);
  }
}

export function getUsers(): User[] {
  return dbInMemory.users;
}

export function getQuestions(): Question[] {
  return dbInMemory.questions;
}

export function getLeaderboard(): LeaderboardEntry[] {
  rebuildLeaderboard();
  return dbInMemory.leaderboards;
}

export function getStats() {
  return {
    ...dbInMemory.stats,
    totalPlayers: dbInMemory.users.length,
    totalQuestions: dbInMemory.questions.length
  };
}

export function addQuestion(q: Omit<Question, 'id'>): Question {
  const newQ: Question = {
    ...q,
    id: 'q_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
  };
  dbInMemory.questions.push(newQ);
  saveDB();
  return newQ;
}

export function editQuestionInDB(id: string, updated: Partial<Question>): boolean {
  const index = dbInMemory.questions.findIndex(q => q.id === id);
  if (index !== -1) {
    dbInMemory.questions[index] = { ...dbInMemory.questions[index], ...updated } as Question;
    saveDB();
    return true;
  }
  return false;
}

export function deleteQuestionFromDB(id: string): boolean {
  const originalLength = dbInMemory.questions.length;
  dbInMemory.questions = dbInMemory.questions.filter(q => q.id !== id);
  if (dbInMemory.questions.length < originalLength) {
    saveDB();
    return true;
  }
  return false;
}

export function updatePlayerStats(userId: string, xpGained: number, payout: number, gameFinished: boolean) {
  const user = dbInMemory.users.find(u => u.id === userId);
  if (user) {
    user.xp += xpGained;
    user.coins += Math.floor(xpGained / 10);
    if (gameFinished) {
      user.gamesPlayed += 1;
      user.streak += 1;
    }
    if (payout > user.highestWin) {
      user.highestWin = payout;
    }
    // Give some cool achievements
    if (payout >= 10000000 && !user.achievements.includes('crorepati')) {
      user.achievements.push('crorepati');
    }
    if (payout >= 320000 && !user.achievements.includes('lakhpati')) {
      user.achievements.push('lakhpati');
    }
    if (user.streak >= 5 && !user.achievements.includes('consecut_5')) {
      user.achievements.push('consecut_5');
    }
    if (user.xp >= 10000 && !user.achievements.includes('quiz_god')) {
      user.achievements.push('quiz_god');
    }

    dbInMemory.stats.totalGames += 1;
    dbInMemory.stats.totalWinnings += payout;
    saveDB();
  }
}

export function addUserToDB(user: User) {
  dbInMemory.users.push(user);
  saveDB();
}
