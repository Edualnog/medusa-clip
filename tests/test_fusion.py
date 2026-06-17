"""Testes da fusao (duracao automatica). Stdlib puro: nao baixa video nem ffmpeg."""

from __future__ import annotations

from medusacut.signals.fusion import MAX_LEN, MIN_LEN, combine, select_candidates
from medusacut.types import ScoreTrack


def _track(scores: list[float], hop: float = 1.0, name: str = "t") -> ScoreTrack:
    times = [(i + 0.5) * hop for i in range(len(scores))]
    return ScoreTrack(times=times, scores=scores, hop=hop, name=name)


def test_picks_top_peaks_non_overlapping_within_bounds():
    scores = [0.0] * 200
    scores[20] = 5.0
    scores[100] = 4.0
    scores[180] = 3.0
    cands = select_candidates([_track(scores)], max_clips=3, duration=200.0)

    assert len(cands) == 3
    assert [round(c.score) for c in cands] == [5, 4, 3]  # ordenado por score
    for c in cands:
        assert MIN_LEN - 1e-6 <= c.duration <= MAX_LEN + 1e-6
    ordered = sorted(cands, key=lambda c: c.start)
    for a, b in zip(ordered, ordered[1:]):
        assert a.end <= b.start  # sem sobreposicao


def test_plateau_yields_longer_clip_than_spike():
    # plateau de acao sustentada (10..40) + um pico isolado e mais alto longe.
    scores = [0.0] * 120
    for i in range(10, 41):
        scores[i] = 3.0
    scores[90] = 5.0  # pico isolado, score maior -> escolhido primeiro
    cands = select_candidates([_track(scores)], max_clips=2, duration=120.0)

    assert len(cands) == 2
    by_score = {round(c.score): c for c in cands}
    spike = by_score[5]
    plateau = by_score[3]
    # o pico isolado vira um corte curto (~min_len); o plateau, um corte longo
    assert abs(spike.duration - MIN_LEN) < 1e-6
    assert plateau.duration > spike.duration


def test_max_len_caps_a_huge_plateau():
    scores = [3.0] * 200  # acao "infinita"
    cands = select_candidates([_track(scores)], max_clips=1, duration=200.0)
    assert len(cands) == 1
    assert cands[0].duration <= MAX_LEN + 1e-6


def test_min_score_excludes_below_average():
    # so o pico positivo deve virar corte; o resto esta na media (0) ou abaixo.
    scores = [-1.0] * 50
    scores[25] = 2.0
    cands = select_candidates([_track(scores)], max_clips=5, duration=50.0)
    assert len(cands) == 1
    assert cands[0].score == 2.0


def test_window_stays_inside_video_bounds():
    scores = [0.0] * 20
    scores[0] = 5.0  # pico logo no inicio -> nao pode comecar antes de 0
    scores[19] = 4.0  # pico no fim -> nao pode passar da duracao
    dur = 20.0
    cands = select_candidates([_track(scores)], max_clips=2, duration=dur)
    for c in cands:
        assert c.start >= 0.0
        assert c.end <= dur + 1e-6


def test_combine_weighted_sum_requires_aligned_grids():
    a = _track([1.0, 0.0, 0.0], name="audio")
    b = _track([0.0, 0.0, 2.0], name="scene")
    times, scores = combine([a, b], weights=[1.0, 0.5])
    assert times == a.times
    assert scores == [1.0, 0.0, 1.0]


def test_max_clips_zero_returns_empty():
    assert select_candidates([_track([1.0, 2.0])], max_clips=0) == []
