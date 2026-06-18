"""Cliente de LLM (ganchos + score de viralizacao).

Le a chave do `.env` (`LLM_API_KEY`) e fala com a OpenRouter (compativel com a
API da OpenAI). Modelo via `LLM_MODEL` (default forte). Em uso pessoal o custo e
irrelevante — use o melhor modelo.

`openai` importado DENTRO das funcoes (dep pesada).
"""

from __future__ import annotations

import base64
import json
import os
import re
from dataclasses import dataclass

DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o"
# Multi-modelo por etapa: triagem barata -> juiz forte multimodal.
DEFAULT_TRIAGE_MODEL = "openai/gpt-4o-mini"
DEFAULT_JUDGE_MODEL = "openai/gpt-4.1"


@dataclass
class Usage:
    """Consumo de uma ou mais chamadas de LLM (tokens + custo em USD)."""

    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float | None = None
    calls: int = 0

    def __add__(self, other: "Usage") -> "Usage":
        cost = None
        if self.cost_usd is not None or other.cost_usd is not None:
            cost = (self.cost_usd or 0.0) + (other.cost_usd or 0.0)
        model = self.model or other.model
        if self.model and other.model and self.model != other.model:
            model = "varios"
        return Usage(
            model=model,
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
            cost_usd=cost,
            calls=self.calls + other.calls,
        )

    def as_dict(self) -> dict:
        return {
            "model": self.model,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "cost_usd": self.cost_usd,
            "calls": self.calls,
        }


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


def chat_json(
    system: str, user: str, *, model: str | None = None, temperature: float = 0.4
) -> tuple[dict, Usage]:
    """Manda system+user (texto) e devolve (JSON, Usage com tokens+custo)."""
    model = model or os.environ.get("LLM_MODEL", DEFAULT_MODEL)
    return _chat(model, system, user, temperature)


def chat_json_multimodal(
    system: str,
    user_text: str,
    image_paths: list[str],
    *,
    model: str | None = None,
    temperature: float = 0.3,
) -> tuple[dict, Usage]:
    """Igual ao chat_json, mas anexa imagens (keyframes) pro modelo VER a cena."""
    model = model or os.environ.get("LLM_MODEL_JUDGE", DEFAULT_JUDGE_MODEL)
    content: list[dict] = [{"type": "text", "text": user_text}]
    for p in image_paths:
        content.append({"type": "image_url", "image_url": {"url": image_data_uri(p)}})
    return _chat(model, system, content, temperature)


def _chat(model: str, system: str, content, temperature: float | None) -> tuple[dict, Usage]:
    client = get_client()
    kwargs = dict(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        # OpenRouter: devolve o custo (USD) junto do usage.
        extra_body={"usage": {"include": True}},
    )
    # Modelos de raciocinio (o1/o3/o4…) nao aceitam temperature custom.
    if temperature is not None and not is_reasoning_model(model):
        kwargs["temperature"] = temperature
    resp = client.chat.completions.create(**kwargs)
    data = parse_json(resp.choices[0].message.content or "")
    return data, extract_usage(resp, model)


def is_reasoning_model(model: str) -> bool:
    name = model.split("/")[-1].lower()
    return name.startswith(("o1", "o3", "o4"))


def image_data_uri(path: str) -> str:
    with open(path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def extract_usage(resp, model: str) -> Usage:
    """Le tokens e custo (se houver) do objeto de resposta do SDK."""
    u = getattr(resp, "usage", None)
    if u is None:
        return Usage(model=model, calls=1)
    raw = {}
    try:
        raw = u.model_dump()
    except Exception:
        raw = {}
    pt = int(raw.get("prompt_tokens") or getattr(u, "prompt_tokens", 0) or 0)
    ct = int(raw.get("completion_tokens") or getattr(u, "completion_tokens", 0) or 0)
    tt = int(raw.get("total_tokens") or getattr(u, "total_tokens", 0) or (pt + ct))
    cost = raw.get("cost", getattr(u, "cost", None))
    return Usage(
        model=model, prompt_tokens=pt, completion_tokens=ct,
        total_tokens=tt, cost_usd=cost, calls=1,
    )


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
