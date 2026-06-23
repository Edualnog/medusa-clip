"""Regressao: o pipeline DEVE chamar o juiz multimodal com a assinatura certa.

Houve um bug em que `_prepare_candidates` chamava `judge_candidate(cand, text, imgs,
...)` posicionalmente, mas a assinatura exige `win_start`/`win_end` keyword-only ->
TypeError engolido pelo except -> o juiz forte NUNCA rodava (selecao caia so na
triagem). Este teste fixa o contrato sem depender de LLM/whisper reais.
"""

from __future__ import annotations

from medusacut import pipeline
from medusacut.hooks.base import HookResult
from medusacut.types import Candidate, Media, Word


def test_prepare_candidates_calls_judge_with_window(monkeypatch, tmp_path):
    from medusacut import frames
    from medusacut.hooks import base as hooks
    from medusacut.transcribe import whisper

    monkeypatch.setattr(
        whisper, "transcribe_segment",
        lambda *a, **k: [Word(text="oi", start=101.0, end=101.5)],
    )
    monkeypatch.setattr(frames, "extract_keyframes", lambda *a, **k: ["/tmp/kf.jpg"])
    monkeypatch.setattr(hooks, "triage_score", lambda *a, **k: (50.0, None))

    captured = {}

    def fake_judge(transcript_ts, frame_paths, game_context="", **kw):
        captured.update(kw)
        captured["transcript_ts"] = transcript_ts
        return HookResult(hook="h", reason="r", virality_score=80.0)

    monkeypatch.setattr(hooks, "judge_candidate", fake_judge)

    media = Media(path="x.mp4", fps=30.0, width=1920, height=1080, duration=300.0)
    cand = Candidate(100.0, 180.0, 1.0)

    prepared, _usage = pipeline._prepare_candidates(
        media, [cand], "audio.wav", "GTA",
        score_virality=True, final_count=1, cache_dir=str(tmp_path),
        min_len=60, max_len=180, cuts=[120.0, 500.0],
    )

    # o juiz e chamado com a janela ALARGADA (centro 140 +- ceil/2=90 -> [50,230]),
    # nao a ancora crua — assim um tipo longo (story) consegue esticar alem dos 80s.
    assert captured["win_start"] == 50.0 and captured["win_end"] == 230.0
    assert captured["min_len"] == 60 and captured["max_len"] == 180
    # so as cenas DENTRO da janela
    assert captured["scene_cuts"] == [120.0]
    # transcricao COM TEMPO (nao texto plano)
    assert "101.0s" in captured["transcript_ts"]
    # e a nota do juiz chega no resultado
    assert prepared and prepared[0][1].virality_score == 80.0


def test_short_clutch_not_stretched_to_min_len(monkeypatch, tmp_path):
    """Regressao (#1): com min_len=60 do preset, um CLUTCH deve sair na duracao
    natural do tipo (15-50s), NAO esticado ate 60s. O envelope so limita o teto;
    o piso e por TIPO (floor=HARD_FLOOR no pipeline, nao o min_len pedido)."""
    from medusacut import frames
    from medusacut.hooks import base as hooks
    from medusacut.transcribe import whisper

    monkeypatch.setattr(
        whisper, "transcribe_segment",
        lambda *a, **k: [Word(text="oi", start=141.0, end=141.5)],
    )
    monkeypatch.setattr(frames, "extract_keyframes", lambda *a, **k: ["/tmp/kf.jpg"])
    monkeypatch.setattr(hooks, "triage_score", lambda *a, **k: (50.0, None))

    # juiz refina um clutch de 30s (140->170) dentro da janela
    monkeypatch.setattr(
        hooks, "judge_candidate",
        lambda *a, **k: HookResult(
            hook="ace", reason="r", virality_score=90.0,
            moment_type="clutch", refined_start=140.0, refined_end=170.0,
        ),
    )

    media = Media(path="x.mp4", fps=30.0, width=1920, height=1080, duration=300.0)
    cand = Candidate(100.0, 180.0, 1.0)

    prepared, _usage = pipeline._prepare_candidates(
        media, [cand], "audio.wav", "Valorant",
        score_virality=True, final_count=1, cache_dir=str(tmp_path),
        min_len=60, max_len=180,
    )

    final = prepared[0][0]
    dur = final.end - final.start
    assert 15.0 <= dur <= 50.0   # faixa do clutch
    assert dur < 60.0            # NAO foi esticado ate o min_len do preset
