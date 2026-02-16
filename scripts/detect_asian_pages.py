#!/usr/bin/env python3
"""
Conta-Atlas — Detector (y re-generador) de páginas con caracteres CJK/asiáticos.

Uso:
  - Solo detectar (recomendado primero):
      python3 scripts/detect_asian_pages.py

  - Rehacer contenido en docs/mx/plan-completo para las páginas detectadas:
      python3 scripts/detect_asian_pages.py --rewrite --batch 10

Notas:
  - La detección busca caracteres en rangos Unicode típicos de CJK (Hanzi/Kanji),
    Hiragana/Katakana, Hangul y puntuación full-width.
  - La re-generación usa la misma lógica/prompt que scripts/gen_content.py
    (Ollama local vía OLLAMA_URL y modelo OLLAMA_MODEL).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCAN_DIRS = [
    REPO_ROOT / "docs" / "mx" / "plan-completo",
    REPO_ROOT / "docs" / "mx" / "esqueletos",
    REPO_ROOT / "docs" / "mx" / "glosario",
]

REPORT_PATH = REPO_ROOT / "scripts" / "output" / "asian_pages_report.json"

GEN_CONTENT_PATH = REPO_ROOT / "scripts" / "gen_content.py"
BUILD_GLOSSARY_PATH = REPO_ROOT / "scripts" / "build_glossary.py"
GLOSSARY_TERMS_PATH = REPO_ROOT / "data" / "mx" / "glossary_terms.json"

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b-instruct")

# Unicode ranges (no exhaustivo) para caracteres "asiáticos":
# - Hiragana, Katakana
# - CJK Unified Ideographs (Han) + Extension A
# - Hangul syllables
# - CJK Compatibility Ideographs
# - CJK Symbols and Punctuation
# - Halfwidth and Fullwidth Forms
ASIAN_RE = re.compile(
    r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\u3000-\u303f\uff00-\uffef]"
)


@dataclass(frozen=True)
class Finding:
    path: str
    match_count: int
    sample: str
    kind: str
    account_code: Optional[str] = None


def iter_mdx_files(dirs: Sequence[Path]) -> Iterable[Path]:
    for d in dirs:
        if not d.exists():
            continue
        yield from d.rglob("*.mdx")


def sample_context(text: str, max_len: int = 160) -> str:
    m = ASIAN_RE.search(text)
    if not m:
        return ""
    start = max(0, m.start() - 40)
    end = min(len(text), m.end() + 80)
    snippet = text[start:end].replace("\n", " ")
    if len(snippet) > max_len:
        snippet = snippet[: max_len - 1] + "…"
    return snippet


def extract_account_code_if_plan_completo(path: Path) -> Optional[str]:
    # docs/mx/plan-completo/<...>/<code>/index.mdx => code es el nombre del directorio padre
    try:
        rel = path.relative_to(REPO_ROOT)
    except Exception:  # noqa: BLE001
        return None

    parts = rel.parts
    if len(parts) < 5:
        return None
    if parts[0:3] != ("docs", "mx", "plan-completo"):
        return None
    if path.name != "index.mdx":
        return None
    code = path.parent.name
    # Código típico SAT: 0, 3 dígitos, o 3 dígitos + . + 1-2 dígitos
    if re.fullmatch(r"(0|[1-9]\d{2})(?:\.\d{1,2})?", code) is None:
        return None
    return code


def load_gen_content_module() -> Any:
    if not GEN_CONTENT_PATH.exists():
        raise RuntimeError(f"No existe {GEN_CONTENT_PATH}")
    spec = importlib.util.spec_from_file_location("_gen_content", GEN_CONTENT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("No se pudo cargar scripts/gen_content.py como módulo.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_build_glossary_module() -> Any:
    if not BUILD_GLOSSARY_PATH.exists():
        raise RuntimeError(f"No existe {BUILD_GLOSSARY_PATH}")
    spec = importlib.util.spec_from_file_location("_build_glossary", BUILD_GLOSSARY_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("No se pudo cargar scripts/build_glossary.py como módulo.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def file_kind(path: Path) -> str:
    try:
        rel = path.relative_to(REPO_ROOT).as_posix()
    except Exception:  # noqa: BLE001
        return "unknown"
    if rel.startswith("docs/mx/plan-completo/"):
        return "plan-completo"
    if rel.startswith("docs/mx/glosario/"):
        return "glosario"
    if rel.startswith("docs/mx/esqueletos/"):
        return "esqueletos"
    return "other"


def detect(dirs: Sequence[Path]) -> List[Finding]:
    findings: List[Finding] = []
    for path in sorted(iter_mdx_files(dirs)):
        try:
            text = path.read_text(encoding="utf-8")
        except Exception as e:  # noqa: BLE001
            findings.append(
                Finding(
                    path=str(path.relative_to(REPO_ROOT)),
                    match_count=-1,
                    sample=f"(error leyendo archivo: {e})",
                    kind=file_kind(path),
                )
            )
            continue

        matches = ASIAN_RE.findall(text)
        if not matches:
            continue

        code = extract_account_code_if_plan_completo(path)
        findings.append(
            Finding(
                path=str(path.relative_to(REPO_ROOT)),
                match_count=len(matches),
                sample=sample_context(text),
                kind=file_kind(path),
                account_code=code,
            )
        )
    return findings


def save_report(findings: Sequence[Finding]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    by_kind: Dict[str, int] = {}
    for f in findings:
        if f.match_count and f.match_count > 0:
            by_kind[f.kind] = by_kind.get(f.kind, 0) + 1
    payload = {
        "ollama_url": OLLAMA_URL,
        "ollama_model": OLLAMA_MODEL,
        "total_files_with_matches": len([f for f in findings if f.match_count and f.match_count > 0]),
        "files_with_matches_by_kind": dict(sorted(by_kind.items(), key=lambda kv: (-kv[1], kv[0]))),
        "findings": [
            {
                "path": f.path,
                "match_count": f.match_count,
                "kind": f.kind,
                "account_code": f.account_code,
                "sample": f.sample,
            }
            for f in findings
        ],
    }
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def rewrite_plan_completo(findings: Sequence[Finding], batch: int) -> Tuple[int, int]:
    """
    Rehace contenido SOLO para páginas de plan-completo donde podamos inferir el código de cuenta.
    Retorna: (rewritten, errors)
    """
    gen = load_gen_content_module()

    accounts_path = getattr(gen, "ACCOUNTS_PATH", REPO_ROOT / "data" / "mx" / "sat_accounts.json")
    state_path = getattr(gen, "STATE_PATH", REPO_ROOT / "data" / "mx" / "generation_state.json")

    accounts = gen.load_json(accounts_path)
    if not isinstance(accounts, list):
        raise RuntimeError(f"Formato inválido en {accounts_path} (se esperaba lista).")

    state = gen.load_or_init_state()
    state.setdefault("accounts", {})
    state.setdefault("meta", {})
    state["meta"]["model"] = OLLAMA_MODEL

    by_code, children_by_parent = gen.build_indexes(accounts)
    known_codes = by_code.keys()

    targets: List[str] = []
    for f in findings:
        if f.kind != "plan-completo":
            continue
        if not f.account_code:
            continue
        if f.account_code in by_code:
            targets.append(f.account_code)

    # Dedup preservando orden
    seen = set()
    targets = [c for c in targets if not (c in seen or seen.add(c))]
    if batch > 0:
        targets = targets[:batch]

    rewritten = 0
    errors = 0
    for code in targets:
        try:
            account = by_code.get(code)
            if not account:
                continue
            mdx_path = gen.mdx_path_for_account(code, by_code)
            if not mdx_path.exists():
                raise gen.GenerationError(f"No existe el MDX destino: {mdx_path.relative_to(REPO_ROOT)}")

            mdx_text = mdx_path.read_text(encoding="utf-8")
            prompt = gen.build_prompt(account, by_code, children_by_parent)
            ai_text = gen.call_ollama(prompt, model=OLLAMA_MODEL)
            ai_text = gen.sanitize_ai_output(ai_text)
            ai_text = gen.linkify_bare_urls(ai_text)
            gen.validate_no_unknown_codes(ai_text, known_codes)

            new_mdx = gen.insert_or_replace_content(mdx_text, ai_text)
            mdx_path.write_text(new_mdx, encoding="utf-8")
            gen.mark_done(state, code, OLLAMA_MODEL)
            gen.save_json(state_path, state)
            rewritten += 1
            print(f"[OK] Rehecho {code} ({mdx_path.relative_to(REPO_ROOT)})")

        except Exception as e:  # noqa: BLE001
            errors += 1
            try:
                gen.mark_error(state, code, OLLAMA_MODEL, str(e))
                gen.save_json(state_path, state)
            except Exception:  # noqa: BLE001
                pass
            print(f"[ERROR] {code}: {e}", file=sys.stderr)

    return rewritten, errors


def parse_glossary_frontmatter_title_and_tags(text: str) -> Tuple[Optional[str], List[str]]:
    # Parse mínimo (frontmatter al inicio):
    if not text.startswith("---"):
        return (None, [])
    end = text.find("\n---", 3)
    if end == -1:
        return (None, [])
    fm = text[3 : end + 1]
    title = None
    tags: List[str] = []
    for line in fm.splitlines():
        if line.strip().startswith("title:"):
            title = line.split(":", 1)[1].strip().strip('"').strip("'")
        if line.strip().startswith("tags:"):
            raw = line.split(":", 1)[1].strip()
            m = re.match(r"^\[(.*)\]\s*$", raw)
            if m:
                inner = m.group(1).strip()
                if inner:
                    tags = [t.strip() for t in inner.split(",") if t.strip()]
    return (title, tags)


def rewrite_glossary(findings: Sequence[Finding], batch: int) -> Tuple[int, int]:
    """
    Rehace contenido SOLO para docs/mx/glosario/*.mdx detectados.
    Mantiene frontmatter y reemplaza el bloque GLOSSARY_START/END.
    """
    bg = load_build_glossary_module()

    # Cargar metadata (aliases/notes) desde glossary_terms.json si existe.
    terms_meta: Dict[str, Dict[str, Any]] = {}
    if GLOSSARY_TERMS_PATH.exists():
        try:
            raw = json.loads(GLOSSARY_TERMS_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, list):
                for it in raw:
                    term = it.get("term") if isinstance(it, dict) else None
                    if isinstance(term, str) and term.strip():
                        terms_meta[term.strip()] = it
        except Exception:  # noqa: BLE001
            terms_meta = {}

    paths: List[Path] = []
    for f in findings:
        if f.kind != "glosario":
            continue
        paths.append(REPO_ROOT / f.path)

    # Dedup + batch
    seen = set()
    uniq: List[Path] = []
    for p in paths:
        if p in seen:
            continue
        seen.add(p)
        uniq.append(p)
    if batch > 0:
        uniq = uniq[:batch]

    rewritten = 0
    errors = 0
    for path in uniq:
        try:
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            title, tags = parse_glossary_frontmatter_title_and_tags(text)
            if not title:
                raise RuntimeError("No se pudo leer title del frontmatter.")

            meta = terms_meta.get(title, {})
            aliases = meta.get("aliases") if isinstance(meta.get("aliases"), list) else []
            aliases = [str(a).strip() for a in aliases if str(a).strip()]
            notes = str(meta.get("notes", "") or "")

            prompt = bg.build_prompt(term=title, tags=tags, aliases=aliases, notes=notes)
            body = bg.ollama_generate(prompt)
            new_text = bg.insert_or_replace_block(text, body)
            path.write_text(new_text, encoding="utf-8")
            rewritten += 1
            print(f"[OK] Rehecho glosario: {path.relative_to(REPO_ROOT)}")

        except Exception as e:  # noqa: BLE001
            errors += 1
            print(f"[ERROR] glosario {path.relative_to(REPO_ROOT)}: {e}", file=sys.stderr)

    return rewritten, errors


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Detecta páginas con caracteres asiáticos y opcionalmente rehace contenido.")
    p.add_argument(
        "--rewrite",
        action="store_true",
        help="Rehacer contenido en plan-completo y glosario para las páginas detectadas.",
    )
    p.add_argument("--batch-plan", type=int, default=10, help="Máximo de páginas plan-completo a rehacer (si --rewrite).")
    p.add_argument("--batch-glossary", type=int, default=10, help="Máximo de términos de glosario a rehacer (si --rewrite).")
    args = p.parse_args(argv)

    findings = detect(DEFAULT_SCAN_DIRS)
    save_report(findings)

    with_matches = [f for f in findings if f.match_count and f.match_count > 0]
    print(f"Encontradas {len(with_matches)} página(s) con caracteres asiáticos. Reporte: {REPORT_PATH.relative_to(REPO_ROOT)}")

    if not args.rewrite:
        print("Siguiente paso (opcional): ejecuta con --rewrite para rehacer contenido en plan-completo y glosario.")
        return 0

    if args.batch_plan <= 0 or args.batch_glossary <= 0:
        print("ERROR: --batch-plan y --batch-glossary deben ser > 0", file=sys.stderr)
        return 2

    rewritten_plan, errors_plan = rewrite_plan_completo(with_matches, batch=args.batch_plan)
    rewritten_glossary, errors_glossary = rewrite_glossary(with_matches, batch=args.batch_glossary)
    rewritten = rewritten_plan + rewritten_glossary
    errors = errors_plan + errors_glossary

    # Re-scan rápido para las mismas rutas (indicativo, no exhaustivo)
    findings_after = detect([REPO_ROOT / "docs" / "mx" / "plan-completo"])
    still = {f.account_code for f in findings_after if f.account_code}
    if rewritten and still:
        print(f"Aviso: aún se detectan caracteres asiáticos en {len(still)} cuenta(s) de plan-completo.", file=sys.stderr)

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
