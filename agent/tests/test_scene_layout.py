"""Testes das funcoes puras do reframe ciente de cena."""

from __future__ import annotations

from medusacut.reframe.composition import (
    FULLSCREEN_FACE,
    GAMEPLAY_CAM,
    GAMEPLAY_ONLY,
    SceneComposition,
)
from medusacut.reframe.scene_layout import (
    _cap_scenes,
    _merge_runs,
    _scene_bounds,
)


def test_scene_bounds_no_cuts_single_segment():
    assert _scene_bounds(10.0, 70.0, None, min_scene=2.5) == [(10.0, 70.0)]


def test_scene_bounds_splits_on_internal_cuts():
    segs = _scene_bounds(0.0, 60.0, [20.0, 40.0, 999.0], min_scene=2.5)
    assert segs == [(0.0, 20.0), (20.0, 40.0), (40.0, 60.0)]


def test_scene_bounds_merges_short_scene():
    # cena de 1s (40->41) e curta -> funde na anterior
    segs = _scene_bounds(0.0, 60.0, [20.0, 40.0, 41.0], min_scene=2.5)
    assert segs == [(0.0, 20.0), (20.0, 41.0), (41.0, 60.0)]


def test_scene_bounds_short_first_merges_forward():
    segs = _scene_bounds(0.0, 60.0, [1.0, 30.0], min_scene=2.5)
    assert segs[0][0] == 0.0 and segs[0][1] == 30.0


def test_cap_scenes_reduces_count():
    bounds = [(0, 5), (5, 7), (7, 30), (30, 33), (33, 60)]
    capped = _cap_scenes(bounds, 3)
    assert len(capped) == 3
    assert capped[0][0] == 0 and capped[-1][1] == 60  # cobre o intervalo todo


def test_merge_runs_collapses_same_mode():
    cl = [
        (0, 10, SceneComposition(GAMEPLAY_ONLY, confidence=0.5)),
        (10, 20, SceneComposition(GAMEPLAY_ONLY, confidence=0.7)),
        (20, 30, SceneComposition(FULLSCREEN_FACE, face_box=(0.3, 0.1, 0.7, 0.8), confidence=0.9)),
    ]
    runs = _merge_runs(cl)
    assert len(runs) == 2
    assert runs[0][0] == 0 and runs[0][1] == 20 and runs[0][2].mode == GAMEPLAY_ONLY
    assert runs[1][2].mode == FULLSCREEN_FACE


def test_merge_runs_medians_boxes():
    cl = [
        (0, 10, SceneComposition(GAMEPLAY_CAM, cam_box=(0.0, 0.0, 0.2, 0.3), confidence=0.6)),
        (10, 20, SceneComposition(GAMEPLAY_CAM, cam_box=(0.04, 0.02, 0.24, 0.34), confidence=0.8)),
    ]
    runs = _merge_runs(cl)
    assert len(runs) == 1
    box = runs[0][2].cam_box
    assert box == (0.02, 0.01, 0.22, 0.32)
