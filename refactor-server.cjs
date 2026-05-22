const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Add Socket.io import
content = content.replace(
  "import { createServer as createViteServer } from 'vite';",
  "import { createServer as createViteServer } from 'vite';\nimport { Server as SocketIOServer } from 'socket.io';"
);

// 2. Locate matchmaking logic and replace with Socket.io logic
// The original code has: `const matchmakingQueue: Array<{ id: string; username: string; avatar: string }> = [];`
// We need to add socketId to it.
content = content.replace(
  "const matchmakingQueue: Array<{ id: string; username: string; avatar: string }> = [];",
  "const matchmakingQueue: Array<{ id: string; username: string; avatar: string; socketId?: string }> = [];\n\nlet ioServer: SocketIOServer;"
);

// 3. Update simulateBotOpponent to accept ioServer
content = content.replace(
  "function simulateBotOpponent(roomId: string, questions: Question[]) {",
  "function simulateBotOpponent(roomId: string, questions: Question[]) {"
);

// We need to replace the simulateBotOpponent body to emit socket events
const oldBotSimulate = `function simulateBotOpponent(roomId: string, questions: Question[]) {
  let qIdx = 0;
  const interval = setInterval(() => {
    const room = multiplayerRooms[roomId];
    if (!room || room.status === 'completed' || qIdx >= questions.length) {
      clearInterval(interval);
      return;
    }

    const bot = room.players.find(p => p.id === 'bot_player');
    if (bot) {
      const currentQuestion = questions[qIdx];
      // Bot accuracy: 70% chance to pick correct
      const isCorrect = Math.random() < 0.70;
      const index = isCorrect ? currentQuestion.correctIndex : (currentQuestion.correctIndex + 1) % 4;
      const timeUsed = Math.floor(Math.random() * 8) + 2;

      bot.answers[qIdx] = {
        index,
        correct: isCorrect,
        timeUsed
      };
      if (isCorrect) {
        bot.currentScore += 1000 - (timeUsed * 25); // Faster answer grants higher points
      }
    }

    qIdx++;
  }, 10000); // simulation heartbeat matches client question timers
}`;

const newBotSimulate = `function simulateBotOpponent(roomId: string, questions: Question[]) {
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
}`;

content = content.replace(oldBotSimulate, newBotSimulate);

// 4. Update the startServer function to initialize socket.io
const oldStartServer = `async function startServer() {
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
  server.listen(PORT, '0.0.0.0', () => {
    console.log(\`QuizMaster Pro Server humming on http://localhost:\${PORT}\`);
  });
}`;

const newStartServer = `async function startServer() {
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
    console.log(\`QuizMaster Pro Server humming on http://localhost:\${PORT} (with WebSockets!)\`);
  });
}`;

content = content.replace(oldStartServer, newStartServer);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('server.ts successfully refactored for WebSockets!');
