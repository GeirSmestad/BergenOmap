from __future__ import annotations

"""
OpenAI integration boundary.

Rules:
- keep HTTP calls here (no Flask, no DB)
- keep orchestration in a service or CLI tool
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests


class OpenAiApiError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, payload: Any | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


@dataclass(frozen=True)
class OpenAiClientConfig:
    api_key: str
    model: str
    timeout_s: float = 30.0


class OpenAiClient:
    """
    Minimal OpenAI client using Chat Completions with JSON-only output.
    """

    CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"

    def __init__(self, config: OpenAiClientConfig) -> None:
        self._config = config

    def parse_map_metadata_json(
        self,
        *,
        prompt: str,
        ocr_groups: list[dict],
    ) -> dict:
        """
        Ask the model to return a JSON object with the required keys.
        Returns the parsed JSON object as a dict.
        """

        headers = {
            "Authorization": f"Bearer {self._config.api_key}",
            "Content-Type": "application/json",
        }

        # Force JSON object. Supported for modern OpenAI chat models.
        payload: Dict[str, Any] = {
            "model": self._config.model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": [{"type": "text", "text": _safe_json_dumps(ocr_groups)}]},
            ],
        }

        try:
            response = requests.post(
                self.CHAT_COMPLETIONS_URL,
                headers=headers,
                json=payload,
                timeout=self._config.timeout_s,
            )
        except requests.RequestException as exc:
            raise OpenAiApiError(f"OpenAI request failed: {exc}") from exc

        data = _handle_json_response(response)

        try:
            content = data["choices"][0]["message"]["content"]
        except Exception as exc:
            raise OpenAiApiError("Unexpected OpenAI response format (missing choices/message/content)", payload=data) from exc

        parsed = _safe_json_loads(content)
        if not isinstance(parsed, dict):
            raise OpenAiApiError("OpenAI returned non-object JSON", payload={"content": content})
        return parsed


def _handle_json_response(response: requests.Response) -> Any:
    try:
        data = response.json()
    except ValueError:
        data = None

    if response.status_code >= 400:
        message = None
        if isinstance(data, dict):
            message = data.get("error", {}).get("message") or data.get("message") or data.get("error")
        message = message or f"OpenAI error {response.status_code}"
        raise OpenAiApiError(message, status_code=response.status_code, payload=data)

    return data


def _safe_json_dumps(value: Any) -> str:
    import json

    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        # Best-effort; never throw because of weird OCR payload.
        return "[]"


def _safe_json_loads(text: str) -> Any:
    import json

    try:
        return json.loads(text)
    except Exception:
        # Try to salvage if the model wrapped JSON in text.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass
        raise


