const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Replace yellow with white/zinc
content = content.replace(/yellow-500/g, 'white');
content = content.replace(/yellow-400/g, 'zinc-300');
content = content.replace(/yellow-300/g, 'zinc-400');
content = content.replace(/rgba\(251,191,36/g, 'rgba(255,255,255');
content = content.replace(/rgba\(234,179,8/g, 'rgba(255,255,255');

// For any remaining colors that should be monochrome
content = content.replace(/blue-600/g, 'zinc-700');
content = content.replace(/blue-50/g, 'zinc-100');
content = content.replace(/cyan-600/g, 'zinc-600');
content = content.replace(/cyan-300/g, 'zinc-300');
content = content.replace(/cyan-200/g, 'white');

// Keep red and emerald for right/wrong feedback, but maybe make them more subtle or keep them as is for utility. The user asked for "overall color combination white with black", usually success/fail states still use green/red but we can leave them for now or change to zinc.

// The text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-zinc-300 to-yellow-500 neon-gold-glow
// Should become from-zinc-400 via-white to-zinc-400
content = content.replace(/from-zinc-300 via-zinc-300 to-white/g, 'from-zinc-400 via-white to-zinc-400'); 
// Wait, yellow-400 -> zinc-300, yellow-500 -> white.
// So from-zinc-300 via-zinc-300 to-white will be the result of previous replacements on the gradient.
// Let's just fix it globally if it looks weird.

fs.writeFileSync(appPath, content, 'utf8');
console.log("Yellow colors replaced in App.tsx");
