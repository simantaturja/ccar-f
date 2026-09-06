import { api, timeLeft, isCorrect, score } from './api.js';
import { richText, escapeHtml } from './render.js';

const id = new URLSearchParams(location.search).get('id');
const $ = (s) => document.querySelector(s);

const exam = await api.exam(id);
let state = (await api.result(id)) || { answers: {}, flags: [], strikes: {}, current: 1, startedAt: Date.now(), submittedAt: null };
let current = Number(new URLSearchParams(location.search).get('q')) || state.current || 1;
let filter = 'all';

document.title = exam.title;
$('#title').textContent = exam.title;

const q = () => exam.questions[current - 1];
const submitted = () => Boolean(state.submittedAt);
const paused = () => Boolean(state.pausedAt) && !submitted();
const locked = (n) => (state.locked || []).includes(n);
const unanswered = () => exam.questions.filter((qq) => !state.answers[qq.n]);
const save = () => { state.current = current; return api.save(id, state); };

function pick(letter) {
  if (submitted() || paused() || locked(q().n)) return;
  const cur = state.answers[q().n] || [];
  state.answers[q().n] = q().multi
    ? (cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter])
    : [letter];
  if (!state.answers[q().n].length) delete state.answers[q().n];
  save(); render();
}

function toggleStrike(letter) {
  const cur = state.strikes[q().n] || [];
  state.strikes[q().n] = cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter];
  save(); render();
}

function toggleFlag() {
  state.flags = state.flags.includes(q().n) ? state.flags.filter((n) => n !== q().n) : [...state.flags, q().n];
  save(); render();
}

function go(n) {
  if (paused() || n < 1 || n > exam.questions.length) return;
  current = n; save(); render();
  $('#main').scrollTop = 0;
}

function pause() {
  if (submitted() || paused()) return;
  state.pausedAt = Date.now();
  save(); render();
}

function resume() {
  if (!paused()) return;
  state.pausedMs = (state.pausedMs || 0) + Date.now() - state.pausedAt;
  state.pausedAt = null;
  save(); render();
}

async function submit() {
  const msg = `Submit exam?\n\nUnanswered: ${unanswered().length}\nFlagged: ${state.flags.length}\n\nAnswers lock and review mode opens.`;
  if (!confirm(msg)) return;
  state.submittedAt = Date.now();
  await save(); render();
}

function reopen() {
  if (!submitted() || !unanswered().length) return;
  state.locked = Object.keys(state.answers).map(Number);
  state.pausedMs = (state.pausedMs || 0) + Date.now() - state.submittedAt;
  state.submittedAt = null;
  current = unanswered()[0].n; filter = 'unanswered';
  save(); render();
}

async function reset() {
  if (!confirm('Reset this exam? All answers, flags and the result are deleted.')) return;
  await api.reset(id);
  state = { answers: {}, flags: [], strikes: {}, current: 1, startedAt: Date.now(), submittedAt: null };
  current = 1; filter = 'all';
  await save(); render();
}

function renderScenario() {
  const s = q();
  $('#scenario').innerHTML = `
    <h2>Scenario</h2>
    <h3>${escapeHtml(s.scenarioTitle || '—')}</h3>
    ${s.scenario.split('\n\n').map((p) => `<p>${richText(p)}</p>`).join('')}`;
}

function renderQuestion() {
  const cur = q();
  const picked = state.answers[cur.n] || [];
  const struck = state.strikes[cur.n] || [];
  const done = submitted();
  const lock = !done && locked(cur.n);

  const options = cur.options.map((o) => {
    const cls = ['opt'];
    if (struck.includes(o.letter)) cls.push('struck');
    if (done) {
      if (o.correct) cls.push('correct');
      else if (picked.includes(o.letter)) cls.push('wrong');
    } else if (picked.includes(o.letter)) cls.push('picked');
    return `
      <div class="${cls.join(' ')}">
        <button class="pick" data-pick="${o.letter}" ${done || lock ? 'disabled' : ''}>
          <span class="letter">${o.letter}</span>
          <span>
            <span class="text">${richText(o.text)}</span>
            ${done ? `<span class="expl">${richText(o.explanation)}</span>` : ''}
          </span>
        </button>
        ${done || lock ? '' : `<button class="strike" data-strike="${o.letter}" title="Strike out this option">abc</button>`}
      </div>`;
  }).join('');

  let after = lock ? '<div class="verdict muted">🔒 Answered before submission — locked</div>' : '';
  if (done) {
    const ok = isCorrect(cur, picked);
    after = `
      <div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? '✓ Correct' : picked.length ? '✗ Wrong — your pick: ' + picked.join(', ') : '✗ Not answered'}</div>
      ${cur.overall ? `<div class="overall"><h4>Explanation</h4>${richText(cur.overall)}</div>` : ''}`;
  }

  $('#main').innerHTML = `
    <div class="qhead">
      <span class="n">Question ${cur.n} of ${exam.questions.length}</span>
      ${done ? `<span class="tag">${escapeHtml(cur.domain)}</span>` : ''}
      ${cur.multi ? '<span class="pill">Select all that apply</span>' : ''}
      <span class="spacer"></span>
      <button class="flag-btn ${state.flags.includes(cur.n) ? 'on' : ''}" id="flagBtn">⚑ ${state.flags.includes(cur.n) ? 'Flagged' : 'Flag'}</button>
    </div>
    <div class="question">${richText(cur.question)}</div>
    <div class="options">${options}</div>
    ${after}`;

  $('#main').querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.pick)));
  $('#main').querySelectorAll('[data-strike]').forEach((b) => b.addEventListener('click', () => toggleStrike(b.dataset.strike)));
  $('#flagBtn').addEventListener('click', toggleFlag);
}

function visible(qq) {
  if (filter === 'flagged') return state.flags.includes(qq.n);
  if (filter === 'unanswered') return !state.answers[qq.n];
  if (filter === 'wrong') return !isCorrect(qq, state.answers[qq.n]);
  return true;
}

function renderNav() {
  const done = submitted();
  $('#nav').innerHTML = exam.questions.filter(visible).map((qq) => {
    const cls = [];
    if (qq.n === current) cls.push('current');
    if (state.flags.includes(qq.n)) cls.push('flagged');
    if (done) cls.push(isCorrect(qq, state.answers[qq.n]) ? 'ok' : 'bad');
    else if (state.answers[qq.n]) cls.push('answered');
    return `<button class="${cls.join(' ')}" data-go="${qq.n}">${qq.n}</button>`;
  }).join('');
  $('#nav').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.go))));

  const opts = done ? ['all', 'wrong', 'flagged'] : ['all', 'unanswered', 'flagged'];
  $('#filters').innerHTML = opts.map((f) =>
    `<label><input type="radio" name="f" value="${f}" ${filter === f ? 'checked' : ''}> ${f}</label>`).join('');
  $('#filters').querySelectorAll('input').forEach((i) => i.addEventListener('change', () => { filter = i.value; renderNav(); }));

  $('#prevBtn').disabled = current === 1;
  $('#nextBtn').disabled = current === exam.questions.length;
}

function renderStatus() {
  const done = submitted();
  $('#submitBtn').hidden = done;
  $('#pauseBtn').hidden = done || paused();
  $('#resetBtn').hidden = !done;
  $('#reopenBtn').hidden = !done || !unanswered().length;
  $('#overlay').hidden = !paused();
  if (done) {
    const s = score(exam, state);
    $('#status').innerHTML = `<span class="scorebox ${s.pct >= 75 ? 'ok' : 'bad'}">${s.correct} / ${s.total} · ${s.pct}%</span>`;
    return;
  }
  const answered = Object.keys(state.answers).length;
  const left = timeLeft(state);
  const abs = Math.abs(left);
  const mm = String(Math.floor(abs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((abs % 60000) / 1000)).padStart(2, '0');
  const clock = `${left < 0 ? '+' : ''}${mm}:${ss}`;
  $('#status').innerHTML = `<span class="muted">${answered}/${exam.questions.length} answered</span>
    <span class="timer ${left < 0 ? 'over' : ''} ${paused() ? 'paused' : ''}" title="Soft timer, no auto-submit">${clock}</span>`;
  $('#overlayTimer').textContent = clock;
}

function render() { renderScenario(); renderQuestion(); renderNav(); renderStatus(); }

$('#prevBtn').addEventListener('click', () => go(current - 1));
$('#nextBtn').addEventListener('click', () => go(current + 1));
$('#submitBtn').addEventListener('click', submit);
$('#pauseBtn').addEventListener('click', pause);
$('#resumeBtn').addEventListener('click', resume);
$('#resetBtn').addEventListener('click', reset);
$('#reopenBtn').addEventListener('click', reopen);
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || paused()) return;
  if (e.key === 'ArrowLeft') go(current - 1);
  if (e.key === 'ArrowRight') go(current + 1);
  if (e.key.toLowerCase() === 'f') toggleFlag();
  if (!submitted() && /^[a-f]$/i.test(e.key)) pick(e.key.toUpperCase());
});
setInterval(renderStatus, 1000);

if (!(await api.result(id))) await save();
if (new URLSearchParams(location.search).has('resume')) reopen();
render();
