import { api, DOMAINS, WEAK_THRESHOLD, score } from './api.js';
import { richText, escapeHtml } from './render.js';

const [exams, results] = await Promise.all([api.exams(), api.allResults()]);

function card(e) {
  const r = results[e.id];
  let status = '<span class="status new">Not started</span>';
  let actions = `<a href="./exam.html?id=${e.id}"><button class="btn-primary">Start</button></a>`;
  let bar = '';
  if (r && r.submittedAt) {
    status = `<span class="status done">Submitted · ${new Date(r.submittedAt).toLocaleDateString()}</span>`;
    const left = e.count - Object.keys(r.answers).length;
    actions = `<a href="./exam.html?id=${e.id}"><button class="btn-primary">Review</button></a>
               ${left ? `<a href="./exam.html?id=${e.id}&resume=1"><button>Resume (${left} left)</button></a>` : ''}
               <button class="btn-danger" data-reset="${e.id}">Reset</button>`;
  } else if (r) {
    const n = Object.keys(r.answers).length;
    status = `<span class="status progress">In progress · ${n}/${e.count} answered</span>`;
    actions = `<a href="./exam.html?id=${e.id}"><button class="btn-primary">Resume</button></a>
               <button class="btn-danger" data-reset="${e.id}">Reset</button>`;
    bar = `<div class="bar"><i style="width:${(100 * n) / e.count}%"></i></div>`;
  }
  return `<div class="card" data-exam="${e.id}">
    <h3>${escapeHtml(e.title)}</h3>
    <div class="muted">${e.count} questions${e.multi ? ` · ${e.multi} multi-select` : ''}</div>
    ${bar}${status}
    <div class="row">${actions}</div>
  </div>`;
}

async function withScores() {
  const out = [];
  for (const e of exams) {
    const r = results[e.id];
    if (!r || !r.submittedAt) continue;
    const exam = await api.exam(e.id);
    out.push({ exam, state: r, score: score(exam, r) });
  }
  return out;
}

function fillScores(scored) {
  for (const { exam, score: s } of scored) {
    const c = document.querySelector(`[data-exam="${exam.id}"] .status`);
    c.insertAdjacentHTML('beforebegin',
      `<div class="bar ${s.pct >= WEAK_THRESHOLD ? 'ok' : 'bad'}"><i style="width:${s.pct}%"></i></div>
       <div><b>${s.correct}/${s.total}</b> · ${s.pct}%</div>`);
  }
}

function analysis(scored) {
  const el = document.getElementById('analysis');
  if (!scored.length) {
    el.innerHTML = '<h2>Follow-up</h2><p class="muted">Submit at least one exam to see weak domains and questions to revisit.</p>';
    return;
  }
  const agg = Object.fromEntries(DOMAINS.map((d) => [d, { correct: 0, total: 0 }]));
  const wrong = [];
  for (const { exam, state, score: s } of scored) {
    for (const [d, v] of Object.entries(s.byDomain)) {
      agg[d].correct += v.correct; agg[d].total += v.total;
      for (const n of v.wrong) wrong.push({ exam, q: exam.questions[n - 1], picked: state.answers[n] });
    }
  }
  const rows = DOMAINS.map((d) => ({ d, ...agg[d], pct: agg[d].total ? Math.round((100 * agg[d].correct) / agg[d].total) : 0 }))
    .sort((a, b) => a.pct - b.pct);
  const weak = rows.filter((r) => r.pct < WEAK_THRESHOLD);
  const totalC = scored.reduce((a, x) => a + x.score.correct, 0);
  const totalT = scored.reduce((a, x) => a + x.score.total, 0);

  const suggestions = weak.length
    ? `<p>Focus next on: ${weak.map((w) => `<span class="weak">${escapeHtml(w.d)}</span> (${w.pct}%)`).join(', ')}.
       Work through the ${wrong.filter((w) => weak.some((x) => x.d === w.q.domain)).length} missed questions below in those domains first, then retake the exam where you scored lowest.</p>`
    : `<p>All domains at or above ${WEAK_THRESHOLD}%. Revisit the missed questions below, then attempt an unfinished practice set.</p>`;

  const byDomainWrong = DOMAINS.map((d) => ({ d, items: wrong.filter((w) => w.q.domain === d) })).filter((g) => g.items.length)
    .sort((a, b) => b.items.length - a.items.length);

  el.innerHTML = `
    <h2>Follow-up</h2>
    <div class="card">
      <div><b>Overall across ${scored.length} submitted exam${scored.length > 1 ? 's' : ''}:</b> ${totalC}/${totalT} · ${Math.round((100 * totalC) / totalT)}%</div>
      ${suggestions}
      ${rows.map((r) => `
        <div class="domain-row">
          <div class="${r.pct < WEAK_THRESHOLD ? 'weak' : ''}">${escapeHtml(r.d)} <span class="muted">${r.correct}/${r.total}</span></div>
          <div class="bar ${r.pct >= WEAK_THRESHOLD ? 'ok' : 'bad'}"><i style="width:${r.pct}%"></i></div>
          <div><b>${r.pct}%</b></div>
        </div>`).join('')}
    </div>
    <h2>Questions to revisit (${wrong.length})</h2>
    ${byDomainWrong.map((g) => `
      <div class="card" style="margin-bottom:12px">
        <h3>${escapeHtml(g.d)} <span class="muted">· ${g.items.length}</span></h3>
        <ul class="wrong-list">
          ${g.items.map((w) => `
            <li>
              <span class="pill">${escapeHtml(shortTitle(w.exam.title))} · Q${w.q.n}</span>
              <a class="q" href="./exam.html?id=${w.exam.id}&q=${w.q.n}">${richText(w.q.question.slice(0, 140))}${w.q.question.length > 140 ? '…' : ''}</a>
              <span class="muted">${w.picked ? 'picked ' + w.picked.join(',') : 'skipped'}</span>
            </li>`).join('')}
        </ul>
      </div>`).join('')}`;
}

function shortTitle(t) {
  const m = t.match(/Mock #(\d+)/);
  return m ? `Mock ${m[1]}` : t.slice(0, 12);
}

document.getElementById('exams').innerHTML = exams.map(card).join('');
document.getElementById('exams').addEventListener('click', async (e) => {
  const id = e.target.dataset.reset;
  if (!id || !confirm('Reset this exam? All answers and the result are deleted.')) return;
  await api.reset(id);
  location.reload();
});

const scored = await withScores();
fillScores(scored);
analysis(scored);
