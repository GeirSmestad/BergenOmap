from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from bergenomap.integrations.openai_client import OpenAiClient, OpenAiClientConfig


@dataclass(frozen=True)
class MapMetadata:
    map_area: str = ""
    map_event: str = ""
    map_date: str = ""
    map_scale: str = ""
    map_course: str = ""
    map_attribution: str = ""

    def to_dict(self) -> dict:
        return {
            "map_area": self.map_area,
            "map_event": self.map_event,
            "map_date": self.map_date,
            "map_scale": self.map_scale,
            "map_course": self.map_course,
            "map_attribution": self.map_attribution,
        }


DEFAULT_METADATA = MapMetadata()


def load_prompt_text(*, default_path: str) -> str:
    prompt_path = os.environ.get("MAP_OCR_PROMPT_PATH") or default_path
    path = Path(prompt_path)
    return path.read_text(encoding="utf-8")


def parse_metadata_best_effort(
    *,
    ocr_groups: list[dict],
    prompt_text: str,
    openai_api_key: str | None,
) -> MapMetadata:
    """
    Best-effort extraction using OpenAI when configured, otherwise heuristics.

    This must never raise: it always returns a MapMetadata with safe defaults.
    """

    # Always compute some heuristic candidates; used both as fallback and to normalize.
    heur = _heuristic_parse(ocr_groups)

    api_key = (openai_api_key or "").strip()
    if not api_key:
        return heur

    model = (os.environ.get("OPENAI_MODEL") or "gpt-4o-mini").strip()
    timeout_s = float(os.environ.get("OPENAI_TIMEOUT_S") or "30")

    try:
        client = OpenAiClient(OpenAiClientConfig(api_key=api_key, model=model, timeout_s=timeout_s))
        raw = client.parse_map_metadata_json(prompt=prompt_text, ocr_groups=ocr_groups)
        return _coerce_metadata(raw, fallback=heur)
    except Exception:
        return heur


def _coerce_metadata(raw: Dict[str, Any], *, fallback: MapMetadata) -> MapMetadata:
    """
    Normalize to our strict shape; ensure all keys exist and are strings.
    """

    def s(key: str) -> str:
        value = raw.get(key, "")
        if value is None:
            return ""
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, str):
            return value.strip()
        return ""

    map_scale = _normalize_scale(s("map_scale")) or fallback.map_scale
    map_date = _normalize_date(s("map_date")) or fallback.map_date
    map_course = _normalize_course(s("map_course")) or fallback.map_course

    return MapMetadata(
        map_area=s("map_area") or fallback.map_area,
        map_event=s("map_event") or fallback.map_event,
        map_date=map_date,
        map_scale=map_scale,
        map_course=map_course,
        map_attribution=s("map_attribution") or fallback.map_attribution,
    )


def _joined_text(ocr_groups: list[dict]) -> str:
    parts: list[str] = []
    for g in ocr_groups:
        t = g.get("text") if isinstance(g, dict) else None
        if isinstance(t, str) and t.strip():
            parts.append(t.strip())
    return "\n".join(parts)


_SCALE_RE = re.compile(r"(?:1\s*[:.]\s*)(\d{3,6})")


def _normalize_scale(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = text.strip()
    if not t:
        return ""
    m = _SCALE_RE.search(t.replace(" ", ""))
    if not m:
        return ""
    digits = m.group(1)
    return f"1:{digits}"


_COURSE_RE = re.compile(
    r"\b(?:[A-H]|[A-H]-OPEN|[A-H]\s*OPEN|[A-H]\s*-\s*OPEN|"
    r"H\d{1,2}|K\d{1,2}|D\d{1,2}|C\d{1,2}|"
    r"H\s*\d{1,2}|K\s*\d{1,2}|D\s*\d{1,2}|C\s*\d{1,2})\b",
    flags=re.IGNORECASE,
)


def _normalize_course(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = text.strip()
    if not t:
        return ""
    m = _COURSE_RE.search(t.upper().replace(" ", ""))
    if not m:
        return ""
    # Preserve the token but normalize spacing and hyphens a bit.
    token = m.group(0).upper().replace(" ", "")
    token = token.replace("OPEN", "OPEN")
    token = token.replace("--", "-")
    return token


def _normalize_date(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = text.strip()
    if not t:
        return ""

    # Try ISO first
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(t[:10], fmt).date().isoformat()
        except Exception:
            pass

    # Try Norwegian-ish dd.mm.yyyy or dd/mm/yyyy
    m = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b", t)
    if m:
        dd = int(m.group(1))
        mm = int(m.group(2))
        yy = int(m.group(3))
        if yy < 100:
            yy = 2000 + yy if yy < 70 else 1900 + yy
        try:
            return datetime(yy, mm, dd).date().isoformat()
        except Exception:
            return ""

    return ""


def _heuristic_parse(ocr_groups: list[dict]) -> MapMetadata:
    """
    Lightweight fallback: extract only the most reliable signals (scale/date/course).
    """

    text = _joined_text(ocr_groups)
    scale = _normalize_scale(text)

    # Find a likely course token (if any)
    course = ""
    m = _COURSE_RE.search(text.upper())
    if m:
        course = _normalize_course(m.group(0))

    # Find a likely date token (if any)
    date = ""
    for line in text.splitlines():
        date = _normalize_date(line)
        if date:
            break

    return MapMetadata(
        map_area="",
        map_event="",
        map_date=date,
        map_scale=scale,
        map_course=course,
        map_attribution="",
    )


