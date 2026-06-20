"""Classifica a COMPOSICAO de um trecho, pra escolher o layout 9:16 certo.

Video editado de gameplay troca de composicao cena a cena: gameplay com webcam num
canto, REACAO em tela cheia (rosto grande), ou gameplay puro/menu. Um layout fixo
(split facecam-em-cima) com uma box GLOBAL quebra fora do caso "cam de canto estavel"
— transforma o painel de cima em lixo (concreto, ou um borrao do rosto fullscreen).

Esta unidade decide, por trecho, qual dos 3 modos usar:
  - GAMEPLAY_CAM    : gameplay + webcam num canto  -> split, com a box DAQUELE trecho
  - FULLSCREEN_FACE : rosto/streamer em tela cheia -> crop centrado no rosto (sem split)
  - GAMEPLAY_ONLY   : so jogo/menu                 -> crop dinamico / blur-fit

Primario: VLM (ve os frames; o dono pediu pra usar mais o LLM pra acertar o corte).
Fallback puro (sem rede/chave): heuristica sobre deteccoes YuNet — tamanho e posicao
do rosto separam "cam de canto" (pequeno, num canto) de "reacao" (grande, centrado).

`decide_mode_from_faces` e `parse_vlm_composition` sao PURAS (testaveis sem cv2/LLM).
cv2/LLM importados DENTRO das funcoes (deps pesadas).
"""

from __future__ import annotations

from dataclasses import dataclass

# Modos de composicao.
GAMEPLAY_CAM = "gameplay_cam"
FULLSCREEN_FACE = "fullscreen_face"
GAMEPLAY_ONLY = "gameplay_only"

# Limiares da heuristica (normalizados 0..1). Calibrados no material do zorothax:
# a webcam circular de canto tinha rosto ~0.06-0.15 de largura; a reacao fullscreen
# tinha rosto ~0.25+ e centrado.
BIG_FACE_W = 0.20      # rosto >= isso (largura) = candidato a "tela cheia"
CENTER_LO, CENTER_HI = 0.32, 0.68   # cx dentro disso = "centrado"
MIN_FRAC = 0.34        # fracao dos frames amostrados que precisa concordar


@dataclass(frozen=True)
class SceneComposition:
    """Resultado da classificacao de um trecho.

    - `mode`: um dos 3 modos acima.
    - `cam_box`: caixa (x0,y0,x1,y1 normalizada) da webcam de canto (so GAMEPLAY_CAM).
    - `face_box`: caixa do rosto em tela cheia (so FULLSCREEN_FACE) p/ centrar o crop.
    - `confidence`: 0..1.
    - `source`: "vlm" | "yunet" | "default" (de onde veio a decisao).
    """

    mode: str
    cam_box: tuple[float, float, float, float] | None = None
    face_box: tuple[float, float, float, float] | None = None
    confidence: float = 0.0
    source: str = "default"


def classify_segment(
    media_path: str,
    t0: float,
    t1: float,
    *,
    use_vlm: bool = True,
    n_frames: int = 3,
    cache_dir: str | None = None,
) -> SceneComposition:
    """Classifica o trecho [t0,t1]. Tenta o VLM; cai pra heuristica YuNet.

    Nunca levanta: erro de rede/chave/cv2 -> melhor esforco (no pior caso GAMEPLAY_ONLY,
    que com blur-fit nunca fica feio).
    """
    import os
    import tempfile

    out_dir = cache_dir or tempfile.mkdtemp(prefix="medusacomp_")
    os.makedirs(out_dir, exist_ok=True)

    # frames do trecho (reusa o extrator do pipeline)
    try:
        from medusacut.frames import extract_keyframes

        imgs = extract_keyframes(media_path, t0, t1, n=n_frames, out_dir=out_dir)
    except Exception:
        imgs = []

    # 1) VLM (primario)
    if use_vlm and imgs:
        comp = _classify_vlm(imgs)
        if comp is not None:
            return comp

    # 2) heuristica YuNet (fallback puro de rede)
    faces = _detect_faces(media_path, t0, t1, n=max(n_frames, 6))
    return decide_mode_from_faces(faces)


# --------------------------------------------------------------------------- VLM

_SYSTEM = (
    "Voce analisa frames de um VIDEO DE GAMEPLAY (editado) pra decidir como reenquadrar "
    "pra 9:16. Identifique a COMPOSICAO do trecho. Responda SOMENTE JSON."
)

_USER = (
    "Considerando o CONJUNTO dos frames, de UMA UNICA resposta (nao uma por frame) "
    "com a composicao DOMINANTE do trecho, num JSON:\n"
    '  "mode": "gameplay_cam" | "fullscreen_face" | "gameplay_only",\n'
    "     - gameplay_cam: jogo ocupa a tela e ha um overlay de webcam (rosto/avatar/handcam) FIXO num canto;\n"
    "     - fullscreen_face: o rosto/streamer ocupa a tela quase toda (reacao/camera fechada), pouco ou nenhum jogo;\n"
    "     - gameplay_only: so o jogo/menu, sem webcam visivel;\n"
    '  "cam_box": [x0,y0,x1,y1] normalizado 0-1 da webcam de canto, ou null (so em gameplay_cam),\n'
    '  "face_box": [x0,y0,x1,y1] normalizado 0-1 do rosto, ou null (so em fullscreen_face),\n'
    '  "confidence": 0.0-1.0\n'
)


def _classify_vlm(frame_paths: list[str]) -> SceneComposition | None:
    from medusacut.llm import chat_json_multimodal

    try:
        data, _ = chat_json_multimodal(_SYSTEM, _USER, frame_paths, temperature=0.1)
    except Exception:
        return None
    return parse_vlm_composition(data)


def parse_vlm_composition(data: dict, *, min_conf: float = 0.4) -> SceneComposition | None:
    """Interpreta a resposta do VLM. Pura. None se invalida/sem confianca.

    Aceita tanto a resposta UNICA `{"mode":...}` quanto a por-frame
    `{"frames":[{...},...]}` (o modelo as vezes devolve uma por frame): nesse caso,
    agrega no modo DOMINANTE e na MEDIANA das caixas daquele modo.
    """
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("frames"), list):
        data = _reduce_frames(data["frames"])
        if data is None:
            return None
    mode = str(data.get("mode") or "").strip().lower()
    if mode not in (GAMEPLAY_CAM, FULLSCREEN_FACE, GAMEPLAY_ONLY):
        return None
    try:
        conf = float(data.get("confidence", 0) or 0)
    except (TypeError, ValueError):
        conf = 0.0
    if conf < min_conf:
        return None
    cam = _clean_box(data.get("cam_box")) if mode == GAMEPLAY_CAM else None
    face = _clean_box(data.get("face_box")) if mode == FULLSCREEN_FACE else None
    # gameplay_cam sem box utilizavel nao da pra fazer split -> trata como gameplay_only
    if mode == GAMEPLAY_CAM and cam is None:
        return SceneComposition(GAMEPLAY_ONLY, confidence=conf, source="vlm")
    return SceneComposition(mode, cam_box=cam, face_box=face, confidence=conf, source="vlm")


def _reduce_frames(frames: list) -> dict | None:
    """Agrega classificacoes por-frame numa unica: modo DOMINANTE (mais comum;
    desempate por soma de confianca) + MEDIANA das caixas desse modo."""
    from collections import Counter

    items = [f for f in frames if isinstance(f, dict)]
    modes = [
        (str(f.get("mode") or "").strip().lower(), f) for f in items
    ]
    valid = [(m, f) for m, f in modes if m in (GAMEPLAY_CAM, FULLSCREEN_FACE, GAMEPLAY_ONLY)]
    if not valid:
        return None
    counts = Counter(m for m, _ in valid)

    def _confsum(mode: str) -> float:
        s = 0.0
        for m, f in valid:
            if m == mode:
                try:
                    s += float(f.get("confidence", 0) or 0)
                except (TypeError, ValueError):
                    pass
        return s

    top = max(counts, key=lambda m: (counts[m], _confsum(m)))
    sub = [f for m, f in valid if m == top]
    conf = _confsum(top) / max(1, len(sub))
    cam = _median_boxes([_clean_box(f.get("cam_box")) for f in sub]) if top == GAMEPLAY_CAM else None
    face = _median_boxes([_clean_box(f.get("face_box")) for f in sub]) if top == FULLSCREEN_FACE else None
    return {"mode": top, "cam_box": cam, "face_box": face, "confidence": conf}


def _median_boxes(boxes: list) -> tuple[float, float, float, float] | None:
    """Mediana coordenada-a-coordenada das caixas nao-nulas (ou None)."""
    from statistics import median

    bs = [b for b in boxes if b is not None]
    if not bs:
        return None
    return tuple(round(median(b[i] for b in bs), 4) for i in range(4))


def _clean_box(v) -> tuple[float, float, float, float] | None:
    """Valida [x0,y0,x1,y1] normalizado, ordenado e nao-degenerado."""
    if not isinstance(v, (list, tuple)) or len(v) != 4:
        return None
    try:
        x0, y0, x1, y1 = (float(c) for c in v)
    except (TypeError, ValueError):
        return None
    x0, x1 = sorted((max(0.0, min(1.0, x0)), max(0.0, min(1.0, x1))))
    y0, y1 = sorted((max(0.0, min(1.0, y0)), max(0.0, min(1.0, y1))))
    if (x1 - x0) < 0.02 or (y1 - y0) < 0.02:
        return None
    return (round(x0, 4), round(y0, 4), round(x1, 4), round(y1, 4))


# ----------------------------------------------------------------- heuristica CV


def decide_mode_from_faces(
    faces: list[tuple[float, float, float, float]],
    *,
    n_samples: int | None = None,
) -> SceneComposition:
    """Decide o modo a partir de rostos detectados (cx,cy,w,h normalizados). Pura.

    - rosto GRANDE e CENTRADO na maioria dos frames -> FULLSCREEN_FACE;
    - rostos PEQUENOS e consistentes num canto       -> GAMEPLAY_CAM;
    - senao                                          -> GAMEPLAY_ONLY.
    `n_samples` (frames lidos) ancora a fracao; default = nº de rostos.
    """
    if not faces:
        return SceneComposition(GAMEPLAY_ONLY, confidence=0.5, source="yunet")
    total = n_samples or len(faces)
    need = max(1, int(total * MIN_FRAC))

    big_centered = [
        f for f in faces if f[2] >= BIG_FACE_W and CENTER_LO <= f[0] <= CENTER_HI
    ]
    if len(big_centered) >= need:
        cx = _median(f[0] for f in big_centered)
        cy = _median(f[1] for f in big_centered)
        w = _median(f[2] for f in big_centered)
        h = _median(f[3] for f in big_centered)
        return SceneComposition(
            FULLSCREEN_FACE, face_box=_box(cx, cy, w, h, pad=1.2),
            confidence=min(1.0, len(big_centered) / total), source="yunet",
        )

    # cam de canto: rostos pequenos, fora do centro, agrupados
    corner = [f for f in faces if f[2] < BIG_FACE_W and not (CENTER_LO <= f[0] <= CENTER_HI)]
    if len(corner) >= need:
        cx = _median(f[0] for f in corner)
        cy = _median(f[1] for f in corner)
        w = _median(f[2] for f in corner)
        h = _median(f[3] for f in corner)
        return SceneComposition(
            GAMEPLAY_CAM, cam_box=_box(cx, cy, w, h, pad=1.6),
            confidence=min(1.0, len(corner) / total), source="yunet",
        )

    return SceneComposition(GAMEPLAY_ONLY, confidence=0.5, source="yunet")


def _detect_faces(
    media_path: str, t0: float, t1: float, *, n: int
) -> list[tuple[float, float, float, float]]:
    """Amostra n frames em [t0,t1], roda YuNet, devolve (cx,cy,w,h) normalizados."""
    try:
        import cv2  # noqa: PLC0415

        from medusacut.reframe.facecam import _make_detector
    except Exception:
        return []

    cap = cv2.VideoCapture(media_path)
    if not cap.isOpened():
        return []
    out: list[tuple[float, float, float, float]] = []
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w_px = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1.0
        h_px = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1.0
        det = _make_detector(cv2, int(w_px), int(h_px))
        span = max(0.0, t1 - t0)
        for i in range(n):
            t = t0 + (span * (i + 0.5) / n if n else 0.0)
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, frame = cap.read()
            if not ok:
                continue
            for (x, y, fw, fh) in det(frame):
                out.append(
                    ((x + fw / 2) / w_px, (y + fh / 2) / h_px, fw / w_px, fh / h_px)
                )
    finally:
        cap.release()
    return out


def _box(cx, cy, w, h, *, pad: float) -> tuple[float, float, float, float]:
    w *= pad
    h *= pad
    return (
        round(max(0.0, cx - w / 2), 4),
        round(max(0.0, cy - h / 2), 4),
        round(min(1.0, cx + w / 2), 4),
        round(min(1.0, cy + h / 2), 4),
    )


def _median(xs) -> float:
    from statistics import median

    return float(median(xs))
