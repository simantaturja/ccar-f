"""Assemble build/mock<N>/*.json into mocks/quiz_ccaf_mock_<N>_questions.html using mock 1's page shell."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOMAIN_ORDER = ["agentic", "tool", "config", "prompt", "context"]
SHELL = ROOT / "mocks" / "quiz_ccaf_mock_1_questions.html"


def main(n):
    src = ROOT / "build" / f"mock{n}"
    questions = []
    for name in DOMAIN_ORDER:
        for q in json.loads((src / f"{name}.json").read_text()):
            assert sum(o["correct"] for o in q["options"]) == 1, q["prompt"][:80]
            assert [o["letter"] for o in q["options"]] == list("ABCD"), q["prompt"][:80]
            questions.append({
                "prompt": q["prompt"],
                "options": q["options"],
                "overall": "",
                "domain": f"{q['scenarioTitle']} — {q['domain']}",
            })
    assert len(questions) == 60, len(questions)
    html = SHELL.read_text()
    title = f"CCAF Mock #{n} — 60 Questions by Topic"
    html = re.sub(r"<h1>.*?</h1>", f"<h1>{title}</h1>", html, count=1)
    html = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", html, count=1)
    html = re.sub(r"const QUESTIONS = \[.*?\];\n",
                  lambda _: "const QUESTIONS = " + json.dumps(questions, ensure_ascii=False) + ";\n",
                  html, count=1, flags=re.S)
    out = ROOT / "mocks" / f"quiz_ccaf_mock_{n}_questions.html"
    out.write_text(html)
    print(out, len(questions))


if __name__ == "__main__":
    main(int(sys.argv[1]))
