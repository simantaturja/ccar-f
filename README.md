# CCAF Exam Portal

Practice-exam portal for the **Claude Certified Architect – Foundations (CCAF)** exam. Five 60-question
mock exams, scenario-based, one correct answer per question, with an explanation for every option.

Static site, no backend. Results are saved in your browser (localStorage).

## Use it

Open the hosted site (GitHub Pages, served from `docs/`), or run locally:

```sh
npm start            # http://localhost:4321  (python3 -m http.server)
npm test             # renderer + timer tests
```

- **Exam mode**: two-pane layout (scenario left, question right), prev/next, flag, strike-out options,
  soft 90-minute timer with pause, no feedback until **Submit exam**.
- **Review mode**: after submit, every question shows your pick, the correct answer and all explanations.
  **Reset exam** clears that exam's saved result only.
- **Dashboard**: per-exam status, per-domain accuracy across all submitted exams, weak domains (< 75 %)
  and a list of missed questions linking straight into review.

## Add a mock

1. Write 12 questions per domain as `build/mock<N>/{agentic,tool,config,prompt,context}.json`
   following `build/BRIEF.md` (see `build/mock2/` for the shape).
2. `python3 scripts/lint_mock.py <N>` — giveaway heuristics (letter balance, longest-is-correct, length parity).
3. `python3 scripts/assemble_mock.py <N>` — builds `mocks/quiz_ccaf_mock_<N>_questions.html`.
4. `npm run extract` — regenerates `docs/data/*.json` and `docs/data/index.json`.

## Layout

```
docs/       site root (index.html, exam.html, js/, css/, data/)
mocks/      source HTML question sets, one per mock
build/      question-writing brief + per-mock question JSON
scripts/    extract.py, assemble_mock.py, lint_mock.py
tests/      node --test
```

## Disclaimer

Community-written practice material. Not affiliated with or endorsed by Anthropic. Questions are
written to match the exam's style and domains, not copied from it.
