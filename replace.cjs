const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Replace colors
content = content.replace(/amber-400/g, 'white');
content = content.replace(/amber-500/g, 'zinc-300');
content = content.replace(/amber-300/g, 'zinc-300');
content = content.replace(/blue-500/g, 'white');
content = content.replace(/blue-400/g, 'zinc-300');
content = content.replace(/blue-900/g, 'zinc-900');
content = content.replace(/indigo-500/g, 'zinc-500');
content = content.replace(/indigo-600/g, 'zinc-600');
content = content.replace(/indigo-400/g, 'zinc-400');
content = content.replace(/cyan-400/g, 'white');
content = content.replace(/cyan-500/g, 'zinc-300');
content = content.replace(/rose-500/g, 'zinc-500');
content = content.replace(/emerald-500/g, 'zinc-400');

// Replace slate with zinc for a slightly more neutral dark
content = content.replace(/slate-950/g, 'zinc-950');
content = content.replace(/slate-900/g, 'zinc-900');
content = content.replace(/slate-800/g, 'zinc-800');
content = content.replace(/slate-700/g, 'zinc-700');
content = content.replace(/slate-600/g, 'zinc-600');
content = content.replace(/slate-500/g, 'zinc-500');
content = content.replace(/slate-400/g, 'zinc-400');
content = content.replace(/slate-300/g, 'zinc-300');

// Change the main background style
content = content.replace(
  /background: 'radial-gradient\(circle at 50% 25%, #ffffff 0%, #334155 12%, #020617 45%, #000000 100%\)'/g,
  "background: 'radial-gradient(circle at 50% 25%, #ffffff 0%, #a1a1aa 12%, #18181b 45%, #000000 100%)'"
);

// High level animation transitions:
// Wrap the main content with AnimatePresence and motion.div
// We will look for `{view === 'landing' && (` or similar and replace them
// Actually, it's easier to manually do the view transitions if they aren't already there. Let's check.

fs.writeFileSync(appPath, content, 'utf8');
console.log("Colors updated in App.tsx");
