"""Testes da classificacao de composicao (funcoes puras, sem cv2/LLM)."""

from __future__ import annotations

from medusacut.reframe.composition import (
    FULLSCREEN_FACE,
    GAMEPLAY_CAM,
    GAMEPLAY_ONLY,
    decide_mode_from_faces,
    parse_vlm_composition,
)


def test_big_centered_face_is_fullscreen():
    faces = [(0.5, 0.45, 0.30, 0.40)] * 4  # rosto grande, centrado
    comp = decide_mode_from_faces(faces, n_samples=4)
    assert comp.mode == FULLSCREEN_FACE
    assert comp.face_box is not None


def test_small_corner_face_is_gameplay_cam():
    faces = [(0.12, 0.12, 0.10, 0.13)] * 5  # rosto pequeno, canto sup-esq
    comp = decide_mode_from_faces(faces, n_samples=6)
    assert comp.mode == GAMEPLAY_CAM
    assert comp.cam_box is not None


def test_no_faces_is_gameplay_only():
    comp = decide_mode_from_faces([], n_samples=6)
    assert comp.mode == GAMEPLAY_ONLY


def test_sparse_inconsistent_faces_is_gameplay_only():
    # poucos hits espalhados (rostos de NPC dentro do jogo) -> sem maioria
    faces = [(0.12, 0.12, 0.08, 0.10), (0.8, 0.7, 0.06, 0.08)]
    comp = decide_mode_from_faces(faces, n_samples=10)
    assert comp.mode == GAMEPLAY_ONLY


def test_vlm_fullscreen_parsed():
    comp = parse_vlm_composition(
        {"mode": "fullscreen_face", "face_box": [0.2, 0.1, 0.8, 0.9], "confidence": 0.9}
    )
    assert comp is not None
    assert comp.mode == FULLSCREEN_FACE and comp.face_box == (0.2, 0.1, 0.8, 0.9)
    assert comp.source == "vlm"


def test_vlm_gameplay_cam_with_box():
    comp = parse_vlm_composition(
        {"mode": "gameplay_cam", "cam_box": [0.0, 0.0, 0.25, 0.3], "confidence": 0.8}
    )
    assert comp is not None and comp.mode == GAMEPLAY_CAM and comp.cam_box is not None


def test_vlm_gameplay_cam_without_box_downgrades():
    comp = parse_vlm_composition({"mode": "gameplay_cam", "cam_box": None, "confidence": 0.8})
    assert comp is not None and comp.mode == GAMEPLAY_ONLY


def test_vlm_low_confidence_rejected():
    assert parse_vlm_composition({"mode": "fullscreen_face", "confidence": 0.1}) is None


def test_vlm_bad_mode_rejected():
    assert parse_vlm_composition({"mode": "whatever", "confidence": 0.9}) is None


def test_vlm_per_frame_array_aggregates_dominant():
    # modelo devolveu uma resposta POR FRAME -> agrega no dominante (fullscreen)
    data = {"frames": [
        {"mode": "fullscreen_face", "face_box": [0.18, 0.08, 0.82, 0.92], "confidence": 0.98},
        {"mode": "fullscreen_face", "face_box": [0.22, 0.13, 0.78, 0.87], "confidence": 0.97},
        {"mode": "gameplay_only", "confidence": 1.0},
    ]}
    comp = parse_vlm_composition(data)
    assert comp is not None and comp.mode == FULLSCREEN_FACE
    assert comp.face_box == (0.2, 0.105, 0.8, 0.895)  # mediana das 2 caixas


def test_vlm_per_frame_array_cam_median():
    data = {"frames": [
        {"mode": "gameplay_cam", "cam_box": [0.0, 0.0, 0.22, 0.30], "confidence": 0.9},
        {"mode": "gameplay_cam", "cam_box": [0.02, 0.02, 0.24, 0.34], "confidence": 0.9},
        {"mode": "fullscreen_face", "face_box": [0.3, 0.1, 0.7, 0.9], "confidence": 0.8},
    ]}
    comp = parse_vlm_composition(data)
    assert comp is not None and comp.mode == GAMEPLAY_CAM and comp.cam_box is not None


def test_vlm_degenerate_box_rejected_for_face():
    # box degenerada -> face_box None -> ainda fullscreen mas sem caixa de centragem
    comp = parse_vlm_composition(
        {"mode": "fullscreen_face", "face_box": [0.5, 0.5, 0.505, 0.51], "confidence": 0.9}
    )
    assert comp is not None and comp.mode == FULLSCREEN_FACE and comp.face_box is None
