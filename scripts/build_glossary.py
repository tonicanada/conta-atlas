#!/usr/bin/env python3
"""
Conta-Atlas — Generador de entradas de glosario (MX) en MDX usando Ollama (IA local).

Lee términos desde:
  data/mx/glossary_terms.json

Y crea/actualiza un MDX por término en:
  docs/mx/glosario/<slug>.mdx

El contenido generado se inserta entre:
  <!-- GLOSSARY_START -->
  <!-- GLOSSARY_END -->

Nota: En esta fase NO se navega la web; "Fuentes" queda como "Pendiente".
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
TERMS_PATH = REPO_ROOT / "data" / "mx" / "glossary_terms.json"
GLOSSARY_DIR = REPO_ROOT / "docs" / "mx" / "glosario"

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b-instruct")

GLOSSARY_START = "<!-- GLOSSARY_START -->"
GLOSSARY_END = "<!-- GLOSSARY_END -->"


class GenerationError(Exception):
    pass


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="\n") as f:
        f.write(content)
        if not content.endswith("\n"):
            f.write("\n")
    tmp.replace(path)


def slugify(value: str) -> str:
    """
    Convierte un término a un slug seguro para filename/URL:
      - minúsculas
      - sin acentos
      - espacios y símbolos -> '-'
      - colapsa guiones
    """
    value = value.strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    value = re.sub(r"-{2,}", "-", value)
    return value or "termino"


def normalize_term_key(term: str) -> str:
    return unicodedata.normalize("NFKC", term).strip().lower()


def parse_terms_filter(raw: Optional[str]) -> Optional[set[str]]:
    if not raw:
        return None
    parts = [p.strip() for p in raw.split(",")]
    parts = [p for p in parts if p]
    return {normalize_term_key(p) for p in parts} if parts else None


def mdx_has_markers(text: str) -> bool:
    return GLOSSARY_START in text and GLOSSARY_END in text and text.index(GLOSSARY_START) < text.index(GLOSSARY_END)


def insert_or_replace_block(mdx_text: str, new_block: str) -> str:
    if not mdx_has_markers(mdx_text):
        lines = mdx_text.splitlines(keepends=True)
        insert_at = 0
        if lines and lines[0].strip() == "---":
            for i in range(1, len(lines)):
                if lines[i].strip() == "---":
                    insert_at = i + 1
                    break

        before = "".join(lines[:insert_at])
        after = "".join(lines[insert_at:])
        marker_block = (
            ("\n" if before and not before.endswith("\n") else "")
            + f"{GLOSSARY_START}\n{GLOSSARY_END}\n"
            + ("\n" if after and not after.startswith("\n") else "")
        )
        mdx_text = before + marker_block + after

    start = mdx_text.index(GLOSSARY_START) + len(GLOSSARY_START)
    end = mdx_text.index(GLOSSARY_END)
    before = mdx_text[:start]
    after = mdx_text[end:]
    content = "\n" + new_block.strip() + "\n"
    return before + content + after


def build_frontmatter(title: str, slug: str, tags: Sequence[str]) -> str:
    tags_list = ", ".join(tags)
    return "\n".join(
        [
            "---",
            f"title: {title}",
            f"slug: {slug}",
            f"tags: [{tags_list}]",
            "---",
            "",
        ]
    )


def ollama_generate(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2},
    }
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise GenerationError(f"No se pudo conectar a Ollama en {OLLAMA_URL}: {e}") from e
    except Exception as e:  # noqa: BLE001
        raise GenerationError(f"Error leyendo respuesta de Ollama: {e}") from e

    text = data.get("response")
    if not isinstance(text, str) or not text.strip():
        raise GenerationError("Respuesta vacía de Ollama.")
    return text.strip()


def build_prompt(term: str, tags: Sequence[str], aliases: Sequence[str], notes: str) -> str:
    tags_str = ", ".join(tags) if tags else "(sin tags)"
    aliases_str = ", ".join(aliases) if aliases else "(sin aliases)"
    notes_str = notes.strip() if notes and notes.strip() else "(sin notas)"
    return (
        "Eres un asistente experto en contabilidad e impuestos en México. "
        "Redacta contenido para un glosario interno (Docusaurus) sin navegar la web.\n\n"
        f"Término: {term}\n"
        f"Tags: {tags_str}\n"
        f"Aliases: {aliases_str}\n"
        f"Notas internas: {notes_str}\n\n"
        "Entrega SOLO el cuerpo en Markdown (sin frontmatter).\n"
        "Estructura requerida (usa headings):\n"
        "1) Definición breve (2–3 líneas)\n"
        "2) Explicación práctica\n"
        "3) Ejemplo (si aplica)\n"
        "4) Se usa en… / Relacionado con…\n"
        "5) Ver también (usa referencias tipo [[TERMINO]] o [[CODIGO|NOMBRE]])\n"
        "6) Fuentes (escribe: Pendiente)\n\n"
        "Reglas:\n"
        "- Sé claro y útil; evita relleno.\n"
        "- Si el término puede tener variantes, menciónalas.\n"
        "- No inventes citas ni URLs.\n"
    )


def iter_selected_terms(
    items: Sequence[Dict[str, Any]],
    only_terms: Optional[set[str]],
) -> List[Dict[str, Any]]:
    selected: List[Dict[str, Any]] = []
    for it in items:
        term = it.get("term")
        if not isinstance(term, str) or not term.strip():
            continue
        key = normalize_term_key(term)
        if only_terms is not None and key not in only_terms:
            continue
        selected.append(it)

    def sort_key(it: Dict[str, Any]) -> Tuple[int, str]:
        pr = it.get("priority")
        try:
            pr_i = int(pr)
        except Exception:  # noqa: BLE001
            pr_i = 0
        return (-pr_i, normalize_term_key(str(it.get("term", ""))))

    selected.sort(key=sort_key)
    return selected


def build_mdx_for_term(term: str, tags: Sequence[str], slug: str, body: str) -> str:
    fm = build_frontmatter(title=term, slug=slug, tags=tags)
    skeleton = fm + f"{GLOSSARY_START}\n{GLOSSARY_END}\n"
    return insert_or_replace_block(skeleton, body)


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Genera/actualiza docs/mx/glosario/*.mdx usando Ollama.")
    p.add_argument("--batch", type=int, default=50, help="Máximo de términos a procesar en esta corrida.")
    p.add_argument("--only-missing", action="store_true", help="Solo crea archivos que no existan.")
    p.add_argument("--terms", type=str, default=None, help="Subset: lista separada por coma (ej. UFIN,CUCA).")
    args = p.parse_args(argv)

    if not TERMS_PATH.exists():
        print(f"ERROR: No existe {TERMS_PATH}", file=sys.stderr)
        return 2

    raw = load_json(TERMS_PATH)
    if not isinstance(raw, list):
        print(f"ERROR: {TERMS_PATH} debe ser un array JSON.", file=sys.stderr)
        return 2

    only_terms = parse_terms_filter(args.terms)
    terms = iter_selected_terms(raw, only_terms=only_terms)
    if args.batch is not None and args.batch > 0:
        terms = terms[: args.batch]

    if not terms:
        print("Nada que procesar (filtro vacío o sin términos válidos).")
        return 0

    GLOSSARY_DIR.mkdir(parents=True, exist_ok=True)

    errors = 0
    processed = 0
    for it in terms:
        term = str(it.get("term", "")).strip()
        tags = it.get("tags") if isinstance(it.get("tags"), list) else []
        tags = [str(t).strip() for t in tags if str(t).strip()]
        aliases = it.get("aliases") if isinstance(it.get("aliases"), list) else []
        aliases = [str(a).strip() for a in aliases if str(a).strip()]
        notes = str(it.get("notes", "") or "")

        term_slug = slugify(term)
        out_path = GLOSSARY_DIR / f"{term_slug}.mdx"
        doc_slug = f"/mx/glosario/{term_slug}"

        if args.only_missing and out_path.exists():
            continue

        prompt = build_prompt(term=term, tags=tags, aliases=aliases, notes=notes)
        try:
            body = ollama_generate(prompt)
        except GenerationError as e:
            errors += 1
            print(f"[ERROR] {term}: {e}", file=sys.stderr)
            continue

        mdx_text = build_mdx_for_term(term=term, tags=tags, slug=doc_slug, body=body)
        save_text(out_path, mdx_text)
        processed += 1
        print(f"[OK] {term} -> {out_path.relative_to(REPO_ROOT)}")

    if processed == 0 and errors == 0:
        print("Nada que generar (posiblemente todo existe y se usó --only-missing).")

    if errors:
        print(f"Terminado con errores: {errors}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

