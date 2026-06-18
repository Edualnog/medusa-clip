"""Testes da consolidacao de deteccao de facecam (puro, sem OpenCV)."""

from __future__ import annotations

from pytest import approx

from medusacut.reframe.facecam import consolidate


def test_consolidate_stable_cluster_returns_padded_box():
    hits = [(0.8, 0.2, 0.10, 0.15)] * 12  # rosto estavel no topo-direita
    box = consolidate(hits, samples=20, min_hits_frac=0.25, pad=1.5)
    assert box is not None
    x0, y0, x1, y1 = box
    assert (x1 - x0) == approx(0.15)  # 0.10 * 1.5
    assert (x0 + x1) / 2 == approx(0.8)
    assert (y0 + y1) / 2 == approx(0.2)
    assert 0.0 <= x0 and x1 <= 1.0


def test_consolidate_too_few_hits_returns_none():
    hits = [(0.8, 0.2, 0.1, 0.15)] * 2
    assert consolidate(hits, samples=20, min_hits_frac=0.25) is None


def test_consolidate_scattered_hits_returns_none():
    # metade num canto, metade no oposto: nada estavel perto da mediana
    hits = [(0.1, 0.1, 0.1, 0.1)] * 6 + [(0.9, 0.9, 0.1, 0.1)] * 6
    assert consolidate(hits, samples=20, min_hits_frac=0.25) is None


def test_consolidate_facecam_dominates_gameplay_faces():
    # facecam persistente no topo-direita + rostos esporadicos no gameplay (baixo).
    # O cluster do facecam domina -> retorna a caixa dele, ignora os do jogo.
    hits = [(0.8, 0.12, 0.10, 0.14)] * 10 + [(0.4, 0.82, 0.06, 0.08)] * 3
    box = consolidate(hits, samples=30, min_hits_frac=0.25)
    assert box is not None
    x0, y0, x1, y1 = box
    assert (x0 + x1) / 2 == approx(0.8)
    assert (y0 + y1) / 2 == approx(0.12)  # pegou o facecam, nao a media com o gameplay


def test_consolidate_clamps_to_frame():
    hits = [(0.95, 0.95, 0.3, 0.3)] * 10  # perto da borda, box estouraria
    box = consolidate(hits, samples=20, min_hits_frac=0.25, pad=1.5)
    assert box is not None
    x0, y0, x1, y1 = box
    assert x0 >= 0.0 and y0 >= 0.0 and x1 <= 1.0 and y1 <= 1.0
