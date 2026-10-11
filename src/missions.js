// Three active missions at a time. A completed mission pays out and is replaced by a new one.
export const POOL = [
  { id: 'h40', text: 'Reach 40 m in one run', reward: 30, check: (s) => s.hm >= 40 },
  { id: 'h80', text: 'Reach 80 m in one run', reward: 60, check: (s) => s.hm >= 80 },
  { id: 'h150', text: 'Reach 150 m in one run', reward: 120, check: (s) => s.hm >= 150 },
  { id: 'o30', text: 'Collect 30 orbs in one run', reward: 40, check: (s) => s.orbs >= 30 },
  { id: 'o60', text: 'Collect 60 orbs in one run', reward: 90, check: (s) => s.orbs >= 60 },
  { id: 's3', text: 'Grab 3 stars in one run', reward: 50, check: (s) => s.stars >= 3 },
  { id: 'p5', text: 'Land 5 perfect releases in one run', reward: 50, check: (s) => s.perfects >= 5 },
  { id: 'p12', text: 'Land 12 perfect releases in one run', reward: 110, check: (s) => s.perfects >= 12 },
  { id: 'n3', text: 'Make 3 close calls in one run', reward: 60, check: (s) => s.near >= 3 },
  { id: 'm4', text: 'Reach a x4.0 multiplier', reward: 50, check: (s) => s.maxMult >= 4 },
  { id: 'm6', text: 'Reach a x6.0 multiplier', reward: 90, check: (s) => s.maxMult >= 6 },
  { id: 'sc3', text: 'Score 3,000 in one run', reward: 70, check: (s) => s.score >= 3000 },
  { id: 'sh1', text: 'Pick up a shield', reward: 40, check: (s) => s.shields >= 1 },
];

export const byId = (id) => POOL.find((m) => m.id === id) || POOL[0];

export function pickMissions(keep, n) {
  const out = keep.slice();
  const want = n || 3;
  const free = POOL.filter((m) => !out.includes(m.id));
  while (out.length < want && free.length) out.push(free.splice((Math.random() * free.length) | 0, 1)[0].id);
  return out;
}

// Returns the completed missions and the new list of three ids.
export function evaluate(ids, summary) {
  const done = ids.map(byId).filter((m) => m.check(summary));
  const keep = ids.filter((id) => !done.some((d) => d.id === id));
  return { done, ids: pickMissions(keep) };
}
