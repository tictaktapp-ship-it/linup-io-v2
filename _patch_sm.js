const fs = require('fs');
const path = 'E:\\Linup v2\\frontend\\src\\pages\\app\\CouncilPage.tsx';
let content = fs.readFileSync(path, 'utf8');
let ok = true;

function replace(label, from, to) {
  if (!content.includes(from)) { console.error('ERROR: ' + label); ok = false; return; }
  content = content.replace(from, to);
  console.log('OK: ' + label);
}

// 1. Fix uiPhase type — remove CONCIERGE, it no longer exists in JSX
replace('uiPhase type',
  `  const [uiPhase, setUiPhase] = useState
    'CONCIERGE' | 'PIS' | 'BRIEF_CONFIRM' | 'COUNCIL' | 'CONDITIONAL' |
    'PHASE05' | 'CHARTER_CONFIRM' | 'COMPLETE'
  >('CONCIERGE');`,
  `  const [uiPhase, setUiPhase] = useState
    'PIS' | 'BRIEF_CONFIRM' | 'COUNCIL' | 'CONDITIONAL' |
    'PHASE05' | 'CHARTER_CONFIRM' | 'COMPLETE'
  >('PIS');`
);

// 2. Fix load handler — call sendPisOpener not sendConciergeOpener
replace('load handler',
  `            // Fresh project â€" send first concierge message
            sendConciergeOpener();`,
  `            // Fresh project — go straight to PIS
            sendPisOpener();`
);

// 3. Fix syncUiPhaseFromState — remove BLOCKED setUiPhase call (BLOCKED no longer in type)
replace('sync blocked',
  `    if (phase === 'BLOCKED') { setUiPhase('BLOCKED'); return; }`,
  `    if (phase === 'BLOCKED') { setUiPhase('CONDITIONAL'); return; }`
);

if (!ok) process.exit(1);
fs.writeFileSync(path, content, { encoding: 'utf8' });
console.log('CouncilPage state machine fixed. Length: ' + content.length);