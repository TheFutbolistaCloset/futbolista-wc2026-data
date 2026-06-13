// Throwaway inspector: summarize the real openfootball 2026 dataset structure.
import { readFileSync } from 'fs';
const raw = JSON.parse(readFileSync(new URL('./openfootball-2026.json', import.meta.url)));

console.log('TOP-LEVEL KEYS:', Object.keys(raw));
console.log('name:', raw.name);

const matches = raw.matches || [];
console.log('total matches:', matches.length);

// Sample one match's full shape
console.log('\nSAMPLE MATCH (raw shape):');
console.log(JSON.stringify(matches[0], null, 2));

// Distinct groups + teams
const groups = {};
const teams = new Map();
for (const m of matches) {
  const g = m.group || '(none)';
  const t1 = m.team1?.name || m.team1, t2 = m.team2?.name || m.team2;
  const c1 = m.team1?.code, c2 = m.team2?.code;
  if (m.group) {
    groups[g] = groups[g] || new Set();
    if (t1) groups[g].add(t1);
    if (t2) groups[g].add(t2);
  }
  if (t1) teams.set(t1, c1);
  if (t2) teams.set(t2, c2);
}

console.log('\nGROUPS (' + Object.keys(groups).length + '):');
for (const g of Object.keys(groups).sort()) {
  console.log('  ' + g + ': ' + [...groups[g]].join(', '));
}

console.log('\nALL TEAMS (' + teams.size + '):');
console.log([...teams.entries()].map(([n, c]) => `${n}${c ? ' [' + c + ']' : ''}`).join(' | '));

// First 6 chronological matches (the opener + early games)
console.log('\nFIRST 8 MATCHES (date/time/teams/group/score):');
for (const m of matches.slice(0, 8)) {
  const s = (m.score1 != null) ? `${m.score1}-${m.score2}` : (m.score ? JSON.stringify(m.score) : '—');
  console.log(`  ${m.date} ${m.time || ''}  ${m.team1?.name || m.team1} vs ${m.team2?.name || m.team2}  [${m.group || m.round}]  ${s}`);
}

// Look for specific brief claims
console.log('\nBRIEF CROSS-CHECK:');
const find = (a, b) => matches.find(m => {
  const n1 = (m.team1?.name || m.team1 || '').toLowerCase();
  const n2 = (m.team2?.name || m.team2 || '').toLowerCase();
  return (n1.includes(a) && n2.includes(b)) || (n1.includes(b) && n2.includes(a));
});
for (const [a, b, label] of [['mexico','south africa','opener (Mexico v S.Africa)'], ['united states','paraguay','USA v Paraguay'], ['brazil','morocco','Brazil v Morocco']]) {
  const m = find(a, b);
  console.log(`  ${label}: ` + (m ? `${m.date} ${m.time||''} [${m.group||''}] ${m.score1!=null?m.score1+'-'+m.score2:'no score'}` : 'NOT FOUND'));
}
