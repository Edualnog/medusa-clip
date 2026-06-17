"""Testes das partes puras do LLM/hooks (sem rede)."""

from __future__ import annotations

import pytest

from medusacut.hooks.base import _clamp, _refined
from medusacut.llm import load_dotenv, parse_json


def test_parse_json_plain():
    assert parse_json('{"a": 1, "b": "x"}') == {"a": 1, "b": "x"}


def test_parse_json_with_code_fence():
    txt = "```json\n{\"hook\": \"vish\", \"virality_score\": 80}\n```"
    assert parse_json(txt) == {"hook": "vish", "virality_score": 80}


def test_parse_json_embedded_in_text():
    txt = 'Claro! Aqui esta: {"hook": "clutch"} — espero que ajude.'
    assert parse_json(txt) == {"hook": "clutch"}


def test_parse_json_invalid_raises():
    with pytest.raises(ValueError):
        parse_json("nao tem json nenhum aqui")


def test_load_dotenv_sets_without_overwriting(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text("# comentario\nMEDUSA_TEST_KEY=abc123\nVAZIO=\n")
    monkeypatch.delenv("MEDUSA_TEST_KEY", raising=False)
    load_dotenv(str(env))
    import os

    assert os.environ["MEDUSA_TEST_KEY"] == "abc123"
    # nao sobrescreve valor ja existente
    monkeypatch.setenv("MEDUSA_TEST_KEY", "ja-existe")
    load_dotenv(str(env))
    assert os.environ["MEDUSA_TEST_KEY"] == "ja-existe"


def test_clamp_and_refined():
    assert _clamp(150.0, 0.0, 100.0) == 100.0
    assert _clamp(-5.0, 0.0, 100.0) == 0.0
    assert _refined(None, 10.0, 20.0) is None
    assert _refined("nao-numero", 10.0, 20.0) is None
    assert _refined(25.0, 10.0, 20.0) == 20.0  # preso na janela
    assert _refined(15.0, 10.0, 20.0) == 15.0
