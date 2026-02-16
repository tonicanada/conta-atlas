#!/usr/bin/env python3
"""
Conta-Atlas — Agrega bloques ENRICH a páginas existentes (para que linkify_terms.py pueda actuar).

Inserta ENRICH markers solo si no existen ya.

Casos:
  - docs/mx/plan-completo/**/*.mdx:
      Si hay CONTENT_START/CONTENT_END, envuelve el contenido interno con ENRICH_START/ENRICH_END.
  - docs/mx/esqueletos/**/*.mdx:
      Inserta ENRICH_START/ENRICH_END después del frontmatter (si existe), envolviendo el body.

Reporte:
  scripts/output/add_enrich_blocks_report.json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
PLAN_DIR = REPO_ROOT / "docs" / "mx" / "plan-completo"
ESQ_DIR = REPO_ROOT / "docs" / "mx" / "esqueletos"
REPORT_PATH = REPO_ROOT / "scripts" / "output" / "add_enrich_blocks_report.json"

CONTENT_START = "<!-- CONTENT_START -->"
CONTENT_END = "<!-- CONTENT_END -->"
ENRICH_START = "<!-- ENRICH_START -->"
ENRICH_END = "<!-- ENRICH_END -->"


@dataclass
class FileResult:
    path: str
    changed: bool
    reason: str


def iter_mdx_files(root: Path) -> Iterable[Path]:
    if not root.exists():
        return
    yield from root.rglob("*.mdx")


def split_frontmatter(text: str) -> Tuple[str, str]:
    """
    Retorna (frontmatter_or_empty, body).
    """
    if not text.startswith("---"):
        return ("", text)
    end = text.find("\n---", 3)
    if end == -1:
        return ("", text)
    end = text.find("\n", end + 4)
    if end == -1:
        return (text, "")
    return (text[:end], text[end:])


def ensure_enrich_in_content_block(text: str) -> Tuple[bool, str, str]:
    if CONTENT_START not in text or CONTENT_END not in text:
        return (False, text, "no_content_markers")
    if text.index(CONTENT_START) > text.index(CONTENT_END):
        return (False, text, "invalid_content_markers")

    s = text.index(CONTENT_START) + len(CONTENT_START)
    e = text.index(CONTENT_END)
    inner = text[s:e]
    if ENRICH_START in inner and ENRICH_END in inner:
        return (False, text, "already_has_enrich")

    new_inner = "\n" + ENRICH_START + "\n" + inner.lstrip("\n") + "\n" + ENRICH_END + "\n"
    updated = text[:s] + new_inner + text[e:]
    return (True, updated, "wrapped_content_inner")


def ensure_enrich_in_body(text: str) -> Tuple[bool, str, str]:
    if ENRICH_START in text and ENRICH_END in text:
        return (False, text, "already_has_enrich")
    fm, body = split_frontmatter(text)
    if not body.strip():
        return (False, text, "empty_body")
    wrapped = fm + "\n" + ENRICH_START + "\n" + body.lstrip("\n") + "\n" + ENRICH_END + "\n"
    return (True, wrapped, "wrapped_body")


def save_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8", newline="\n")
    tmp.replace(path)


def process_files(files: Sequence[Path], fn) -> Tuple[int, List[FileResult]]:
    changed = 0
    results: List[FileResult] = []
    for path in files:
        try:
            original = path.read_text(encoding="utf-8")
            did_change, updated, reason = fn(original)
            if did_change:
                save_text(path, updated)
                changed += 1
            results.append(FileResult(path=str(path.relative_to(REPO_ROOT)), changed=did_change, reason=reason))
        except Exception as e:  # noqa: BLE001
            results.append(FileResult(path=str(path.relative_to(REPO_ROOT)), changed=False, reason=f"error:{e}"))
    return changed, results


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Agrega bloques ENRICH para habilitar linkify_terms.py.")
    p.add_argument("--dry-run", action="store_true", help="No escribe cambios (solo reporta).")
    args = p.parse_args(argv)

    plan_files = sorted(iter_mdx_files(PLAN_DIR))
    esq_files = sorted(iter_mdx_files(ESQ_DIR))

    changed_total = 0
    results: List[Dict[str, object]] = []

    def plan_fn(text: str) -> Tuple[bool, str, str]:
        return ensure_enrich_in_content_block(text)

    def esq_fn(text: str) -> Tuple[bool, str, str]:
        return ensure_enrich_in_body(text)

    if args.dry_run:
        # simula cambios sin escribir
        for path in plan_files:
            original = path.read_text(encoding="utf-8")
            did_change, _, reason = plan_fn(original)
            results.append({"path": str(path.relative_to(REPO_ROOT)), "kind": "plan-completo", "would_change": did_change, "reason": reason})
            changed_total += int(did_change)
        for path in esq_files:
            original = path.read_text(encoding="utf-8")
            did_change, _, reason = esq_fn(original)
            results.append({"path": str(path.relative_to(REPO_ROOT)), "kind": "esqueletos", "would_change": did_change, "reason": reason})
            changed_total += int(did_change)
    else:
        changed_plan, plan_res = process_files(plan_files, plan_fn)
        changed_esq, esq_res = process_files(esq_files, esq_fn)
        changed_total = changed_plan + changed_esq
        for r in plan_res:
            results.append({"path": r.path, "kind": "plan-completo", "changed": r.changed, "reason": r.reason})
        for r in esq_res:
            results.append({"path": r.path, "kind": "esqueletos", "changed": r.changed, "reason": r.reason})

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps({"changed_total": changed_total, "results": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.dry_run:
        print(f"Dry-run: {changed_total} archivo(s) tendrían cambios. Reporte: {REPORT_PATH.relative_to(REPO_ROOT)}")
    else:
        print(f"Listo: {changed_total} archivo(s) modificados. Reporte: {REPORT_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

