"""Extrai keyframes de um trecho (pra o LLM VER a cena no julgamento viral)."""

from __future__ import annotations

import os
import subprocess


def extract_keyframes(
    media_path: str,
    start: float,
    end: float,
    *,
    n: int = 4,
    width: int = 512,
    out_dir: str,
) -> list[str]:
    """Pega `n` frames espacados no trecho [start, end], reduzidos a `width` px.

    Resolucao baixa de proposito: o modelo so precisa entender a acao, e menos
    pixels = menos tokens. Devolve os caminhos dos .jpg.
    """
    os.makedirs(out_dir, exist_ok=True)
    dur = max(0.1, end - start)
    paths: list[str] = []
    for i in range(n):
        t = start + dur * (i + 0.5) / n
        path = os.path.join(out_dir, f"kf_{i:02d}.jpg")
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-ss", f"{t:.3f}", "-i", media_path,
            "-frames:v", "1", "-vf", f"scale={width}:-1", "-q:v", "4", path,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode == 0 and os.path.exists(path):
            paths.append(path)
    return paths
