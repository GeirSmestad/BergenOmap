from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

from PIL import Image

from bergenomap.services.map_metadata_ai_service import MapMetadata, load_prompt_text, parse_metadata_best_effort
from bergenomap.services.map_ocr_service import OcrEngine, OcrTextGroup, TesseractOcrEngine


@dataclass(frozen=True)
class PipelineResult:
    ocr_groups: list[dict]
    metadata: dict


def run_map_metadata_pipeline(
    image: Image.Image,
    *,
    ocr_engine: OcrEngine | None = None,
    prompt_path: str | None = None,
    openai_api_key: str | None = None,
) -> PipelineResult:
    """
    Run OCR -> (optional) OpenAI parse -> normalized metadata.

    This function must not raise. On failures it returns empty OCR groups and safe defaults.
    """

    try:
        engine = ocr_engine or TesseractOcrEngine()
        groups = engine.extract_text_groups(image)
        ocr_groups = [_group_to_json(g) for g in groups]
    except Exception:
        return PipelineResult(ocr_groups=[], metadata=MapMetadata().to_dict())

    default_prompt_path = str(Path(__file__).resolve().parents[1] / "prompts" / "map_metadata_from_ocr.txt")
    try:
        prompt_text = load_prompt_text(default_path=prompt_path or default_prompt_path)
    except Exception:
        prompt_text = ""

    try:
        parsed = parse_metadata_best_effort(
            ocr_groups=ocr_groups,
            prompt_text=prompt_text,
            openai_api_key=openai_api_key,
        )
        return PipelineResult(ocr_groups=ocr_groups, metadata=parsed.to_dict())
    except Exception:
        return PipelineResult(ocr_groups=ocr_groups, metadata=MapMetadata().to_dict())


def _group_to_json(group: OcrTextGroup) -> dict:
    out = {"text": group.text, "bbox": group.bbox}
    if group.conf is not None:
        out["conf"] = group.conf
    return out


