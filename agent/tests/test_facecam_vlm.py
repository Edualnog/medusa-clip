"""Testes do parser do fallback VLM de facecam (puro, sem LLM)."""

from __future__ import annotations

from pytest import approx

from medusacut.reframe.facecam_vlm import parse_vlm_facecam


def test_present_with_box_returns_clamped_box():
    data = {"present": True, "kind": "avatar", "box": [0.62, 0.58, 1.01, 1.0], "confidence": 0.9}
    box = parse_vlm_facecam(data)
    assert box is not None
    x0, y0, x1, y1 = box
    assert x0 == approx(0.62) and y0 == approx(0.58)
    assert x1 == approx(1.0)  # clampado pra dentro do quadro


def test_absent_returns_none():
    assert parse_vlm_facecam({"present": False, "kind": "none"}) is None


def test_low_confidence_returns_none():
    data = {"present": True, "box": [0.6, 0.6, 0.9, 0.9], "confidence": 0.2}
    assert parse_vlm_facecam(data, min_conf=0.5) is None


def test_corner_only_falls_back_to_preset():
    # VTuber sem box, mas com canto -> usa o retangulo preset do canto
    box = parse_vlm_facecam({"present": True, "kind": "avatar", "corner": "br", "confidence": 0.8})
    assert box == (0.62, 0.58, 1.00, 1.00)


def test_full_frame_box_rejected_then_preset():
    # box cobrindo tudo nao e facecam; cai pro canto se houver
    data = {"present": True, "box": [0.0, 0.0, 1.0, 1.0], "corner": "tr", "confidence": 0.9}
    assert parse_vlm_facecam(data) == (0.62, 0.0, 1.0, 0.42)


def test_garbage_box_no_corner_returns_none():
    assert parse_vlm_facecam({"present": True, "box": "lixo", "confidence": 0.9}) is None
