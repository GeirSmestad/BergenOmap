from __future__ import annotations

"""
Map OCR boundary.

This module intentionally isolates OCR behind a small interface so we can
swap engines later (Tesseract, EasyOCR, cloud OCR, etc.) without touching
the rest of the pipeline.
"""

from dataclasses import dataclass
from typing import Iterable, List, Protocol, Sequence

from PIL import Image, ImageDraw, ImageFont


@dataclass(frozen=True)
class OcrTextGroup:
    """
    A "group" of text with a bounding box in the image.

    bbox is [x, y, w, h] in pixel space.
    conf is best-effort (0-100). Not all OCR engines provide meaningful confidence.
    """

    text: str
    bbox: list[int]
    conf: int | None = None


class OcrEngine(Protocol):
    def extract_text_groups(self, image: Image.Image) -> List[OcrTextGroup]:
        """Extract text groups from an image."""


def annotate_text_groups(
    image: Image.Image,
    groups: Sequence[OcrTextGroup],
    *,
    max_labels: int = 250,
) -> Image.Image:
    """
    Return a copy of `image` with OCR bounding boxes drawn.

    Intended for CLI debugging/tuning.
    """

    out = image.copy().convert("RGB")
    draw = ImageDraw.Draw(out)

    # Best-effort font; PIL's default font is fine if truetype isn't available.
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for idx, group in enumerate(groups[: max_labels or 0]):
        x, y, w, h = group.bbox
        x2 = x + w
        y2 = y + h
        draw.rectangle([x, y, x2, y2], outline=(255, 0, 0), width=2)

        label = group.text.strip()
        if group.conf is not None:
            label = f"{label} ({group.conf})"
        label = label[:60] + ("…" if len(label) > 60 else "")
        if label:
            draw.text((x, max(0, y - 12)), label, fill=(255, 0, 0), font=font)

    return out


def _clamp_int(value: float | int | None, *, default: int = 0, min_v: int = 0, max_v: int = 100) -> int:
    try:
        v = int(float(value))  # handles strings like "95.123"
    except Exception:
        v = default
    if v < min_v:
        return min_v
    if v > max_v:
        return max_v
    return v


def _iter_lines_from_tesseract_data(rows: Iterable[dict]) -> Iterable[OcrTextGroup]:
    """
    Group tesseract words into line-level groups using (block_num, par_num, line_num).
    """

    current_key = None
    current_words: list[str] = []
    current_boxes: list[tuple[int, int, int, int]] = []
    current_confs: list[int] = []

    def flush() -> OcrTextGroup | None:
        if not current_words or not current_boxes:
            return None

        xs = [b[0] for b in current_boxes]
        ys = [b[1] for b in current_boxes]
        x2s = [b[2] for b in current_boxes]
        y2s = [b[3] for b in current_boxes]

        x1 = min(xs)
        y1 = min(ys)
        x2 = max(x2s)
        y2 = max(y2s)

        text = " ".join(w for w in current_words if w).strip()
        if not text:
            return None

        conf = None
        if current_confs:
            # Mean confidence for the line.
            conf = int(sum(current_confs) / len(current_confs))

        return OcrTextGroup(text=text, bbox=[x1, y1, max(0, x2 - x1), max(0, y2 - y1)], conf=conf)

    for row in rows:
        try:
            text = str(row.get("text") or "").strip()
        except Exception:
            text = ""

        # Skip empty tokens.
        if not text:
            continue

        key = (row.get("block_num"), row.get("par_num"), row.get("line_num"))
        if current_key is None:
            current_key = key
        if key != current_key:
            group = flush()
            if group is not None:
                yield group
            current_key = key
            current_words = []
            current_boxes = []
            current_confs = []

        left = _clamp_int(row.get("left"), default=0, min_v=0, max_v=10_000_000)
        top = _clamp_int(row.get("top"), default=0, min_v=0, max_v=10_000_000)
        width = _clamp_int(row.get("width"), default=0, min_v=0, max_v=10_000_000)
        height = _clamp_int(row.get("height"), default=0, min_v=0, max_v=10_000_000)
        x2 = left + width
        y2 = top + height

        current_words.append(text)
        current_boxes.append((left, top, x2, y2))
        current_confs.append(_clamp_int(row.get("conf"), default=0, min_v=0, max_v=100))

    group = flush()
    if group is not None:
        yield group


class TesseractOcrEngine:
    def __init__(
        self,
        *,
        lang: str = "nor+eng",
        psm: int | None = None,
        oem: int | None = None,
        min_conf: int = 25,
        max_image_dim: int = 2800,
    ) -> None:
        """
        lang: tesseract language string (e.g. "nor+eng")
        psm/oem: tesseract config overrides (optional)
        min_conf: filter out low-confidence tokens (line confidence is mean of tokens)
        max_image_dim: downscale very large images for speed/robustness
        """

        self._lang = lang
        self._psm = psm
        self._oem = oem
        self._min_conf = int(min_conf)
        self._max_image_dim = int(max_image_dim)

    def extract_text_groups(self, image: Image.Image) -> List[OcrTextGroup]:
        # Local import: pytesseract is an optional dependency until enabled.
        import pytesseract

        prepared = image
        if max(image.width, image.height) > self._max_image_dim:
            ratio = self._max_image_dim / float(max(image.width, image.height))
            new_size = (max(1, int(image.width * ratio)), max(1, int(image.height * ratio)))
            prepared = image.resize(new_size, resample=Image.Resampling.BILINEAR)

        config_parts: list[str] = []
        if self._psm is not None:
            config_parts.append(f"--psm {int(self._psm)}")
        if self._oem is not None:
            config_parts.append(f"--oem {int(self._oem)}")
        config = " ".join(config_parts) if config_parts else None

        data = pytesseract.image_to_data(
            prepared,
            lang=self._lang,
            config=config,
            output_type=pytesseract.Output.DICT,
        )

        # Convert tesseract's columnar dict format into rows.
        keys = list(data.keys())
        n = len(data.get("text") or [])
        rows: list[dict] = []
        for i in range(n):
            row = {k: (data[k][i] if isinstance(data.get(k), list) and i < len(data[k]) else None) for k in keys}
            rows.append(row)

        groups: list[OcrTextGroup] = []
        for group in _iter_lines_from_tesseract_data(rows):
            if group.conf is not None and group.conf < self._min_conf:
                continue
            groups.append(group)

        # Sort stable top-to-bottom, then left-to-right.
        groups.sort(key=lambda g: (g.bbox[1], g.bbox[0]))
        return groups


