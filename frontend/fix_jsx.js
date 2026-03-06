const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');

// Find the start of the Voice Orders tab
const voiceTabStart = code.indexOf('{tab === "voice" && (');
if (voiceTabStart === -1) {
  console.log("Could not find voice tab start");
  process.exit(1);
}

// Find the start of the Ghost Recovery tab
const recoveryTabStart = code.indexOf('{/* ── GHOST RECOVERY TAB ── */}');
if (recoveryTabStart === -1) {
  console.log("Could not find recovery tab start");
  process.exit(1);
}

// Extract the broken block
const beforeBlock = code.substring(0, voiceTabStart);
const blockToFix = code.substring(voiceTabStart, recoveryTabStart);
const afterBlock = code.substring(recoveryTabStart);

// We know the block starts with `{tab === "voice" && (`
// Let's count divs inside it to find where the mismatch happens.
let openDivs = 0;
let regex = /<div|<\/div>/g;
let match;
while ((match = regex.exec(blockToFix)) !== null) {
  if (match[0] === '<div') openDivs++;
  else if (match[0] === '</div>') openDivs--;
}

console.log(`Open divs in voice block: ${openDivs}`);

// If openDivs is positive, we need to add exactly that many closing divs at the very end of the block.
let fixedBlock = blockToFix;
if (openDivs > 0) {
  // Find the last `)}` which closes the tab render condition
  const closingBraceIndex = blockToFix.lastIndexOf(')}');
  if (closingBraceIndex !== -1) {
    const missingDivs = '\n' + '  </div>\n'.repeat(openDivs);
    fixedBlock = blockToFix.substring(0, closingBraceIndex) + missingDivs + blockToFix.substring(closingBraceIndex);
  }
}

fs.writeFileSync('src/App.jsx', beforeBlock + fixedBlock + afterBlock);
console.log("Applied missing divs before the condition closure.");
