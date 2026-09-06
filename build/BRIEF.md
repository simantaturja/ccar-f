# Question-writing brief — CCAF (Claude Certified Architect – Foundations) mock exams

You are writing exam questions for a practice mock that must match the pattern of the
CCAF exam: scenario-based, 4 options (A–D), exactly one correct, every option carries its own
explanation of why it is right/wrong. Read a few questions in `mocks/quiz_ccaf_mock_1_questions.html` first (real exam-style
questions) and imitate tone, length, and depth exactly.

## Exam scenarios (verbatim, use these titles exactly)

### Customer Support Resolution Agent
You are building a customer support resolution agent using the Claude Agent SDK. The agent handles high-ambiguity requests like returns, billing disputes, and account issues. It has access to backend systems through MCP tools (get_customer, lookup_order, process_refund, escalate_to_human). Your target is 80%+ first-contact resolution while knowing when to escalate.

### Multi-Agent Research System
You are building a multi-agent research system using the Claude Agent SDK. A coordinator agent delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings, and one generates reports. The system researches topics and produces comprehensive, cited reports.

### Structured Data Extraction
You are building a structured data extraction system using Claude. The system extracts information from unstructured documents, validates output using JSON schemas, and maintains high accuracy. It must handle edge cases gracefully and integrate with downstream systems.

### Claude Code for Continuous Integration
You are integrating Claude Code into your CI/CD pipeline. The system runs automated code reviews, generates test cases, and provides feedback on pull requests. You need to design prompts that provide actionable feedback and minimize false positives.

### Developer Productivity with Claude
You are building developer productivity tooling on the Claude Agent SDK: helping engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate, and automate repetitive tasks — using the built-in tools (Read, Write, Edit, Bash, Grep, Glob) plus MCP servers.

### Code Generation with Claude Code
You are using Claude Code to accelerate software development. Your team uses it for code generation, refactoring, debugging, and documentation. You need to integrate it into your development workflow with custom slash commands, CLAUDE.md configurations, and understand when to use plan mode vs direct execution.

## Domains (use the SHORT name in the `domain` field)

| short name | what it tests |
|---|---|
| Agentic Architecture | agent loop design, single vs multi-agent, orchestrator/subagent split, delegation, escalation/stop conditions, autonomy boundaries, when an agent is/isn't the right tool, workflow vs agent, human-in-the-loop, evaluation of agent behaviour |
| Tool Design & MCP | tool naming/description, input schema design, granularity (one tool vs many), error returns to model, idempotency, MCP server/resources/prompts, tool result size, permissions, tool_choice, when to use tools vs prompt |
| Claude Code Config | CLAUDE.md (project/user/hierarchy), slash commands, hooks, settings.json permissions/allowlists, headless `claude -p`, `--output-format json`, plan mode vs direct execution, subagents (.claude/agents), MCP config in Claude Code, CI usage, memory files |
| Prompt & Structured Output | system vs user prompt, XML tags, few-shot examples, prefill, JSON schema / structured output, chain-of-thought / extended thinking, role prompting, instruction placement, long-document placement, handling refusals/hedging in output |
| Context & Reliability | context window management, compaction/summarisation, session resume, prompt caching, retries/backoff, rate limits, streaming, large tool results, checkpoints, memory across sessions, degradation strategies, cost/latency trade-offs, observability |

## Hard rules

1. **Never copy or lightly paraphrase an existing question.** The existing mocks (`docs/data/ccaf-mock-*.json`) contain every
   question already in the portal. Read the questions for each scenario you write.
   Your questions must test a *different* decision or situation. Same pattern is wanted; same question is not.
2. **No giveaway option.** A reader must not be able to find the answer by eliminating three
   obviously silly options. Concretely:
   - All four options are things a reasonable engineer might actually do. At least two distractors
     must be *defensible-sounding best practices applied in the wrong situation*.
   - The correct option must NOT be the longest, the most nuanced-sounding, or the only one with a
     qualifier ("when", "only if", "while"). Vary: sometimes correct is the shortest.
   - No absolute-language tells ("always", "never", "all", "ignore") concentrated in wrong answers.
   - Do not reuse phrasing from the question stem only in the correct option.
   - Distractors must be wrong for a *specific, explainable reason tied to the scenario* — not
     generically bad.
3. **Length parity**: options within a question within ~30 % of each other in length. Target
   90–180 characters per option, 250–550 characters per question stem (stem includes a concrete
   situation with specifics: numbers, tool names, error text, observed behaviour), 200–400 characters
   per explanation.
4. **Correct-letter balance**: across your batch, spread the correct letter roughly evenly over A/B/C/D.
5. **Explanations**: each option gets its own explanation. Wrong-option explanations must say what is
   wrong *in this situation* and what it would trade away. Correct explanation says why it beats the
   others, not just restates it. May use `<code>` and `<em>` inline tags only.
6. Use `<code>…</code>` for tool names, flags, filenames, fields. No other HTML. No markdown.
7. Ground claims in real Claude / Claude Code / Agent SDK / MCP behaviour as of 2026. Don't invent
   flags or APIs. If unsure a feature exists, don't build a question on it.
8. Question stems are self-contained: do not reference "the previous question".

## Output format

Write a single JSON file at the path you are given: an array of objects, in order, each:

```json
{
  "scenarioTitle": "<exact scenario title>",
  "domain": "<exact short domain name>",
  "prompt": "<question stem>",
  "options": [
    {"letter": "A", "text": "...", "correct": false, "explanation": "..."},
    {"letter": "B", "text": "...", "correct": true,  "explanation": "..."},
    {"letter": "C", "text": "...", "correct": false, "explanation": "..."},
    {"letter": "D", "text": "...", "correct": false, "explanation": "..."}
  ]
}
```

Exactly one `correct: true` per question. Validate the file parses with `python3 -c "import json;json.load(open(PATH))"`
and that counts per scenario match what you were asked. Report only: path written, count per scenario, correct-letter histogram.
