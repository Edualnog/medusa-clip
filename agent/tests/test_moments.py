"""Testes da taxonomia de tipo de momento -> faixa de duracao (puro)."""

from __future__ import annotations

from medusacut.hooks.moments import (
    DEFAULT_MOMENT,
    MOMENTS,
    moment_bounds,
    normalize_moment,
    prompt_lines,
)


def test_normalize_canonical_and_alias_and_garbage():
    assert normalize_moment("clutch") == "clutch"
    assert normalize_moment("  STORY  ") == "story"
    assert normalize_moment("treta") == "drama"     # alias pt
    assert normalize_moment("rp") == "story"          # alias
    assert normalize_moment("bla") == DEFAULT_MOMENT  # desconhecido
    assert normalize_moment(None) == DEFAULT_MOMENT   # nao-string


def test_bounds_short_vs_long_types():
    cl_lo, cl_hi = moment_bounds("clutch")
    st_lo, st_hi = moment_bounds("story")
    assert cl_lo < 60.0  # clutch pode ser curto (antes era travado em 60)
    assert st_hi > cl_hi  # historia pode ser bem mais longa que clutch


def test_bounds_envelope_floor_and_ceil():
    # floor sobe o minimo (min_len pedido na CLI)
    lo, hi = moment_bounds("clutch", floor=30.0)
    assert lo == 30.0
    # ceil baixa o teto e nunca deixa min > max
    lo, hi = moment_bounds("story", ceil=20.0)
    assert hi == 20.0 and lo <= hi


def test_unknown_type_falls_back_to_default_bounds():
    assert moment_bounds("xpto") == moment_bounds(DEFAULT_MOMENT)


def test_prompt_lines_covers_every_type():
    text = prompt_lines()
    for k in MOMENTS:
        assert k in text
