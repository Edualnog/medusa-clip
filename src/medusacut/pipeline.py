"""Orquestracao do tool pessoal. De um link do YouTube a cortes 9:16 na pasta out/.

Funcao sincrona e simples — uso pessoal, um video por vez. Sem fila/worker.

Fluxo atual: ingest -> preprocess -> sinal de audio -> fusao (duracao automatica)
-> render (GameplayOnly). Transcricao/gancho/facecam (passos 3/6/7) chegam nos
Marcos 2-4; a assinatura ja contempla `game_context`/`layout` pra elas.

Progresso: passe `progress(frac, label)` pra acompanhar 0..1 (CLI/painel local).
"""

from __future__ import annotations

import json
import os
from typing import Callable

from medusacut.types import Candidate, Clip, Media

# Callback de progresso: progress(fraction_0a1, rotulo_da_etapa).
Progress = Callable[[float, str], None]


def generate_clips(
    url: str,
    *,
    out_dir: str = "out",
    max_clips: int = 10,
    layout: str = "facecam_top_gameplay_bottom",
    game_context: str = "",
    facecam_corner: str | None = None,
    score_virality: bool = True,
    progress: Progress | None = None,
) -> list[Clip]:
    """
    Fluxo (duracao do corte decidida pelo conteudo):
      1. ingest YouTube (yt-dlp): baixa o video
      2. preprocess (ffmpeg): extrai audio, le fps/dimensoes
      3. transcribe (faster-whisper): timestamps por palavra            [no score]
      4. extrair sinais (audio_energy [+ scene_change/chat_velocity])
      5. fundir -> top-N candidatos (DURACAO AUTOMATICA)
      6. >>> GANCHO + score de viralizacao (LLM) -> re-rank <<<
      7. detectar facecam -> planejar layout                            [M4 parcial]
      8. render (ffmpeg) [+ legenda karaoke no M2]
      9. escrever clipes em out_dir/ + manifest.json

    `score_virality` liga a etapa 6 (precisa de LLM_API_KEY no .env; se faltar ou
    falhar, cai pro ranking por energia). `progress` reporta 0..1 pra UI/CLI.
    """
    from medusacut import preprocess
    from medusacut.ingest import youtube
    from medusacut.signals import audio_energy, fusion

    cache_dir = os.path.join(out_dir, ".cache")

    # 1. baixar (reporta 0.00 -> 0.45 conforme o yt-dlp baixa)
    _report(progress, 0.0, "Baixando video…")
    media = youtube.download(url, cache_dir, on_progress=_band(progress, 0.0, 0.45))

    # 2. extrair audio
    _report(progress, 0.45, "Extraindo audio…")
    wav_path = preprocess.extract_audio(media, cache_dir)

    # 4-5. sinal de audio -> fusao -> candidatos
    _report(progress, 0.55, "Medindo energia…")
    audio_track = audio_energy.analyze(wav_path)
    _report(progress, 0.65, "Selecionando os melhores momentos…")
    candidates = fusion.select_candidates(
        [audio_track], max_clips=max_clips, duration=media.duration
    )

    # 6-9. score (LLM) + reframe + render + manifest (0.65 -> 1.00)
    return render_candidates(
        media,
        candidates,
        out_dir=out_dir,
        layout=layout,
        url=url,
        facecam_corner=facecam_corner,
        audio_path=wav_path,
        game_context=game_context,
        score_virality=score_virality,
        progress=_band(progress, 0.65, 1.0),
    )


def render_candidates(
    media: Media,
    candidates: list[Candidate],
    *,
    out_dir: str,
    layout: str,
    url: str,
    facecam_corner: str | None = None,
    audio_path: str | None = None,
    game_context: str = "",
    score_virality: bool = False,
    progress: Progress | None = None,
) -> list[Clip]:
    """Score de viralizacao (opcional) + reframe + render + manifest.

    Separado de `generate_clips` de proposito: o painel local reusa o download e
    a analise (em cache) e so re-pontua/re-renderiza ao mexer nos parametros.
    `layout='gameplay_only'` faz crop central estatico; qualquer outro valor usa o
    enquadramento dinamico. Com `score_virality`, transcreve cada candidato, pede
    gancho+nota ao LLM, aperta o in/out e RE-RANQUEIA por viralizacao.
    """
    os.makedirs(out_dir, exist_ok=True)
    cache_dir = os.path.join(out_dir, ".cache")
    layout_name = _resolve_layout(layout, facecam_corner)

    # 6. gancho + score (LLM) -> re-rank. Falha de LLM nao derruba o pipeline.
    if score_virality and audio_path:
        scored = _score_candidates(
            media, candidates, audio_path, game_context, _band(progress, 0.0, 0.5)
        )
        render_progress = _band(progress, 0.5, 1.0)
    else:
        scored = [(c, None) for c in candidates]
        render_progress = progress

    total = len(scored)
    clips: list[Clip] = []
    for i, (cand, hook) in enumerate(scored, start=1):
        _report(render_progress, (i - 1) / total if total else 1.0, f"Enquadrando e renderizando {i}/{total}…")
        file_name = f"clip_{i:02d}.mp4"
        out_path = os.path.join(out_dir, file_name)
        _render_layout(media, cand, layout_name, facecam_corner, out_path, cache_dir)
        clips.append(
            Clip(
                index=i,
                start=cand.start,
                end=cand.end,
                score=cand.score,
                file=file_name,
                hook=hook.hook if hook else "",
                reason=hook.reason if hook else "",
                virality_score=hook.virality_score if hook else None,
            )
        )

    _write_manifest(out_dir, url=url, layout=layout_name, clips=clips)
    _report(render_progress, 1.0, "Pronto")
    return clips


def _score_candidates(media, candidates, audio_path, game_context, progress):
    """Transcreve + pontua cada candidato, aperta o in/out e ordena por viralizacao.

    Retorna [(candidate_possivelmente_refinado, HookResult|None)], ja ordenado
    (maior nota primeiro; sem nota por ultimo). Erro de LLM/whisper vira nota None.
    """
    from medusacut.hooks import base as hooks
    from medusacut.transcribe import whisper

    total = len(candidates)
    scored: list[tuple[Candidate, object | None]] = []
    for i, cand in enumerate(candidates, start=1):
        _report(progress, (i - 1) / total if total else 1.0, f"Transcrevendo e avaliando {i}/{total}…")
        try:
            words = whisper.transcribe_segment(audio_path, cand.start, cand.end)
            text = whisper.transcript_text(words)
            result = hooks.score_candidate(cand, text, game_context)
            if result.refined_start is not None and result.refined_end is not None:
                cand = Candidate(result.refined_start, result.refined_end, cand.score)
            scored.append((cand, result))
        except Exception as exc:  # LLM/whisper/rede: nao derruba o pipeline
            import sys

            print(f"[medusacut] sem score de viralizacao no corte {i}: {exc}", file=sys.stderr)
            scored.append((cand, None))

    scored.sort(
        key=lambda t: t[1].virality_score if t[1] is not None else -1.0, reverse=True
    )
    return scored


def _resolve_layout(layout: str, facecam_corner: str | None) -> str:
    """Normaliza o nome do layout; facecam sem canto definido cai pro dinamico."""
    if layout == "facecam_top_gameplay_bottom":
        return layout if facecam_corner else "dynamic_gameplay"
    if layout in ("gameplay_blur", "gameplay_only", "dynamic_gameplay"):
        return layout
    return "dynamic_gameplay"  # nome legado/desconhecido -> dinamico


def _render_layout(
    media: Media,
    candidate: Candidate,
    layout_name: str,
    facecam_corner: str | None,
    out_path: str,
    cache_dir: str,
) -> None:
    """Despacha o render conforme o layout resolvido."""
    from medusacut.reframe import compose, layouts
    from medusacut.render import ffmpeg as render

    if layout_name == "facecam_top_gameplay_bottom":
        compose.render_facecam_layout(
            media, candidate, facecam_corner=facecam_corner,
            out_path=out_path, cache_dir=cache_dir, dynamic=True,
        )
    elif layout_name == "gameplay_blur":
        compose.render_blur_fit(media, candidate, out_path=out_path)
    else:
        dynamic = layout_name != "gameplay_only"
        plan = layouts.build_plan(media, candidate, dynamic=dynamic, facecam_corner=facecam_corner)
        render.render_clip(media, candidate, plan, out_path, cache_dir=cache_dir)


def _report(progress: Progress | None, frac: float, label: str) -> None:
    if progress is not None:
        progress(min(1.0, max(0.0, frac)), label)


def _band(progress: Progress | None, lo: float, hi: float) -> Progress | None:
    """Reescala um progresso 0..1 de uma sub-etapa pra faixa [lo, hi] do total."""
    if progress is None:
        return None
    return lambda f, label: progress(lo + (hi - lo) * min(1.0, max(0.0, f)), label)


def _write_manifest(out_dir: str, *, url: str, layout: str, clips: list[Clip]) -> None:
    manifest = {
        "source": url,
        "layout": layout,
        "count": len(clips),
        "clips": [c.to_manifest_entry() for c in clips],
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
