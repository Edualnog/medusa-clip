"""Auto-deteccao da caixa do facecam (rosto do streamer).

Roda um detector de rosto (OpenCV Haar, ja vem no opencv-python) em frames
amostrados; se um rosto aparece de forma ESTAVEL no mesmo lugar (a webcam e fixa),
devolve a caixa normalizada. Sem rosto estavel (ex.: cam do volante) -> None, e o
pipeline cai pro ajuste manual.

cv2 importado DENTRO da funcao (dep pesada).
"""

from __future__ import annotations

from statistics import median

# Box do rosto e menor que o quadro da webcam; expande um pouco pra emoldurar.
FACE_PAD = 1.5


def detect_facecam(
    media_path: str,
    *,
    samples: int = 40,
    min_hits_frac: float = 0.25,
) -> tuple[float, float, float, float] | None:
    """Caixa (x0,y0,x1,y1 normalizada) do facecam, ou None se nao for confiavel."""
    import cv2  # noqa: PLC0415

    cap = cv2.VideoCapture(media_path)
    if not cap.isOpened():
        return None
    try:
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        if cascade.empty():
            return None

        w_px = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1.0
        h_px = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        step = max(1, total // samples) if total else 1

        hits: list[tuple[float, float, float, float]] = []
        taken = 0
        idx = 0
        while taken < samples:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx * step)
            ok, frame = cap.read()
            if not ok:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
            for (x, y, fw, fh) in faces:
                hits.append(((x + fw / 2) / w_px, (y + fh / 2) / h_px, fw / w_px, fh / h_px))
            taken += 1
            idx += 1
    finally:
        cap.release()

    return consolidate(hits, taken, min_hits_frac=min_hits_frac, pad=FACE_PAD)


def consolidate(
    hits: list[tuple[float, float, float, float]],
    samples: int,
    *,
    min_hits_frac: float = 0.25,
    pad: float = FACE_PAD,
) -> tuple[float, float, float, float] | None:
    """Aglutina deteccoes (cx,cy,w,h) numa caixa estavel. Pura (testavel)."""
    need = max(1, int(samples * min_hits_frac))
    if len(hits) < need:
        return None

    cx = median(h[0] for h in hits)
    cy = median(h[1] for h in hits)
    # so as deteccoes proximas do centro mediano (a webcam e fixa)
    near = [h for h in hits if abs(h[0] - cx) < 0.15 and abs(h[1] - cy) < 0.15]
    if len(near) < need:
        return None

    mcx = median(h[0] for h in near)
    mcy = median(h[1] for h in near)
    mw = median(h[2] for h in near) * pad
    mh = median(h[3] for h in near) * pad

    x0 = max(0.0, mcx - mw / 2)
    y0 = max(0.0, mcy - mh / 2)
    x1 = min(1.0, mcx + mw / 2)
    y1 = min(1.0, mcy + mh / 2)
    return (round(x0, 4), round(y0, 4), round(x1, 4), round(y1, 4))
