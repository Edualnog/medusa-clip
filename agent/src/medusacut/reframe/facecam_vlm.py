"""Fallback de facecam via VLM.

Quando o detector de rosto (YuNet) nao acha um rosto ESTAVEL, o modelo multimodal
— que ja sabe ver a cena — diz se ha um overlay de webcam e em que canto. Cobre o
caso que o usuario apontou: facecam nem sempre e rosto. Pode ser **avatar de VTuber**
(personagem 2D/3D) ou **handcam** — que um detector de rosto ignora 100%.

So roda quando a deteccao de rosto falha -> 1 chamada por job (barata).
A chamada usa a chave do usuario (server-side). `parse_vlm_facecam` e pura (testavel).
"""

from __future__ import annotations

from medusacut.reframe.saliency import facecam_rect

_SYSTEM = (
    "Voce analisa frames de um video de GAMEPLAY pra localizar o overlay de webcam do "
    "streamer (facecam). Pode ser um ROSTO, um AVATAR de VTuber (personagem 2D/3D) ou uma "
    "HANDCAM. Em geral e um retangulo FIXO num canto, visualmente distinto do jogo. "
    "Responda SOMENTE JSON."
)

_USER = (
    "Ha um overlay de webcam/facecam fixo nestes frames? Responda um JSON:\n"
    '  "present": true/false,\n'
    '  "kind": "face" | "avatar" | "handcam" | "none",\n'
    '  "corner": "tl" | "tr" | "bl" | "br" | null,   (canto onde fica)\n'
    '  "box": [x0,y0,x1,y1] normalizado 0-1, ou null, (retangulo do overlay)\n'
    '  "confidence": 0.0-1.0\n'
    "Se nao houver overlay de webcam (so gameplay em tela cheia), present=false."
)


def detect_facecam_vlm(
    frame_paths: list[str], *, min_conf: float = 0.5
) -> tuple[float, float, float, float] | None:
    """Caixa normalizada do facecam segundo o VLM, ou None. So chama se houver frames."""
    if not frame_paths:
        return None
    from medusacut.llm import chat_json_multimodal

    try:
        data, _ = chat_json_multimodal(_SYSTEM, _USER, frame_paths, temperature=0.1)
    except Exception:
        return None
    return parse_vlm_facecam(data, min_conf=min_conf)


def parse_vlm_facecam(
    data: dict, *, min_conf: float = 0.5
) -> tuple[float, float, float, float] | None:
    """Interpreta a resposta do VLM numa caixa (x0,y0,x1,y1) normalizada. Pura."""
    if not isinstance(data, dict) or not data.get("present"):
        return None
    try:
        if float(data.get("confidence", 0) or 0) < min_conf:
            return None
    except (TypeError, ValueError):
        return None

    box = data.get("box")
    if _valid_box(box):
        x0, y0, x1, y1 = (float(v) for v in box)
        return (
            round(max(0.0, x0), 4),
            round(max(0.0, y0), 4),
            round(min(1.0, x1), 4),
            round(min(1.0, y1), 4),
        )

    # sem box utilizavel, mas com canto -> usa o preset daquele canto
    corner = str(data.get("corner") or "").lower() or None
    return facecam_rect(corner)


def _valid_box(box) -> bool:
    """Box plausivel: 4 numeros, ordenado, dentro de [0,1] e nao a tela inteira."""
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        return False
    try:
        x0, y0, x1, y1 = (float(v) for v in box)
    except (TypeError, ValueError):
        return False
    if not (x1 > x0 and y1 > y0):
        return False
    if not (-0.05 <= x0 and x1 <= 1.05 and -0.05 <= y0 and y1 <= 1.05):
        return False
    return (x1 - x0) * (y1 - y0) < 0.9  # cobrir 90%+ do quadro nao e facecam
