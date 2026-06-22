"""Nome do arquivo do corte vem do hook (manchete), nao 'clip_NN'."""

from __future__ import annotations

from medusacut.pipeline import clip_filename


def test_slug_from_hook():
    assert clip_filename(1, "Clutch 1v5 no ultimo round!") == "01-clutch-1v5-no-ultimo-round.mp4"


def test_strips_accents_and_punct():
    assert clip_filename(2, "Reação INSANA: não acreditei!!!") == "02-reacao-insana-nao-acreditei.mp4"


def test_empty_hook_falls_back():
    assert clip_filename(3, "") == "clip_03.mp4"
    assert clip_filename(3, "   ") == "clip_03.mp4"
    assert clip_filename(3, "!!! ¿¿¿") == "clip_03.mp4"


def test_index_prefix_zero_padded_and_ordered():
    names = [clip_filename(i, f"corte {i}") for i in range(1, 4)]
    assert names == sorted(names)  # ordem da pasta = ordem dos cortes


def test_length_is_capped():
    long_hook = "palavra " * 40
    name = clip_filename(7, long_hook)
    stem = name[len("07-"):-len(".mp4")]
    assert len(stem) <= 50
    assert not stem.endswith("-")
