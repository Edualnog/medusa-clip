"""Cliente de LLM (ganchos + score de viralizacao).

Le a chave do `.env` (`LLM_API_KEY`) e fala com a OpenRouter (compativel com a
API da OpenAI). Modelo via `LLM_MODEL` (default forte). Em uso pessoal o custo e
irrelevante — use o melhor modelo.

`openai` importado DENTRO das funcoes (dep pesada).
"""

from __future__ import annotations

import json
import os
import re

DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o"


def load_dotenv(path: str = ".env") -> None:
    """Carrega pares KEY=VALUE do `.env` pro ambiente (sem sobrescrever)."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def get_client():
    """Instancia o cliente OpenAI apontando pra OpenRouter, com a chave do .env."""
    from openai import OpenAI  # noqa: PLC0415

    load_dotenv()
    key = os.environ.get("LLM_API_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "LLM_API_KEY ausente — coloque sua chave da OpenRouter no .env"
        )
    base_url = os.environ.get("LLM_BASE_URL", DEFAULT_BASE_URL)
    return OpenAI(api_key=key, base_url=base_url)


def chat_json(system: str, user: str, *, model: str | None = None, temperature: float = 0.4) -> dict:
    """Manda system+user e devolve a resposta como JSON (dict)."""
    client = get_client()
    model = model or os.environ.get("LLM_MODEL", DEFAULT_MODEL)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    return parse_json(resp.choices[0].message.content or "")


def parse_json(text: str) -> dict:
    """Tolerante: aceita JSON puro, com cercas ``` ou cercado de texto."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"resposta do LLM nao era JSON: {text[:200]!r}")
