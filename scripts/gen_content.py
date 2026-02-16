#!/usr/bin/env python3
"""
Conta-Atlas — Generador de contenido para MDX usando Ollama (IA local).

Este script recorre cuentas del SAT (data/mx/sat_accounts.json) y, para las
cuentas pendientes (según data/mx/generation_state.json), genera contenido
en español vía Ollama (http://localhost:11434) e inserta el texto en los
archivos docs/mx/plan-completo/.../index.mdx entre:

  <!-- CONTENT_START -->
  <!-- CONTENT_END -->

Reglas clave:
  - No inventar cuentas/códigos fuera del JSON.
  - Respetar jerarquía y rutas existentes.
  - Guardar progreso incremental en generation_state.json.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
ACCOUNTS_PATH = REPO_ROOT / "data" / "mx" / "sat_accounts.json"
STATE_PATH = REPO_ROOT / "data" / "mx" / "generation_state.json"
DOCS_ROOT = REPO_ROOT / "docs" / "mx" / "plan-completo"

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b-instruct")

CONTENT_START = "<!-- CONTENT_START -->"
CONTENT_END = "<!-- CONTENT_END -->"
ENRICH_START = "<!-- ENRICH_START -->"
ENRICH_END = "<!-- ENRICH_END -->"


class GenerationError(Exception):
    """Error controlado para marcar una cuenta como 'error' en el estado."""


def _now_iso() -> str:
    return _dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def load_or_init_state() -> Dict[str, Any]:
    """
    Estructura del state:
      {
        "meta": { "created_at": "...", "updated_at": "...", "model": "..." },
        "accounts": {
          "101": { "status": "done|error", "updated_at": "...", ... }
        }
      }
    """
    if not STATE_PATH.exists():
        return {
            "meta": {"created_at": _now_iso(), "updated_at": _now_iso(), "model": OLLAMA_MODEL},
            "accounts": {},
        }

    state = load_json(STATE_PATH)
    if not isinstance(state, dict):
        return {
            "meta": {"created_at": _now_iso(), "updated_at": _now_iso(), "model": OLLAMA_MODEL},
            "accounts": {},
        }

    state.setdefault("meta", {})
    state.setdefault("accounts", {})
    if not isinstance(state["accounts"], dict):
        state["accounts"] = {}
    state["meta"].setdefault("model", OLLAMA_MODEL)
    state["meta"]["updated_at"] = _now_iso()
    return state


def build_indexes(accounts: List[Dict[str, Any]]) -> Tuple[Dict[str, Dict[str, Any]], Dict[Optional[str], List[str]]]:
    by_code: Dict[str, Dict[str, Any]] = {}
    children_by_parent: Dict[Optional[str], List[str]] = {}
    for a in accounts:
        code = str(a.get("code"))
        by_code[code] = a
        parent = a.get("parent_code")
        parent_code = None if parent in (None, "null") else str(parent)
        children_by_parent.setdefault(parent_code, []).append(code)

    # Orden estable y "numérica" (101 < 101.01 < 102 ...)
    def sort_key(code: str) -> Tuple[int, int]:
        if "." in code:
            left, right = code.split(".", 1)
            return (int(left), int(right))
        return (int(code), -1)

    for parent, codes in children_by_parent.items():
        codes.sort(key=sort_key)
        children_by_parent[parent] = codes

    return by_code, children_by_parent


def account_path(code: str, by_code: Dict[str, Dict[str, Any]]) -> List[str]:
    """
    Construye la ruta jerárquica (lista de códigos) usando parent_code.
    Debe coincidir con la lógica usada al generar docs (scripts/buildDocsMx.js).
    """
    parts: List[str] = []
    current = by_code.get(code)
    visiting = set()
    while current is not None:
        c = str(current["code"])
        if c in visiting:
            break
        visiting.add(c)
        parts.append(c)
        parent = current.get("parent_code")
        if parent is None:
            break
        current = by_code.get(str(parent))
    parts.reverse()
    return parts


def mdx_path_for_account(code: str, by_code: Dict[str, Dict[str, Any]]) -> Path:
    parts = account_path(code, by_code)
    return DOCS_ROOT.joinpath(*parts, "index.mdx")


def mdx_has_content_markers(text: str) -> bool:
    return CONTENT_START in text and CONTENT_END in text and text.index(CONTENT_START) < text.index(CONTENT_END)


def insert_or_replace_content(mdx_text: str, new_content: str) -> str:
    """
    Inserta/reemplaza el contenido entre CONTENT_START y CONTENT_END.
    Si los marcadores no existen, los crea justo después del frontmatter (si existe),
    respetando el frontmatter y el resto del archivo.
    """
    if not mdx_has_content_markers(mdx_text):
        # Detectar frontmatter al inicio: --- ... ---
        lines = mdx_text.splitlines(keepends=True)
        insert_at = 0
        if len(lines) >= 1 and lines[0].strip() == "---":
            # buscar cierre
            for i in range(1, len(lines)):
                if lines[i].strip() == "---":
                    insert_at = i + 1
                    break

        before = "".join(lines[:insert_at])
        after = "".join(lines[insert_at:])
        marker_block = (
            ("\n" if before and not before.endswith("\n") else "")
            + f"{CONTENT_START}\n{CONTENT_END}\n"
            + ("\n" if after and not after.startswith("\n") else "")
        )
        mdx_text = before + marker_block + after

    start = mdx_text.index(CONTENT_START) + len(CONTENT_START)
    end = mdx_text.index(CONTENT_END)
    before = mdx_text[:start]
    after = mdx_text[end:]

    # Normalizar saltos de línea alrededor del contenido
    inner = new_content.strip()
    if ENRICH_START not in inner and ENRICH_END not in inner:
        inner = f"{ENRICH_START}\n\n{inner}\n\n{ENRICH_END}"
    content = "\n" + inner + "\n"
    return before + content + after


def existing_generated_content(mdx_text: str) -> Optional[str]:
    """Devuelve el contenido actual entre marcadores si existe y no está vacío."""
    if not mdx_has_content_markers(mdx_text):
        return None
    start = mdx_text.index(CONTENT_START) + len(CONTENT_START)
    end = mdx_text.index(CONTENT_END)
    inner = mdx_text[start:end].strip()
    return inner if inner else None


# Códigos SAT del plan:
# - "0" (caso especial que existe en el Excel)
# - 3 dígitos: 100..999
# - 3 dígitos + . + 1-2 dígitos: 101.01, 601.5, etc.
#
# Importante: NO matcheamos números de 1-2 dígitos (1,2,3...) para evitar falsos
# positivos cuando la IA enumera pasos o secciones.
CODE_TOKEN_RE = re.compile(r"\b(0|[1-9]\d{2})(?:\.(\d{1,2}))?\b")

URL_RE = re.compile(r"https?://[^\s)>\"]+")


def strip_urls(text: str) -> str:
    """
    El validador de códigos no debe interpretar números dentro de URLs (ej. /2024/).
    Reemplazamos URLs por un placeholder para evitar falsos positivos.
    """
    return URL_RE.sub(" ", text)


def sanitize_ai_output(text: str) -> str:
    """
    Quita artefactos comunes de modelos (especialmente variantes tipo ChatML / Qwen):
      - <|im_start|>user
      - <|im_end|>
      - cualquier token en forma <|...|>

    Estos tokens rompen MDX porque empiezan con '<' y contienen '|'.
    """
    lines = text.splitlines()
    cleaned: List[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("<|") and "|>" in stripped:
            continue
        if "<|im_start|>" in stripped or "<|im_end|>" in stripped:
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def normalize_code_token(left: str, right: Optional[str]) -> str:
    """
    Normaliza tokens tipo:
      - 101      -> "101"
      - 101.1    -> "101.10"
      - 101.01   -> "101.01"
    """
    left_i = int(left)
    if right is None:
        return str(left_i)
    right_s = right
    if len(right_s) == 1:
        right_s = right_s + "0"
    elif len(right_s) == 0:
        right_s = "00"
    return f"{left_i}.{right_s[:2]}"


def extract_codes_from_text(text: str) -> List[str]:
    codes: List[str] = []
    safe_text = strip_urls(text)
    for m in CODE_TOKEN_RE.finditer(safe_text):
        left, right = m.group(1), m.group(2)
        try:
            codes.append(normalize_code_token(left, right))
        except ValueError:
            continue
    return codes


def validate_no_unknown_codes(ai_text: str, known_codes: Iterable[str]) -> None:
    """
    Validación mínima: si la IA menciona un 'código' con patrón SAT y no existe
    en el JSON, marcamos error.

    Nota: esto puede ser estricto si el modelo escribe números que parecen código.
    Si necesitas relajar, se puede limitar a menciones precedidas por 'código' etc.
    """
    known = set(known_codes)
    mentioned = set(extract_codes_from_text(ai_text))
    unknown = sorted([c for c in mentioned if c not in known])
    if unknown:
        raise GenerationError(f"La IA mencionó códigos inexistentes: {', '.join(unknown[:20])}")


def linkify_bare_urls(text: str) -> str:
    """
    Hace "linkable" cualquier URL externa suelta:
      https://ejemplo.com  -> <https://ejemplo.com>

    Evita tocar URLs que ya estén dentro de un enlace markdown: [texto](url)
    (heurística simple: si el char anterior inmediato es '(' lo dejamos).
    """

    def repl(match: re.Match[str]) -> str:
        url = match.group(0)
        start = match.start()
        if start > 0 and text[start - 1] == "(":
            return url
        if start > 0 and text[start - 1] == "<":
            return url
        return f"<{url}>"

    return URL_RE.sub(repl, text)


def build_prompt(
    account: Dict[str, Any],
    by_code: Dict[str, Dict[str, Any]],
    children_by_parent: Dict[Optional[str], List[str]],
    max_siblings: int = 12,
) -> str:
    """
    Construcción del prompt (español, formal + práctico).
    Incluye contexto jerárquico: padre y hermanos (mismo parent_code).
    """
    code = str(account["code"])
    name = str(account["name"])
    level = int(account.get("level") or 0)
    acc_type = str(account.get("type") or "leaf")

    parent_code = account.get("parent_code")
    parent = by_code.get(str(parent_code)) if parent_code is not None else None
    parent_line = f"{parent['code']} — {parent['name']}" if parent else "(sin padre / raíz)"

    siblings_codes = []
    if parent_code is not None:
        siblings_codes = [c for c in children_by_parent.get(str(parent_code), []) if c != code]
    siblings_lines = []
    for sib_code in siblings_codes[:max_siblings]:
        sib = by_code.get(sib_code)
        if not sib:
            continue
        siblings_lines.append(f"- {sib['code']} — {sib['name']}")
    if len(siblings_codes) > max_siblings:
        siblings_lines.append(f"- (… {len(siblings_codes) - max_siblings} más)")

    children = children_by_parent.get(code, [])
    child_lines = []
    for child_code in children[:max_siblings]:
        child = by_code.get(child_code)
        if not child:
            continue
        child_lines.append(f"- {child['code']} — {child['name']}")
    if len(children) > max_siblings:
        child_lines.append(f"- (… {len(children) - max_siblings} más)")

    # Instrucciones para no inventar códigos y mantener consistencia.
    # Pedimos salida en Markdown con secciones.
    prompt = f"""Eres un asistente contable. Estás generando documentación para el plan de cuentas SAT (México).
Reglas estrictas:
- NO inventes cuentas ni códigos.
- Si necesitas referirte a otras cuentas, usa SOLO códigos que aparezcan en el contexto proporcionado o el código actual.
- NO menciones códigos que no existan en el plan.
- Si incluyes enlaces a recursos externos, usa URLs completas y seguras (https) en formato Markdown: [texto](https://...).
- Escribe en español, tono formal pero práctico, sin marketing.

Cuenta objetivo:
- Código: {code}
- Nombre: {name}
- Nivel: {level}
- Tipo: {acc_type} (group=agrupador, leaf=cuenta final)

Contexto jerárquico:
- Padre: {parent_line}
"""

    if siblings_lines:
        prompt += "\nHermanos (mismo padre):\n" + "\n".join(siblings_lines) + "\n"
    else:
        prompt += "\nHermanos (mismo padre): (no disponible)\n"

    if child_lines:
        prompt += "\nHijos (subcuentas / nodos debajo):\n" + "\n".join(child_lines) + "\n"
    else:
        prompt += "\nHijos (subcuentas / nodos debajo): (no disponible)\n"

    prompt += """
Genera contenido en Markdown siguiendo ESTA estructura (usa encabezados '##'):
1) ## Descripción formal
2) ## Explicación práctica
3) ## Relación con otros nodos (padre, hermanos, hijos)
4) ## Ejemplos
   - Si el tipo es 'leaf': incluye 2–4 ejemplos breves y realistas de uso contable (sin números ni asientos completos).
   - Si el tipo es 'group': explica que agrupa y NO pongas ejemplos operativos detallados.
5) ## Errores comunes

Evita referencias a normativa específica si no viene en el contexto.
No incluyas listas largas; sé útil y conciso (máx. ~250-400 palabras).
"""

    return prompt


def call_ollama(prompt: str, model: str, timeout_s: int = 120) -> str:
    """
    Llamada HTTP a Ollama (local) usando /api/generate.
    Usamos stream=false para obtener una respuesta única en JSON.
    """
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
        },
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as e:
        raise GenerationError(f"No se pudo conectar a Ollama en {OLLAMA_URL}: {e}") from e

    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as e:
        raise GenerationError(f"Respuesta inválida de Ollama (no JSON): {raw[:200]}") from e

    if not isinstance(obj, dict) or "response" not in obj:
        raise GenerationError(f"Respuesta inesperada de Ollama: {obj!r}")
    return str(obj["response"]).strip()


def pick_accounts(
    accounts: List[Dict[str, Any]],
    state: Dict[str, Any],
    level: Optional[int],
    leaf_only: bool,
) -> List[Dict[str, Any]]:
    """
    Filtrado por:
      - --level N  => nivel exacto
      - --leaf     => type == leaf
    Además: solo pendientes (no 'done').
    """
    status_map: Dict[str, Any] = state.get("accounts", {})

    def is_pending(a: Dict[str, Any]) -> bool:
        code = str(a["code"])
        entry = status_map.get(code)
        if not entry:
            return True
        return entry.get("status") != "done"

    filtered = [a for a in accounts if is_pending(a)]
    if level is not None:
        filtered = [a for a in filtered if int(a.get("level") or 0) == level]
    if leaf_only:
        filtered = [a for a in filtered if str(a.get("type")) == "leaf"]

    # Orden: nivel ascendente, luego por código "numérico".
    def sort_key(a: Dict[str, Any]) -> Tuple[int, int, int]:
        code = str(a["code"])
        if "." in code:
            left, right = code.split(".", 1)
            return (int(a.get("level") or 0), int(left), int(right))
        return (int(a.get("level") or 0), int(code), -1)

    filtered.sort(key=sort_key)
    return filtered


def mark_done(state: Dict[str, Any], code: str, model: str) -> None:
    state["accounts"].setdefault(code, {})
    state["accounts"][code].update(
        {
            "status": "done",
            "updated_at": _now_iso(),
            "model": model,
        }
    )
    state["meta"]["updated_at"] = _now_iso()


def mark_error(state: Dict[str, Any], code: str, model: str, message: str) -> None:
    state["accounts"].setdefault(code, {})
    state["accounts"][code].update(
        {
            "status": "error",
            "updated_at": _now_iso(),
            "model": model,
            "error": message,
        }
    )
    state["meta"]["updated_at"] = _now_iso()


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Generar contenido MDX con Ollama (Conta-Atlas)")
    parser.add_argument("--level", type=int, default=None, help="Generar solo cuentas de un nivel (ej: 1, 2)")
    parser.add_argument("--leaf", action="store_true", help="Generar solo cuentas tipo leaf")
    parser.add_argument("--batch", type=int, default=5, help="Procesar N cuentas por ejecución")
    args = parser.parse_args(argv)

    # Validación básica de argumentos
    if args.batch <= 0:
        print("Error: --batch debe ser > 0", file=sys.stderr)
        return 2

    # 1) Leer sat_accounts.json
    if not ACCOUNTS_PATH.exists():
        print(f"Error: falta {ACCOUNTS_PATH}", file=sys.stderr)
        return 2

    accounts = load_json(ACCOUNTS_PATH)
    if not isinstance(accounts, list):
        print(f"Error: formato inválido en {ACCOUNTS_PATH} (se esperaba lista)", file=sys.stderr)
        return 2

    # 2) Leer o crear generation_state.json
    state = load_or_init_state()
    state.setdefault("accounts", {})
    state.setdefault("meta", {})
    state["meta"]["model"] = OLLAMA_MODEL

    # Índices para contexto / rutas
    by_code, children_by_parent = build_indexes(accounts)
    known_codes = by_code.keys()

    # 3) Filtrar cuentas pendientes según --level / --leaf
    candidates = pick_accounts(accounts, state, level=args.level, leaf_only=args.leaf)

    # 4) Si no hay pendientes, terminar
    if not candidates:
        print("No hay cuentas pendientes para los filtros dados.")
        save_json(STATE_PATH, state)
        return 0

    batch = candidates[: args.batch]
    print(f"Procesando {len(batch)} cuenta(s) (pendientes totales: {len(candidates)})…")

    # 5) Procesar por lote con guardado incremental
    for a in batch:
        code = str(a.get("code"))
        try:
            # Validación: cuenta existe en JSON (por construcción, sí)
            if code not in by_code:
                raise GenerationError("Cuenta no existe en sat_accounts.json (inconsistencia).")

            mdx_path = mdx_path_for_account(code, by_code)

            # Validación: MDX destino existe
            if not mdx_path.exists():
                raise GenerationError(f"No existe el MDX destino: {mdx_path.relative_to(REPO_ROOT)}")

            mdx_text = mdx_path.read_text(encoding="utf-8")

            # Si ya hay contenido generado (entre markers) y no hay estado, lo marcamos done sin sobrescribir.
            existing = existing_generated_content(mdx_text)
            if existing and state["accounts"].get(code, {}).get("status") != "done":
                mark_done(state, code, OLLAMA_MODEL)
                save_json(STATE_PATH, state)
                print(f"- {code}: ya tenía contenido, marcado como done (no se sobrescribe).")
                continue

            prompt = build_prompt(a, by_code, children_by_parent)

            # Llamada a IA (Ollama local)
            ai_text = call_ollama(prompt, model=OLLAMA_MODEL)

            # Sanitización: evitar tokens que rompen MDX.
            ai_text = sanitize_ai_output(ai_text)

            # Si la IA puso URLs sueltas, las volvemos linkables.
            ai_text = linkify_bare_urls(ai_text)

            # 6) Validaciones del contenido IA
            validate_no_unknown_codes(ai_text, known_codes)

            # Inserción en MDX entre CONTENT_START/END
            new_mdx = insert_or_replace_content(mdx_text, ai_text)
            mdx_path.write_text(new_mdx, encoding="utf-8")

            # Actualizar estado a done + guardar incremental
            mark_done(state, code, OLLAMA_MODEL)
            save_json(STATE_PATH, state)
            print(f"- {code}: done")

        except GenerationError as e:
            mark_error(state, code, OLLAMA_MODEL, str(e))
            save_json(STATE_PATH, state)
            print(f"- {code}: error: {e}", file=sys.stderr)
        except Exception as e:  # fallback: cualquier error inesperado
            mark_error(state, code, OLLAMA_MODEL, f"Error inesperado: {e.__class__.__name__}: {e}")
            save_json(STATE_PATH, state)
            print(f"- {code}: error inesperado: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
