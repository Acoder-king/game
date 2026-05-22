import express from 'express';
import path from 'path';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { Server as SocketIOServer } from 'socket.io';
import { GoogleGenAI, Type } from '@google/genai';
import {
  initDB,
  getUsers,
  getQuestions,
  getLeaderboard,
  getStats,
  addQuestion,
  editQuestionInDB,
  deleteQuestionFromDB,
  updatePlayerStats,
  addUserToDB,
  saveDB
} from './server-db';
import { User, Question, GameSession } from './src/types';

// Load environmental parameters
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Database
initDB();

// Body Parser Middleware
app.use(express.json());

// Initialize Gemini SDK with telemetry and fallback key checks
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini AI Pro SDK successfully loaded.');
  } catch (err) {
    console.error('Failed to initialize Gemini Pro SDK:', err);
  }
} else {
  console.log('Gemini API key is not configured in secrets. AI-assisted generation will stand by.');
}

// Simple Helper to check auth token
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is missing or invalid' });
  }
  const token = authHeader.substring(7);
  const users = getUsers();
  const user = users.find(u => u.id === token || `token_${u.id}` === token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or user not found' });
  }
  (req as any).user = user;
  next();
}

// --- REST API ENDPOINTS ---

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required fields.' });
  }

  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'User with this email or username already exists.' });
  }

  const defaultAvatars = ['🦁', '🦉', '🐯', '🐍', '🦅', '🦊', '🐼', '🐺', '👑', '😎'];
  const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

  const newUser: User = {
    id: 'usr_' + Date.now(),
    username,
    email,
    avatar: randomAvatar,
    xp: 100,
    coins: 50,
    gamesPlayed: 0,
    highestWin: 0,
    streak: 0,
    achievements: ['rookie'],
    role: username.toLowerCase().includes('admin') || username.toLowerCase().includes('host') ? 'admin' : 'user'
  };

  addUserToDB(newUser);
  res.status(201).json({
    user: newUser,
    token: `token_${newUser.id}`,
    message: 'Registration successful!'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, username } = req.body;
  const users = getUsers();
  let user: User | undefined;

  if (email) {
    user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  } else if (username) {
    user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  if (!user) {
    // If no user exists, auto-provision for convenience so players can jump straight inside
    const name = username || email?.split('@')[0] || 'Challenger';
    const cleanMail = email || `${name.toLowerCase()}@example.com`;
    return res.redirect(307, '/api/auth/register');
  }

  res.json({
    user,
    token: `token_${user.id}`,
    message: 'Welcome back to the hot seat!'
  });
});

app.get('/api/auth/profile', authenticate, (req, res) => {
  res.json({ user: (req as any).user });
});

app.post('/api/auth/avatar', authenticate, (req, res) => {
  const { avatar } = req.body;
  const user = (req as any).user;
  if (avatar) {
    user.avatar = avatar;
    saveDB();
    return res.json({ success: true, avatar, user });
  }
  res.status(400).json({ error: 'Avatar is missing' });
});

// Questions List and difficulty selection logic
app.get('/api/questions', (req, res) => {
  const category = req.query.category as string || 'all';
  const questionsInDb = getQuestions();

  // Filter questions by category if requested
  const questionsFiltered = category === 'all'
    ? questionsInDb
    : questionsInDb.filter(q => q.category.toLowerCase() === category.toLowerCase());

  // Sort by levels
  const easy = questionsFiltered.filter(q => q.difficulty === 'easy');
  const medium = questionsFiltered.filter(q => q.difficulty === 'medium');
  const hard = questionsFiltered.filter(q => q.difficulty === 'hard');

  // Fallbacks using unfiltered questions if category counts are too low
  const getSelections = (list: Question[], count: number, fallbackList: Question[]) => {
    let result = [...list];
    if (result.length < count) {
      const extraNeeded = count - result.length;
      const extra = fallbackList.filter(f => !result.some(r => r.id === f.id)).slice(0, extraNeeded);
      result = [...result, ...extra];
    }
    // Shuffle the items
    return result.sort(() => 0.5 - Math.random()).slice(0, count);
  };

  const allQuestionsGroup = getQuestions();
  const selectEasy = getSelections(easy, 5, allQuestionsGroup.filter(q => q.difficulty === 'easy'));
  const selectMedium = getSelections(medium, 5, allQuestionsGroup.filter(q => q.difficulty === 'medium'));
  const selectHard = getSelections(hard, 5, allQuestionsGroup.filter(q => q.difficulty === 'hard'));

  // Combine to create the perfect 15-question ladder (5 easy, 5 medium, 5 hard)
  const fullGameSet = [...selectEasy, ...selectMedium, ...selectHard];

  res.json({ questions: fullGameSet });
});

// Admin Question Routes (CRUD)
app.get('/api/admin/questions', authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role is required to perform this action.' });
  }
  res.json({ questions: getQuestions() });
});

app.post('/api/admin/questions', authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role is required.' });
  }
  const { text, options, correctIndex, difficulty, category, hint, explanation } = req.body;
  if (!text || !options || options.length !== 4 || correctIndex === undefined) {
    return res.status(400).json({ error: 'A complete KBC question must outline a text, 4 options, and correct index.' });
  }

  const added = addQuestion({
    text,
    options,
    correctIndex: Number(correctIndex),
    difficulty: difficulty || 'medium',
    category: category || 'general',
    hint,
    explanation
  });
  res.status(201).json({ success: true, question: added });
});

app.put('/api/admin/questions/:id', authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access denied.' });
  }
  const success = editQuestionInDB(req.params.id, req.body);
  if (success) {
    res.json({ success: true, message: 'Question updated successfully.' });
  } else {
    res.status(404).json({ error: 'Question not found.' });
  }
});

app.delete('/api/admin/questions/:id', authenticate, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access denied.' });
  }
  const success = deleteQuestionFromDB(req.params.id);
  if (success) {
    res.json({ success: true, message: 'Question deleted.' });
  } else {
    res.status(404).json({ error: 'Question not found.' });
  }
});

// Global Leaderboard and Stats
app.get('/api/leaderboard', (res, r) => {
  r.json({ leaderboard: getLeaderboard() });
});

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

// Game save payout and xp progression
app.post('/api/games/save', authenticate, (req, res) => {
  const { xpGained, payout, gameFinished } = req.body;
  const user = (req as any).user;

  updatePlayerStats(user.id, Number(xpGained || 0), Number(payout || 0), !!gameFinished);
  res.json({ success: true, user });
});

// --- ADVANCED AI FEATURES powered by GEMINI CLIENT (Lazy initialized) ---

// Real AI Question Generation via Gemini Pro
app.post('/api/ai/generate', async (req, res) => {
  const { category, difficulty } = req.body;
  const selectedDiff = difficulty || 'medium';
  const selectedCat = category || 'general culture';

  if (!ai) {
    return res.status(503).json({
      error: 'AI Generation service is temporarily unavailable. Configure the GEMINI_API_KEY in secrets.',
      mocked: true,
      question: {
        id: 'mock_ai_' + Date.now(),
        text: `Who is the creator of Indian mythology classic literature covering the story of Kurukshetra? (AI Mock, configure API Key)`,
        options: ['Valmiki', 'Ved Vyas', 'Kalidasa', 'Tulsidas'],
        correctIndex: 1,
        difficulty: selectedDiff,
        category: selectedCat,
        hint: 'He is respected as the ultimate cataloger of the Vedas.',
        explanation: 'Sage Ved Vyas composition contains Mahabharata which frames Kurukshetra battle.'
      }
    });
  }

  try {
    const prompt = `Generate exactly ONE rich, dramatic, KBC-style trivia question about "${selectedCat}" with difficulty level "${selectedDiff}".
The level must challenge the player and possess the authentic tension of India's favorite TV show.
Return a structured JSON object satisfying properties:
- text: string,
- options: array of 4 distinct strings,
- correctIndex: number between 0 and 3,
- hint: short text supporting the user,
- explanation: educational text explaining why the option is correct.

Ensure options are challenging and completely logical.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 4 strings representing the answer options"
            },
            correctIndex: { type: Type.INTEGER },
            hint: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ['text', 'options', 'correctIndex', 'hint', 'explanation']
        }
      }
    });

    const parsedQuestion = JSON.parse(response.text || '{}');
    parsedQuestion.id = 'ai_' + Date.now();
    parsedQuestion.difficulty = selectedDiff;
    parsedQuestion.category = selectedCat;

    res.json({ success: true, question: parsedQuestion });
  } catch (err: any) {
    console.error('Gemini question generation error:', err);
    res.status(500).json({ error: 'AI failed to coordinate question parameters: ' + err.message });
  }
});

// Expert Advice and Phone-a-friend responses dynamically populated by Gemini
app.post('/api/ai/hint', async (req, res) => {
  const { questionText, options, lifelineType } = req.body;
  if (!questionText || !options) {
    return res.status(400).json({ error: 'Question parameters are required.' });
  }

  if (!ai) {
    // Elegant fallback simulation
    const simulatedResponse = lifelineType === 'phone'
      ? `Hey buddy! I am roughly 80% sure it is one of the top choices. If I had to lock, I would select: ${options[0]}. Good luck!`
      : `As an expert, the historical context strongly directs my attention towards: ${options[0]}. Its correlation fits perfectly. Hope that helps!`;
    return res.json({ response: simulatedResponse });
  }

  try {
    const role = lifelineType === 'phone' ? 'nervous lifelong childhood buddy calling from New Delhi' : 'reputable university professor of Indian studies';
    const prompt = `You are a helper assisting in a game show.
A customer asks for help on the question: "${questionText}"
The available options are: ${options.join(', ')}.
Reply in character as: "${role}".
Respond with an educational, engaging, brief KBC-style suggestion (max 45 words) that leans towards indicating the likely correct answer without giving away the solution too easily. Ensure it feels like true gaming TV show suspense.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ response: response.text?.trim() || 'I strongly advise reviewing the core aspects of the options and making a deliberate selection.' });
  } catch (err: any) {
    console.error('Expert Advice error:', err);
    res.status(500).json({ error: 'AI Expert fell under the spotlight pressure!' });
  }
});

// --- MULTIPLAYER ROOMS & CHANNELS STATE ENGINE (STURY SSE/POLLING STACK) ---
interface MultiplayerRoom {
  roomId: string;
  players: Array<{
    id: string;
    username: string;
    avatar: string;
    currentScore: number;
    answers: Record<number, { index: number; correct: boolean; timeUsed: number }>;
  }>;
  questions: Question[];
  status: 'waiting' | 'active' | 'completed';
}

const multiplayerRooms: Record<string, MultiplayerRoom> = {};
const matchmakingQueue: Array<{ id: string; username: string; avatar: string; socketId?: string }> = [];

let ioServer: SocketIOServer;

// Matchmaking Pool Poll
app.post('/api/multiplayer/match', authenticate, (req, res) => {
  const user = (req as any).user;

  // Check if player is already in an active room
  const activeRoom = Object.values(multiplayerRooms).find(
    room => room.status === 'active' && room.players.some(p => p.id === user.id)
  );

  if (activeRoom) {
    return res.json({ status: 'active', roomId: activeRoom.roomId, room: activeRoom });
  }

  // Check if queue has other players
  const alreadyInQueue = matchmakingQueue.some(q => q.id === user.id);
  if (!alreadyInQueue) {
    matchmakingQueue.push({
      id: user.id,
      username: user.username,
      avatar: user.avatar
    });
  }

  // Try to match players
  if (matchmakingQueue.length >= 2) {
    const p1 = matchmakingQueue.shift()!;
    const p2 = matchmakingQueue.shift()!;

    // Create a new room
    const roomId = 'room_' + Date.now();
    const questionsInDb = getQuestions();
    // Mix questions
    const shuffledQs = [...questionsInDb].sort(() => 0.5 - Math.random()).slice(0, 10);

    multiplayerRooms[roomId] = {
      roomId,
      players: [
        { id: p1.id, username: p1.username, avatar: p1.avatar, currentScore: 0, answers: {} },
        { id: p2.id, username: p2.username, avatar: p2.avatar, currentScore: 0, answers: {} }
      ],
      questions: shuffledQs,
      status: 'active'
    };

    return res.json({ status: 'active', roomId, room: multiplayerRooms[roomId] });
  }

  // Matchmaking timeout simulation: If player stays alone in queue for 4 seconds,
  // spawn a Bot opponent to keep the battle exciting and accessible
  setTimeout(() => {
    const playerIndex = matchmakingQueue.findIndex(q => q.id === user.id);
    if (playerIndex !== -1) {
      matchmakingQueue.splice(playerIndex, 1);

      const botNames = ['Abhijeet_Bot', 'Amitabh_AI', 'Pranav_Smart', 'Sanya_Expert', 'Ketan_Pro'];
      const botAvatars = ['🦉', '🦁', '🦊', '🦅', '🐺'];
      const chosenName = botNames[Math.floor(Math.random() * botNames.length)];
      const chosenAvatar = botAvatars[Math.floor(Math.random() * botAvatars.length)];

      const roomId = 'room_' + Date.now();
      const questionsInDb = getQuestions();
      const shuffledQs = [...questionsInDb].sort(() => 0.5 - Math.random()).slice(0, 10);

      multiplayerRooms[roomId] = {
        roomId,
        players: [
          { id: user.id, username: user.username, avatar: user.avatar, currentScore: 0, answers: {} },
          { id: 'bot_player', username: chosenName, avatar: chosenAvatar, currentScore: 0, answers: {} }
        ],
        questions: shuffledQs,
        status: 'active'
      };
      // Start Bot simulator tick
      simulateBotOpponent(roomId, shuffledQs);
    }
  }, 3500);

  res.json({ status: 'searching' });
});

// Periodically updates match actions of the Bot
function simulateBotOpponent(roomId: string, questions: Question[]) {
  let qIdx = 0;
  const interval = setInterval(() => {
    const room = multiplayerRooms[roomId];
    if (!room || room.status === 'completed' || qIdx >= questions.length) {
      clearInterval(interval);
      return;
    }

    const bot = room.players.find(p => p.id === 'bot_player');
    if (bot && !bot.answers[qIdx]) {
      const currentQuestion = questions[qIdx];
      const isCorrect = Math.random() < 0.70;
      const index = isCorrect ? currentQuestion.correctIndex : (currentQuestion.correctIndex + 1) % 4;
      const timeUsed = Math.floor(Math.random() * 8) + 2;

      bot.answers[qIdx] = {
        index,
        correct: isCorrect,
        timeUsed
      };
      if (isCorrect) {
        bot.currentScore += 1000 - (timeUsed * 25);
      }
      
      if (ioServer) {
        ioServer.to(roomId).emit('room_update', { room });
      }
    }

    qIdx++;
  }, 8000);
}

// Submit Multiplayer Question Answer
app.post('/api/multiplayer/submit', authenticate, (req, res) => {
  const { roomId, questionIndex, selectedIndex, timeUsed } = req.body;
  const user = (req as any).user;

  const room = multiplayerRooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Match has expired.' });
  }

  const player = room.players.find(p => p.id === user.id);
  if (!player) {
    return res.status(403).json({ error: 'You are not part of this arena.' });
  }

  const currentQ = room.questions[questionIndex];
  const isCorrect = selectedIndex === currentQ.correctIndex;

  player.answers[questionIndex] = {
    index: selectedIndex,
    correct: isCorrect,
    timeUsed
  };

  if (isCorrect) {
    player.currentScore += 1000 - (timeUsed * 25);
  }

  // If both players have answered all 10 questions, close and update status
  const allAnswered = room.players.every(p => Object.keys(p.answers).length >= room.questions.length);
  if (allAnswered) {
    room.status = 'completed';
    // Award XP to champion!
    const winnerObj = room.players.reduce((prev, current) => (prev.currentScore > current.currentScore) ? prev : current);
    const userToReward = getUsers().find(u => u.id === winnerObj.id);
    if (userToReward) {
      userToReward.xp += 500;
      userToReward.coins += 50;
    }
    // Update participant tallies
    room.players.forEach(p => {
      const up = getUsers().find(u => u.id === p.id);
      if (up) {
        up.gamesPlayed += 1;
        up.xp += 100;
      }
    });

    saveDB();
  }

  res.json({ success: true, room });
});

app.get('/api/multiplayer/room/:roomId', (req, res) => {
  const room = multiplayerRooms[req.params.roomId];
  if (!room) {
    return res.status(404).json({ error: 'Active matchmaking room not found.' });
  }
  res.json({ room });
});

// Configure Vite pipeline or Static folders
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  ioServer = new SocketIOServer(server, { cors: { origin: '*' } });

  ioServer.on('connection', (socket) => {
    socket.on('join_matchmaking', (userData) => {
      const activeRoom = Object.values(multiplayerRooms).find(
        room => room.status === 'active' && room.players.some(p => p.id === userData.id)
      );

      if (activeRoom) {
        socket.join(activeRoom.roomId);
        socket.emit('match_found', { roomId: activeRoom.roomId, room: activeRoom });
        return;
      }

      const alreadyInQueue = matchmakingQueue.some(q => q.id === userData.id);
      if (!alreadyInQueue) {
        matchmakingQueue.push({ ...userData, socketId: socket.id });
      }

      if (matchmakingQueue.length >= 2) {
        const p1 = matchmakingQueue.shift();
        const p2 = matchmakingQueue.shift();

        const roomId = 'room_' + Date.now();
        const questionsInDb = getQuestions();
        const shuffledQs = [...questionsInDb].sort(() => 0.5 - Math.random()).slice(0, 10);

        multiplayerRooms[roomId] = {
          roomId,
          players: [
            { id: p1.id, username: p1.username, avatar: p1.avatar, currentScore: 0, answers: {} },
            { id: p2.id, username: p2.username, avatar: p2.avatar, currentScore: 0, answers: {} }
          ],
          questions: shuffledQs,
          status: 'active'
        };

        if (p1.socketId) {
          const socket1 = ioServer.sockets.sockets.get(p1.socketId);
          if (socket1) socket1.join(roomId);
        }
        if (p2.socketId) {
          const socket2 = ioServer.sockets.sockets.get(p2.socketId);
          if (socket2) socket2.join(roomId);
        }
        socket.join(roomId);

        ioServer.to(roomId).emit('match_found', { roomId, room: multiplayerRooms[roomId] });
      } else {
        setTimeout(() => {
          const playerIndex = matchmakingQueue.findIndex(q => q.id === userData.id);
          if (playerIndex !== -1) {
            matchmakingQueue.splice(playerIndex, 1);
            const botNames = ['Abhijeet_Bot', 'Amitabh_AI', 'Pranav_Smart', 'Sanya_Expert', 'Ketan_Pro'];
            const botAvatars = ['🦉', '🦁', '🦊', '🦅', '🐺'];
            const chosenName = botNames[Math.floor(Math.random() * botNames.length)];
            const chosenAvatar = botAvatars[Math.floor(Math.random() * botAvatars.length)];

            const roomId = 'room_' + Date.now();
            const questionsInDb = getQuestions();
            const shuffledQs = [...questionsInDb].sort(() => 0.5 - Math.random()).slice(0, 10);

            multiplayerRooms[roomId] = {
              roomId,
              players: [
                { id: userData.id, username: userData.username, avatar: userData.avatar, currentScore: 0, answers: {} },
                { id: 'bot_player', username: chosenName, avatar: chosenAvatar, currentScore: 0, answers: {} }
              ],
              questions: shuffledQs,
              status: 'active'
            };
            socket.join(roomId);
            ioServer.to(roomId).emit('match_found', { roomId, room: multiplayerRooms[roomId] });
            simulateBotOpponent(roomId, shuffledQs);
          }
        }, 3500);
      }
    });

    socket.on('submit_answer', (data) => {
      const { roomId, userId, questionIndex, selectedIndex, timeUsed } = data;
      const room = multiplayerRooms[roomId];
      if (!room) return;

      const player = room.players.find(p => p.id === userId);
      if (!player) return;

      const currentQ = room.questions[questionIndex];
      const isCorrect = selectedIndex === currentQ.correctIndex;

      player.answers[questionIndex] = {
        index: selectedIndex,
        correct: isCorrect,
        timeUsed
      };

      if (isCorrect) {
        player.currentScore += 1000 - (timeUsed * 25);
      }

      const allAnswered = room.players.every(p => Object.keys(p.answers).length >= room.questions.length);
      if (allAnswered && room.status !== 'completed') {
        room.status = 'completed';
        const winnerObj = room.players.reduce((prev, current) => (prev.currentScore > current.currentScore) ? prev : current);
        const userToReward = getUsers().find(u => u.id === winnerObj.id);
        if (userToReward) {
          userToReward.xp += 500;
          userToReward.coins += 50;
        }
        room.players.forEach(p => {
          const up = getUsers().find(u => u.id === p.id);
          if (up) {
            up.gamesPlayed += 1;
            up.xp += 100;
          }
        });
        saveDB();
      }

      ioServer.to(roomId).emit('room_update', { room });
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`QuizMaster Pro Server humming on http://localhost:${PORT} (with WebSockets!)`);
  });
}

startServer();
