"""Heuristic giveaway checks on build/mock<N>/*.json: letter balance, correct-is-longest rate, length parity."""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def plain(s):
    return re.sub(r"<[^>]+>", "", s)


def main(n):
    src = ROOT / "build" / f"mock{n}"
    letters, longest, flagged = Counter(), 0, []
    qs = [q for f in sorted(src.glob("*.json")) for q in json.loads(f.read_text())]
    for q in qs:
        lens = [len(plain(o["text"])) for o in q["options"]]
        ci = next(i for i, o in enumerate(q["options"]) if o["correct"])
        letters[q["options"][ci]["letter"]] += 1
        if lens[ci] == max(lens):
            longest += 1
        spread = max(lens) / max(1, min(lens))
        if spread > 1.5:
            flagged.append((f"parity {spread:.2f}", q["prompt"][:70]))
        for o in q["options"]:
            if re.search(r"\b(always|never|ignore|all|completely|simply)\b", plain(o["text"]), re.I) and not o["correct"]:
                flagged.append(("absolute-word in distractor", q["prompt"][:70]))
                break
    print(f"questions={len(qs)} letters={dict(letters)} correct_is_longest={longest}/{len(qs)}")
    for f in flagged:
        print("  ", *f)


if __name__ == "__main__":
    main(int(sys.argv[1]))
