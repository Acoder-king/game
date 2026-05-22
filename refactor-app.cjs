const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Add io import
content = content.replace(
  "import { motion, AnimatePresence } from 'motion/react';",
  "import { motion, AnimatePresence } from 'motion/react';\nimport { io } from 'socket.io-client';\n\nconst socket = io('/', { autoConnect: false });"
);

// 2. Refactor startMultiplayerMatching
const oldMultiplayerLogic = `  // MULTIPLAYER MATCH BATTLEFIELD
  const startMultiplayerMatching = () => {
    if (!user) {
      setAuthMode('login');
      setView('auth');
      return;
    }

    setSearchStatus('searching');
    setView('multiplayer');

    const matchRequest = () => {
      fetch('/api/multiplayer/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'active') {
            clearInterval(matchmakingIntervalRef.current);
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
              }, // Disable lifelines in multiplayer
              status: 'active',
              currentQuestionLocked: false,
              timeLeft: 12 // Rapid 12s clock per round
            };
            setGame(initialGame);
            setActiveQuestion(data.room.questions[0]);
            startTimer(12);
            startMultiplayerPolling(data.roomId);
          }
        })
        .catch(err => console.error(err));
    };

    matchRequest();
    matchmakingIntervalRef.current = setInterval(matchRequest, 2000);
  };

  const startMultiplayerPolling = (roomId: string) => {
    clearInterval(multiplayerPollIntervalRef.current);
    multiplayerPollIntervalRef.current = setInterval(() => {
      fetch(\`/api/multiplayer/room/\${roomId}\`)
        .then(res => res.json())
        .then(data => {
          if (data.room) {
            setRoomData(data.room);
            if (data.room.status === 'completed') {
              clearInterval(multiplayerPollIntervalRef.current);
              clearInterval(timerIntervalRef.current);
              setGame(g => g ? { ...g, status: 'completed' } : null);
              soundManager.playCelebration();
            }
          }
        })
        .catch(err => console.error(err));
    }, 1500);
  };`;

const newMultiplayerLogic = `  // MULTIPLAYER MATCH BATTLEFIELD (WebSockets Real-Time)
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
  };`;

content = content.replace(oldMultiplayerLogic, newMultiplayerLogic);

// 3. Update handleAnswerEvaluation for multiplayer submission
const oldSubmit = `    if (isMultiplayer) {
      clearInterval(timerIntervalRef.current);
      // Post answer directly to arena server
      const timeIncurred = 12 - game.timeLeft;
      fetch('/api/multiplayer/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({
          roomId: game.sessionId,
          questionIndex: game.currentQuestionIndex,
          selectedIndex,
          timeUsed: timeIncurred
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.room) {
            setRoomData(data.room);
          }
          // Move forward immediately
          setTimeout(() => {
            advanceMultiplayerQuestion();
          }, 2000);
        });
      return;
    }`;

const newSubmit = `    if (isMultiplayer) {
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
    }`;

content = content.replace(oldSubmit, newSubmit);


// 4. Implement Typewriter effect for questions
// We'll create a component TypewriterText inside App.tsx or just inline it if it's easy.
// Let's create a small component at the top of the file after imports.
const typewriterComponent = `
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
`;

content = content.replace(
  "export default function App() {",
  typewriterComponent + "\nexport default function App() {"
);

// Replace "{activeQuestion.text}" with "<TypewriterText text={activeQuestion.text} />" in Classic/Practice and Multiplayer blocks
content = content.replace(
  /<p className="text-lg md:text-2xl font-bold text-center leading-relaxed text-zinc-100 pt-2">\s*\{activeQuestion\.text\}\s*<\/p>/g,
  '<p className="text-lg md:text-2xl font-bold text-center leading-relaxed text-zinc-100 pt-2"><TypewriterText text={activeQuestion.text} /></p>'
);

content = content.replace(
  /<h3 className="font-display text-base md:text-xl font-bold tracking-wide leading-relaxed text-slate-100 min-h-\[50px\] flex items-center justify-center">\s*\{activeQuestion\.text\}\s*<\/h3>/g,
  '<h3 className="font-display text-base md:text-xl font-bold tracking-wide leading-relaxed text-slate-100 min-h-[50px] flex items-center justify-center"><TypewriterText text={activeQuestion.text} /></h3>'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx successfully refactored for WebSockets and Typewriter!');
