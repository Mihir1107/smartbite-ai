const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// The error is in the voice tab block. Let's find its start and end.
const startVoice = code.indexOf('{tab === "voice" && (');
const endVoice = code.indexOf('{/* ── GHOST RECOVERY TAB ── */}');

if (startVoice === -1 || endVoice === -1) {
  console.log("Could not find Voice Tab bounds.");
  process.exit(1);
}

const voiceBlock = code.substring(startVoice, endVoice);
let openDivs = 0;
let lines = voiceBlock.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  openDivs += opens - closes;
}

console.log(`Open divs left at end of Voice tab: ${openDivs}`);

// We need to insert `</div>` tags right before the closing `)}` of the voice block.
const closingBraceIndex = voiceBlock.lastIndexOf(')}');
if (closingBraceIndex !== -1 && openDivs > 0) {
  const missing = '\n' + ' '.repeat(10) + '</div>\n'.repeat(openDivs) + '        ';
  const fixedBlock = voiceBlock.substring(0, closingBraceIndex) + missing + voiceBlock.substring(closingBraceIndex);
  
  code = code.substring(0, startVoice) + fixedBlock + code.substring(endVoice);
  fs.writeFileSync('src/App.jsx', code);
  console.log(`Inserted ${openDivs} missing closing divs.`);
} else {
  console.log("No missing divs found or could not find closing brace.");
}
