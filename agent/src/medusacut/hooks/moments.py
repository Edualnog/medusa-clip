"""Taxonomia de TIPO DE MOMENTO -> faixa de duracao natural do corte.

Um clutch/fail e punchy: nao precisa de 1 minuto. Ja um RP/historia/treta pede
ARCO longo. Forcar tudo pro mesmo `min_len` (antes 60s) estragava os dois lados —
clutch esticado vira chato, historia cortada perde o sentido. Aqui cada tipo tem a
SUA faixa; o juiz classifica o momento (vendo frames + fala) e escolhe a duracao
dentro dela, e o pipeline trava a duracao final na faixa do tipo.

Tudo puro (sem LLM/ffmpeg): testavel direto.
"""

from __future__ import annotations

# tipo -> (min_s, max_s, descricao curta pt-BR). ORDEM = curto -> longo (vira o prompt).
MOMENTS: dict[str, tuple[float, float, str]] = {
    "clutch": (15.0, 50.0, "jogada decisiva / virada / play rapida"),
    "fail": (12.0, 45.0, "erro / morte boba / vacilo"),
    "reaction": (12.0, 45.0, "reacao forte / susto / surto"),
    "funny": (15.0, 60.0, "momento engracado / piada"),
    "highlight": (15.0, 60.0, "jogada / destaque generico"),
    "drama": (30.0, 120.0, "treta / discussao / polemica"),
    "buildup": (30.0, 150.0, "tensao / build-up que se monta"),
    "story": (40.0, 180.0, "RP / narrativa / historia completa"),
}

DEFAULT_MOMENT = "highlight"  # tipo usado qdo o LLM nao classifica / manda lixo

# sinonimos comuns (pt/en) que o LLM pode devolver -> tipo canonico.
_ALIASES: dict[str, str] = {
    "play": "clutch", "jogada": "highlight", "virada": "clutch", "ace": "clutch",
    "morte": "fail", "death": "fail", "erro": "fail", "vacilo": "fail",
    "reacao": "reaction", "react": "reaction", "susto": "reaction", "surto": "reaction",
    "engracado": "funny", "comedia": "funny", "comedy": "funny", "piada": "funny",
    "treta": "drama", "discussao": "drama", "polemica": "drama", "beef": "drama",
    "tensao": "buildup", "tension": "buildup", "build-up": "buildup", "buildup ": "buildup",
    "rp": "story", "historia": "story", "narrativa": "story", "story_rp": "story",
    "lore": "story", "destaque": "highlight",
}


def normalize_moment(value: object) -> str:
    """Texto livre do LLM -> tipo canonico (ou DEFAULT_MOMENT)."""
    if not isinstance(value, str):
        return DEFAULT_MOMENT
    v = value.strip().lower()
    if v in MOMENTS:
        return v
    return _ALIASES.get(v, DEFAULT_MOMENT)


def moment_bounds(
    moment_type: str, *, floor: float | None = None, ceil: float | None = None
) -> tuple[float, float]:
    """Faixa (min,max) do tipo, opcionalmente apertada por um envelope global.

    `floor` sobe o minimo (ex.: min_len pedido na CLI); `ceil` baixa o maximo
    (ex.: max_len/MAX_LEN). Mantem min <= max mesmo com envelope estreito.
    """
    lo, hi, _ = MOMENTS.get(moment_type, MOMENTS[DEFAULT_MOMENT])
    if floor is not None:
        lo, hi = max(lo, floor), max(hi, floor)
    if ceil is not None:
        hi = min(hi, ceil)
        lo = min(lo, hi)
    return lo, hi


def prompt_lines() -> str:
    """Lista 'tipo: descricao (min-max s)' p/ injetar no prompt do juiz."""
    return "\n".join(
        f"  - {k}: {desc} ({lo:.0f}-{hi:.0f}s)" for k, (lo, hi, desc) in MOMENTS.items()
    )
