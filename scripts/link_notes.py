#!/usr/bin/env python3
"""
Conta-Atlas — Inserta enlaces a "Notas" en páginas de cuentas (MX).

Lee un índice simple en:
  data/mx/notes_index.json

Y actualiza las páginas de cuentas en:
  docs/mx/plan-completo/**/index.mdx

Insertando (o reemplazando) un bloque:
  <!-- NOTES_START -->
  ...
  <!-- NOTES_END -->

para que una misma nota sea accesible desde múltiples nodos (ej. 500 y 600).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
NOTES_INDEX_PATH = REPO_ROOT / "data" / "mx" / "notes_index.json"
ACCOUNTS_PATH = REPO_ROOT / "data" / "mx" / "sat_accounts.json"
PLAN_DIR = REPO_ROOT / "docs" / "mx" / "plan-completo"

NOTES_START = "<!-- NOTES_START -->"
NOTES_END = "<!-- NOTES_END -->"

CONTENT_END = "<!-- CONTENT_END -->"


@dataclass(frozen=True)
class Note:
    title: str
    slug: str


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8", newline="\n")
    tmp.replace(path)


def build_account_path(code: str, accounts_by_code: Dict[str, Dict[str, Any]]) -> List[str]:
    parts: List[str] = []
    current = accounts_by_code.get(code)
    visiting = set()
    while current is not None:
        c = str(current.get("code"))
        if c in visiting:
            break
        visiting.add(c)
        parts.append(c)
        parent = current.get("parent_code")
        if parent is None:
            break
        current = accounts_by_code.get(str(parent))
    parts.reverse()
    return parts


def mdx_path_for_account(code: str, accounts_by_code: Dict[str, Dict[str, Any]]) -> Path:
    parts = build_account_path(code, accounts_by_code)
    return PLAN_DIR.joinpath(*parts, "index.mdx")


def block_ranges(text: str, start_marker: str, end_marker: str) -> Optional[Tuple[int, int]]:
    s = text.find(start_marker)
    if s == -1:
        return None
    e = text.find(end_marker, s + len(start_marker))
    if e == -1:
        return None
    return (s, e + len(end_marker))


def replace_or_insert_notes_block(text: str, block_body: str) -> str:
    block = f"{NOTES_START}\n{block_body.strip()}\n{NOTES_END}\n"

    existing = block_ranges(text, NOTES_START, NOTES_END)
    if existing:
        a, b = existing
        current = text[a:b]
        norm = lambda s: s.replace("\r\n", "\n").strip()  # noqa: E731
        if norm(current) == norm(block):
            return text
        return text[:a] + block + text[b:]

    # Insertar después de CONTENT_END si existe; si no, después del frontmatter; si no, al inicio.
    idx = text.find(CONTENT_END)
    if idx != -1:
        insert_at = idx + len(CONTENT_END)
        prefix = text[:insert_at]
        suffix = text[insert_at:]
        sep1 = "\n" if not prefix.endswith("\n") else ""
        sep2 = "\n" if suffix and not suffix.startswith("\n") else ""
        return prefix + sep1 + "\n" + block + sep2 + suffix

    # frontmatter al inicio
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            end = text.find("\n", end + 4)
            if end != -1:
                insert_at = end + 1
                return text[:insert_at] + "\n" + block + text[insert_at:]

    return block + "\n" + text


def format_notes_section(notes: Sequence[Note]) -> str:
    lines = ["## Notas", ""]
    for n in notes:
        lines.append(f"- [{n.title}]({n.slug})")
    return "\n".join(lines).rstrip() + "\n"


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Vincula notas a cuentas (inserta bloque NOTES_START/END).")
    p.add_argument("--dry-run", action="store_true", help="No escribe cambios; solo reporta.")
    args = p.parse_args(argv)

    if not NOTES_INDEX_PATH.exists():
        print(f"ERROR: No existe {NOTES_INDEX_PATH}", file=sys.stderr)
        return 2
    if not ACCOUNTS_PATH.exists():
        print(f"ERROR: No existe {ACCOUNTS_PATH}", file=sys.stderr)
        return 2

    raw_notes = load_json(NOTES_INDEX_PATH)
    if not isinstance(raw_notes, list):
        print(f"ERROR: {NOTES_INDEX_PATH} debe ser un array JSON.", file=sys.stderr)
        return 2

    accounts = load_json(ACCOUNTS_PATH)
    if not isinstance(accounts, list):
        print(f"ERROR: {ACCOUNTS_PATH} debe ser un array JSON.", file=sys.stderr)
        return 2
    accounts_by_code: Dict[str, Dict[str, Any]] = {str(a.get("code")): a for a in accounts if isinstance(a, dict)}

    notes_by_account: Dict[str, List[Note]] = {}
    for it in raw_notes:
        if not isinstance(it, dict):
            continue
        title = it.get("title")
        slug = it.get("slug")
        accounts_list = it.get("accounts")
        if not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(slug, str) or not slug.strip():
            continue
        if not isinstance(accounts_list, list):
            continue
        note = Note(title=title.strip(), slug=slug.strip())
        for code in accounts_list:
            code_s = str(code).strip()
            if not code_s:
                continue
            notes_by_account.setdefault(code_s, []).append(note)

    if not notes_by_account:
        print("Nada que hacer: no hay mapeos accounts[] en notes_index.json")
        return 0

    changed = 0
    missing_accounts: List[str] = []
    for code, notes in sorted(notes_by_account.items(), key=lambda kv: kv[0]):
        if code not in accounts_by_code:
            missing_accounts.append(code)
            continue
        path = mdx_path_for_account(code, accounts_by_code)
        if not path.exists():
            missing_accounts.append(code)
            continue
        original = path.read_text(encoding="utf-8")
        body = format_notes_section(notes)
        updated = replace_or_insert_notes_block(original, body)
        if updated != original:
            if not args.dry_run:
                save_text(path, updated)
            changed += 1
            print(f"[OK] {code}: {path.relative_to(REPO_ROOT)}")

    if missing_accounts:
        uniq = sorted(set(missing_accounts))
        print(f"[WARN] Códigos sin archivo/cuenta: {', '.join(uniq[:30])}{'…' if len(uniq) > 30 else ''}", file=sys.stderr)

    if args.dry_run:
        print(f"Dry-run: {changed} archivo(s) se modificarían.")
    else:
        print(f"Listo: {changed} archivo(s) modificados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
