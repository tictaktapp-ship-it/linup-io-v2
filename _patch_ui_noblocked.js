const fs = require('fs');
const filePath = 'E:\\Linup v2\\frontend\\src\\pages\\app\\CouncilPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let ok = true;

function replace(label, from, to) {
  if (!content.includes(from)) { console.error('ERROR: anchor not found: ' + label); ok = false; return; }
  content = content.replace(from, to);
  console.log('OK: ' + label);
}

// 1. Remove BLOCKED from uiPhase type
replace('uiPhase type',
  `'CONCIERGE' | 'PIS' | 'BRIEF_CONFIRM' | 'COUNCIL' | 'CONDITIONAL' |
    'BLOCKED' | 'PHASE05' | 'CHARTER_CONFIRM' | 'COMPLETE'`,
  `'CONCIERGE' | 'PIS' | 'BRIEF_CONFIRM' | 'COUNCIL' | 'CONDITIONAL' | 'PHASE05' | 'CHARTER_CONFIRM' | 'COMPLETE'`
);

// 2. Remove BLOCKED from syncUiPhaseFromState
replace('sync blocked',
  `    if (phase === 'BLOCKED') { setUiPhase('BLOCKED'); return; }`,
  `    if (phase === 'BLOCKED') { setUiPhase('CONDITIONAL'); return; } // BLOCKED remapped to CONDITIONAL`
);

// 3. Remove BLOCKED from topbar phase label
replace('topbar blocked',
  `          {uiPhase === 'BLOCKED' && 'Revision needed'}`,
  `          {uiPhase === 'CONDITIONAL' && 'Your input needed'}`
);

// 4. Update council review header — remove BLOCKED title
replace('review header blocked',
  `                {uiPhase === 'BLOCKED' && 'Council complete — revision needed'}`,
  ``
);

// 5. Remove BLOCKED from the uiPhase guard on the council grid section
replace('council grid guard',
  `        {(uiPhase === 'COUNCIL' || uiPhase === 'CONDITIONAL' || uiPhase === 'BLOCKED') && (`,
  `        {(uiPhase === 'COUNCIL' || uiPhase === 'CONDITIONAL') && (`
);

// 6. Remove the entire BLOCKED section from the render
replace('blocked section',
  `            {/* Blocked */}
            {uiPhase === 'BLOCKED' && councilState?.quality_gate?.blockedReason && (
              <div className="council-blocked">
                <h3 className="council-blocked__title">Why this idea was blocked</h3>
                <p className="council-blocked__reason">{councilState.quality_gate.blockedReason}</p>
                <button
                  className="council-btn council-btn--primary"
                  onClick={() => { setMessages([]); setPisHistory([]); setIdeaBrief(null); setUiPhase('PIS'); }}
                >
                  Revise and resubmit →
                </button>
              </div>
            )}`,
  ``
);

// 7. Remove BLOCKED verdict banner variant (keep APPROVED and CONDITIONAL)
replace('blocked verdict banner css ref',
  `{councilState.verdict === 'BLOCKED' && '✖ BLOCKED — revision required'}`,
  ``
);

if (!ok) process.exit(1);
fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('CouncilPage.tsx patched — BLOCKED UI removed. Length: ' + content.length);