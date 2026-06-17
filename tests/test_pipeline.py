"""Testes de logica pura do pipeline (sem ffmpeg/LLM)."""

from __future__ import annotations

from pytest import approx

from medusacut.pipeline import _floor_len


def test_floor_len_keeps_long_enough_window():
    assert _floor_len(10.0, 30.0, 0.0, 60.0, 14.0) == (10.0, 30.0)


def test_floor_len_expands_short_window_around_center():
    rs, re_ = _floor_len(20.0, 26.0, 0.0, 60.0, 14.0)  # 6s -> 14s, centro 23
    assert re_ - rs == approx(14.0)
    assert (rs + re_) / 2 == approx(23.0)


def test_floor_len_respects_bounds():
    rs, re_ = _floor_len(1.0, 4.0, 0.0, 10.0, 14.0)  # min_len > janela disponivel
    assert rs >= 0.0 and re_ <= 10.0
    rs, re_ = _floor_len(58.0, 59.0, 0.0, 60.0, 14.0)  # perto do fim
    assert re_ <= 60.0
    assert re_ - rs == approx(14.0)
