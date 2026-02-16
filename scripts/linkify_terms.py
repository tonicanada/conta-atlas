#!/usr/bin/env python3
"""
Conta-Atlas — Linkify de términos del glosario (MX) dentro de bloques ENRICH.

Reglas:
  - Lee términos del glosario existente: docs/mx/glosario/*.mdx (frontmatter title/slug).
  - Recorre:
      docs/mx/plan-completo/**/*.mdx
      docs/mx/esqueletos/**/*.mdx
  - Solo modifica contenido dentro de:
      <!-- ENRICH_START --> ... <!-- ENRICH_END -->
    (Si el bloque no existe, no toca el archivo.)
  - Reemplaza ocurrencias exactas de términos por:
      [UFIN](/mx/glosario/ufin)
  - No linkifica dentro de código (``` o `...`) ni dentro de URLs/links existentes.
  - Escribe reporte JSON en: scripts/output/linkify_terms_report.json
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
GLOSSARY_DIR = REPO_ROOT / "docs" / "mx" / "glosario"
TARGET_DIRS = [
    REPO_ROOT / "docs" / "mx" / "plan-completo",
    REPO_ROOT / "docs" / "mx" / "esqueletos",
]
REPORT_PATH = REPO_ROOT / "scripts" / "output" / "linkify_terms_report.json"

ENRICH_START = "<!-- ENRICH_START -->"
ENRICH_END = "<!-- ENRICH_END -->"


FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
TITLE_RE = re.compile(r"(?m)^\s*title:\s*(.+?)\s*$")
SLUG_RE = re.compile(r"(?m)^\s*slug:\s*(.+?)\s*$")

URL_RE = re.compile(r"https?://\S+")
AUTOLINK_RE = re.compile(r"<https?://[^>]+>")
MD_LINK_RE = re.compile(r"\[[^\]]+\]\([^)]+\)")


@dataclass(frozen=True)
class TermLink:
    term: str
    href: str


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def save_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8", newline="\n")
    tmp.replace(path)


def parse_frontmatter(text: str) -> Dict[str, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    fm = m.group(1)
    out: Dict[str, str] = {}
    mt = TITLE_RE.search(fm)
    ms = SLUG_RE.search(fm)
    if mt:
        out["title"] = mt.group(1).strip().strip('"').strip("'")
    if ms:
        out["slug"] = ms.group(1).strip().strip('"').strip("'")
    return out


def load_glossary_terms() -> List[TermLink]:
    if not GLOSSARY_DIR.exists():
        return []
    terms: List[TermLink] = []
    for path in sorted(GLOSSARY_DIR.glob("*.mdx")):
        try:
            text = load_text(path)
        except Exception:  # noqa: BLE001
            continue
        fm = parse_frontmatter(text)
        title = fm.get("title")
        slug = fm.get("slug")
        if not title or not slug:
            continue
        terms.append(TermLink(term=title, href=slug))

    # Ordena por longitud desc para priorizar frases sobre acrónimos (IVA acreditable antes que IVA)
    terms.sort(key=lambda t: (-len(t.term), t.term.lower()))
    return terms


def find_block_ranges(text: str, start_marker: str, end_marker: str) -> List[Tuple[int, int]]:
    ranges: List[Tuple[int, int]] = []
    start = 0
    while True:
        s = text.find(start_marker, start)
        if s == -1:
            break
        e = text.find(end_marker, s + len(start_marker))
        if e == -1:
            break
        inner_start = s + len(start_marker)
        inner_end = e
        ranges.append((inner_start, inner_end))
        start = e + len(end_marker)
    return ranges


def protected_ranges(block: str) -> List[Tuple[int, int]]:
    """
    Devuelve rangos [start,end) dentro del bloque donde NO debemos reemplazar:
      - code fences ```...```
      - inline code `...`
      - markdown links [..](..)
      - autolinks <http...>
      - URLs sueltas
    """
    ranges: List[Tuple[int, int]] = []

    # code fences
    i = 0
    while True:
        s = block.find("```", i)
        if s == -1:
            break
        e = block.find("```", s + 3)
        if e == -1:
            ranges.append((s, len(block)))
            break
        ranges.append((s, e + 3))
        i = e + 3

    # inline code (solo fuera de fences)
    def inside_any(pos: int) -> bool:
        return any(a <= pos < b for a, b in ranges)

    i = 0
    while True:
        s = block.find("`", i)
        if s == -1:
            break
        if inside_any(s):
            i = s + 1
            continue
        e = block.find("`", s + 1)
        if e == -1:
            break
        ranges.append((s, e + 1))
        i = e + 1

    # markdown links and autolinks
    for m in MD_LINK_RE.finditer(block):
        ranges.append((m.start(), m.end()))
    for m in AUTOLINK_RE.finditer(block):
        ranges.append((m.start(), m.end()))
    for m in URL_RE.finditer(block):
        ranges.append((m.start(), m.end()))

    # normalizar/merge
    ranges.sort()
    merged: List[Tuple[int, int]] = []
    for a, b in ranges:
        if not merged:
            merged.append((a, b))
            continue
        la, lb = merged[-1]
        if a <= lb:
            merged[-1] = (la, max(lb, b))
        else:
            merged.append((a, b))
    return merged


def replace_in_unprotected(block: str, terms: Sequence[TermLink], counts: Dict[str, int]) -> str:
    """
    Reemplaza términos en el bloque fuera de rangos protegidos.
    """
    prot = protected_ranges(block)
    if not prot:
        return _replace_terms(block, terms, counts)

    out_parts: List[str] = []
    last = 0
    for a, b in prot:
        if last < a:
            out_parts.append(_replace_terms(block[last:a], terms, counts))
        out_parts.append(block[a:b])
        last = b
    if last < len(block):
        out_parts.append(_replace_terms(block[last:], terms, counts))
    return "".join(out_parts)


def _replace_terms(text: str, terms: Sequence[TermLink], counts: Dict[str, int]) -> str:
    """
    Reemplazo en una sola pasada (evita link-anidado al procesar frases + acrónimos).
    """
    if not terms or not text:
        return text

    # Importante: `terms` ya viene ordenado por longitud desc para priorizar frases.
    alternation = "|".join(re.escape(t.term) for t in terms)
    pattern = re.compile(rf"(?<!\w)({alternation})(?!\w)")
    href_by_term = {t.term: t.href for t in terms}

    def _sub(m: re.Match[str]) -> str:
        matched = m.group(1)
        href = href_by_term.get(matched)
        if not href:
            return matched
        counts[matched] = counts.get(matched, 0) + 1
        return f"[{matched}]({href})"

    return pattern.sub(_sub, text)


def process_file(path: Path, terms: Sequence[TermLink]) -> Tuple[bool, Dict[str, int], str]:
    """
    Retorna: (changed, counts_in_file, new_text_or_original)
    """
    original = load_text(path)
    ranges = find_block_ranges(original, ENRICH_START, ENRICH_END)
    if not ranges:
        return (False, {}, original)

    counts: Dict[str, int] = {}
    parts: List[str] = []
    last = 0
    for a, b in ranges:
        parts.append(original[last:a])
        inner = original[a:b]
        parts.append(replace_in_unprotected(inner, terms, counts))
        last = b
    parts.append(original[last:])
    updated = "".join(parts)
    return (updated != original, counts, updated)


def iter_target_files() -> Iterable[Path]:
    for d in TARGET_DIRS:
        if not d.exists():
            continue
        yield from d.rglob("*.mdx")


def main(argv: Optional[Sequence[str]] = None) -> int:
    _ = argv
    terms = load_glossary_terms()
    if not terms:
        print("ERROR: No se encontraron términos del glosario (docs/mx/glosario/*.mdx).", file=sys.stderr)
        return 2

    global_counts: Dict[str, int] = {t.term: 0 for t in terms}
    files_report: List[Dict[str, object]] = []
    changed_files = 0
    scanned_files = 0

    for path in sorted(iter_target_files()):
        scanned_files += 1
        try:
            changed, counts, updated = process_file(path, terms)
        except Exception as e:  # noqa: BLE001
            files_report.append({"path": str(path.relative_to(REPO_ROOT)), "error": str(e)})
            continue

        for k, v in counts.items():
            global_counts[k] = global_counts.get(k, 0) + v

        if changed:
            save_text(path, updated)
            changed_files += 1

        if counts:
            files_report.append(
                {
                    "path": str(path.relative_to(REPO_ROOT)),
                    "changed": bool(changed),
                    "replacements": int(sum(counts.values())),
                    "terms": {k: int(v) for k, v in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))},
                }
            )

    unlinked = [k for k, v in sorted(global_counts.items(), key=lambda kv: kv[0].lower()) if v == 0]
    report = {
        "scanned_files": scanned_files,
        "changed_files": changed_files,
        "terms_total": len(terms),
        "terms_unlinked": unlinked,
        "terms_counts": {k: int(v) for k, v in sorted(global_counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))},
        "files": files_report,
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Listo. Escaneados: {scanned_files}. Modificados: {changed_files}. Reporte: {REPORT_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
