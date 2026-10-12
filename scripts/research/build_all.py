#!/usr/bin/env python3
"""Run every build in dependency order, then the docs generator and the cross-file checks.

Usage: .venv/bin/python -I scripts/research/build_all.py [--skip-fetch]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ORDER = [
    "build_taxes.py", "build_population.py", "build_government.py", "build_cash_levels.py", "build_laender.py",
    "build_municipal.py", "build_eu.py", "build_legal.py", "build_purchases.py",
    "build_equalisation.py", "build_funktionenplan.py", "build_federal.py", "build_wages.py", "build_household_taxes.py", "build_social.py", "build_payslip.py", "build_berlin.py", "build_docs.py", "check.py",
]


def main() -> int:
    if "--skip-fetch" not in sys.argv:
        r = subprocess.run([sys.executable, "-I", str(HERE / "fetch.py"), "--verify"], cwd=ROOT)
        if r.returncode:
            print("raw files differ from the manifest or are missing; run fetch.py first")
            return r.returncode
    for script in ORDER:
        path = HERE / script
        if not path.exists():
            print(f"skip {script} (not present)")
            continue
        print(f"\n=== {script}")
        r = subprocess.run([sys.executable, "-I", str(path)], cwd=ROOT)
        if r.returncode:
            print(f"{script} failed with {r.returncode}")
            return r.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
