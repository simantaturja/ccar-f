"""Extract question sets from mocks/*.html into docs/data/<exam-id>.json plus docs/data/index.json."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCKS = ROOT / "mocks"
OUT = ROOT / "docs" / "data"

SCENARIO_TEXT = {
    'Customer Support Resolution Agent':
        'You are building a customer support resolution agent using the Claude Agent SDK. The agent handles high-ambiguity requests like returns, billing disputes, and account issues. It has access to backend systems through MCP tools (get_customer, lookup_order, process_refund, escalate_to_human). Your target is 80%+ first-contact resolution while knowing when to escalate.',
    'Multi-Agent Research System':
        'You are building a multi-agent research system using the Claude Agent SDK. A coordinator agent delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings, and one generates reports. The system researches topics and produces comprehensive, cited reports.',
    'Structured Data Extraction':
        'You are building a structured data extraction system using Claude. The system extracts information from unstructured documents, validates output using JSON schemas, and maintains high accuracy. It must handle edge cases gracefully and integrate with downstream systems.',
    'Claude Code for Continuous Integration':
        'You are integrating Claude Code into your CI/CD pipeline. The system runs automated code reviews, generates test cases, and provides feedback on pull requests. You need to design prompts that provide actionable feedback and minimize false positives.',
    'Developer Productivity with Claude':
        'You are building developer productivity tooling on the Claude Agent SDK: helping engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate, and automate repetitive tasks — using the built-in tools (Read, Write, Edit, Bash, Grep, Glob) plus MCP servers.',
    'Code Generation with Claude Code':
        'You are using Claude Code to accelerate software development. Your team uses it for code generation, refactoring, debugging, and documentation. You need to integrate it into your development workflow with custom slash commands, CLAUDE.md configurations, and understand when to use plan mode vs direct execution.',
}

DOMAINS = [
    ("Agentic Architecture & Orchestration", ("agentic architecture",)),
    ("Tool Design & MCP Integration", ("tool design",)),
    ("Claude Code Configuration & Workflows", ("claude code config",)),
    ("Prompt Engineering & Structured Output", ("prompt",)),
    ("Context Management & Reliability", ("context",)),
]

SCENARIOS = [
    ("Customer Support Resolution Agent", ("customer support",)),
    ("Multi-Agent Research System", ("multi-agent research",)),
    ("Structured Data Extraction", ("structured data extraction",)),
    ("Claude Code for Continuous Integration", ("continuous integration", "ci/cd")),
    ("Developer Productivity with Claude", ("developer productivity",)),
    ("Code Generation with Claude Code", ("code generation", "accelerate software development")),
]


def pick(table, text):
    low = text.lower()
    for name, keys in table:
        if any(k in low for k in keys):
            return name
    return None


def canonical_domain(raw):
    name = pick(DOMAINS, raw.split("—")[-1])
    if not name:
        sys.exit(f"unmapped domain: {raw!r}")
    return name


def split_prompt(q):
    """Return (scenario_title, scenario_text, question_text)."""
    parts = [p.strip() for p in q["prompt"].split("\n\n") if p.strip()]
    question = parts[-1]
    scenario_parts = parts[:-1]
    title = None

    if "—" in q["domain"] and not scenario_parts:
        title = q["domain"].split("—")[0].strip()

    if scenario_parts:
        m = re.match(r"^Scenario:\s*(.+)$", scenario_parts[0])
        if m:
            title = m.group(1).strip()
            scenario_parts = scenario_parts[1:]
        m = re.match(r"^SCENARIO\s+—\s+([^.]+)\.\s*(.*)$", scenario_parts[0], re.S) if scenario_parts else None
        if m:
            title = m.group(1).strip()
            scenario_parts[0] = m.group(2).strip()

    text = "\n\n".join(scenario_parts)
    if not title and text:
        title = pick(SCENARIOS, text)
    return title, text, question


def exam_id(path):
    name = path.stem.removeprefix("quiz_")
    m = re.match(r"ccaf_mock_(\d+)_", name)
    if m:
        return f"ccaf-mock-{m.group(1)}"
    sys.exit(f"unknown mock file: {path.name}")


def convert(path):
    html = path.read_text()
    raw = json.loads(re.search(r"const QUESTIONS = (\[.*?\]);\n", html, re.S).group(1))
    title = re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S).group(1)).strip()
    questions = []
    for i, q in enumerate(raw):
        s_title, s_text, question = split_prompt(q)
        correct = [o["letter"] for o in q["options"] if o["correct"]]
        assert correct, f"{path.name} Q{i+1} has no correct option"
        questions.append({
            "n": i + 1,
            "domain": canonical_domain(q["domain"]),
            "scenarioTitle": s_title,
            "scenario": s_text,
            "question": question,
            "multi": len(correct) > 1,
            "options": [{"letter": o["letter"], "text": o["text"], "correct": o["correct"],
                         "explanation": o["explanation"]} for o in q["options"]],
            "overall": q.get("overall", ""),
        })
    assert len(questions) == 60, f"{path.name}: expected 60 questions, got {len(questions)}"
    return {"id": exam_id(path), "title": title, "questions": questions}


def main():
    OUT.mkdir(exist_ok=True)
    index = []
    exams = [convert(p) for p in sorted(MOCKS.glob("*.html"))]
    # Mocks carry only scenario titles; fill the description from SCENARIO_TEXT (or another set that has it).
    texts = dict(SCENARIO_TEXT)
    texts.update({q["scenarioTitle"]: q["scenario"] for e in exams for q in e["questions"] if q["scenario"]})
    for exam in exams:
        for q in exam["questions"]:
            if not q["scenario"]:
                q["scenario"] = texts.get(q["scenarioTitle"], "")
        (OUT / f"{exam['id']}.json").write_text(json.dumps(exam, ensure_ascii=False, indent=1))
        index.append({"id": exam["id"], "title": exam["title"], "count": len(exam["questions"]),
                      "multi": sum(q["multi"] for q in exam["questions"])})
        print(f"{exam['id']:28} {exam['title']}")
    index.sort(key=lambda e: e["id"])
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
