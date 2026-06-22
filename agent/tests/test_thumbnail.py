"""Thumbnail (capa) 9:16 local: composicao e mapeamento da caixa da facecam."""

from __future__ import annotations

import pytest

pytest.importorskip("PIL")  # Pillow e dep do motor; pula se faltar no ambiente

from medusacut import thumbnail
from medusacut.thumbnail import H, W, _abs_box, _compose, build_thumbnail


def _frame(w=1920, h=1080):
    from PIL import Image

    return Image.new("RGB", (w, h), (40, 30, 70))


def test_abs_box_normalized_corners():
    # formato do detector: cantos normalizados (x0,y0,x1,y1) -> (x, y, w, h) px
    assert _abs_box((0.1, 0.2, 0.5, 0.6), 1000, 1000) == (100, 200, 400, 400)


def test_abs_box_pixels_fallback_assume_1920x1080():
    # fallback: pixels (x,y,w,h) @1920x1080 -> reescala pra dimensao real (aqui 1:1)
    assert _abs_box((40, 30, 380, 300), 1920, 1080) == (40, 30, 380, 300)


def test_compose_canvas_size_with_face():
    img = _compose(_frame(), "CLUTCH 1V5 NO ULTIMO ROUND!", facecam_box=(40, 30, 380, 300))
    assert img.size == (W, H) == (1080, 1920)


def test_compose_canvas_size_no_face():
    img = _compose(_frame(), "FOCO NA ACAO", facecam_box=None)
    assert img.size == (1080, 1920)


def test_compose_handles_empty_hook():
    # sem texto nao deve quebrar (so o fundo + facecam)
    img = _compose(_frame(), "", facecam_box=None)
    assert img.size == (1080, 1920)


def test_build_thumbnail_returns_none_on_bad_source(tmp_path):
    # fonte inexistente: ffmpeg falha -> sem frame -> None, sem levantar
    out = tmp_path / "thumb.jpg"
    res = build_thumbnail(
        "/nao/existe/video.mp4", 0.0, 5.0, "TESTE",
        out_path=str(out), cache_dir=str(tmp_path / "cache"),
    )
    assert res is None
    assert not out.exists()


def test_build_thumbnail_ai_falls_back_when_not_openai(tmp_path, monkeypatch):
    # capa por IA so com provider==openai; em outro provedor devolve (None, None)
    from medusacut.thumbnail import build_thumbnail_ai

    monkeypatch.setenv("LLM_PROVIDER", "openrouter")
    out = tmp_path / "t.jpg"
    path, usage = build_thumbnail_ai(
        "/x.mp4", 0.0, 5.0, "X",
        out_path=str(out), cache_dir=str(tmp_path / "c"),
    )
    assert path is None and usage is None


def test_image_usage_cost_with_details():
    from medusacut.llm import image_usage

    u = {
        "input_tokens": 1700, "output_tokens": 4000, "total_tokens": 5700,
        "input_tokens_details": {"text_tokens": 200, "image_tokens": 1500},
    }
    r = image_usage(u)
    # 200/1e6*5 + 1500/1e6*10 + 4000/1e6*40 = 0.176
    assert abs(r.cost_usd - 0.176) < 1e-6
    assert r.total_tokens == 5700


def test_image_usage_none_is_safe():
    from medusacut.llm import image_usage

    r = image_usage(None)
    assert r.cost_usd is None and r.total_tokens == 0
