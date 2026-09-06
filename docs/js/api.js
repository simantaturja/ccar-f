const KEY = (id) => `ccaf-result-${id}`;
const read = (id) => JSON.parse(localStorage.getItem(KEY(id)) || 'null');

export const api = {
  exams: () => fetch('./data/index.json').then((r) => r.json()),
  exam: (id) => fetch(`./data/${id}.json`).then((r) => r.json()),
  allResults: async () => {
    const all = {};
    for (const e of await api.exams()) { const r = read(e.id); if (r) all[e.id] = r; }
    return all;
  },
  result: async (id) => read(id),
  save: async (id, state) => localStorage.setItem(KEY(id), JSON.stringify(state)),
  reset: async (id) => localStorage.removeItem(KEY(id)),
};

export const DOMAINS = [
  'Agentic Architecture & Orchestration',
  'Tool Design & MCP Integration',
  'Claude Code Configuration & Workflows',
  'Prompt Engineering & Structured Output',
  'Context Management & Reliability',
];

export const WEAK_THRESHOLD = 75;
export const EXAM_MINUTES = 90;

export function timeLeft(state, now = Date.now()) {
  const frozen = state.pausedAt ? now - state.pausedAt : 0;
  return state.startedAt + EXAM_MINUTES * 60000 + (state.pausedMs || 0) + frozen - now;
}

export function isCorrect(q, picked) {
  const want = q.options.filter((o) => o.correct).map((o) => o.letter).sort().join('');
  return (picked || []).slice().sort().join('') === want;
}

export function score(exam, state) {
  const byDomain = {};
  let correct = 0;
  for (const q of exam.questions) {
    const d = (byDomain[q.domain] ||= { correct: 0, total: 0, wrong: [] });
    d.total++;
    if (isCorrect(q, state.answers[q.n])) { d.correct++; correct++; } else d.wrong.push(q.n);
  }
  return { correct, total: exam.questions.length, pct: Math.round((100 * correct) / exam.questions.length), byDomain };
}
