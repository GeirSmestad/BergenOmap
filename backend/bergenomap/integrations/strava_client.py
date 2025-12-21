from __future__ import annotations

"""
Strava integration boundary.

Rules:
- keep OAuth/token handling + HTTP calls here (no Flask, no DB)
- keep orchestration in a service (see `bergenomap/services/strava_sync_service.py`)
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import requests


class StravaApiError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, payload: Any | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


@dataclass(frozen=True)
class StravaTokens:
    access_token: str
    refresh_token: str
    expires_at: int
    scope: str | None = None
    athlete_id: int | None = None


class StravaClient:
    AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
    TOKEN_URL = "https://www.strava.com/oauth/token"
    API_BASE = "https://www.strava.com/api/v3"

    def __init__(self, *, timeout_s: float = 20.0) -> None:
        self._timeout_s = timeout_s

    def build_authorize_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        scope: str,
        state: str | None = None,
        approval_prompt: str = "force",
    ) -> str:
        params = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "approval_prompt": approval_prompt,
            "scope": scope,
        }
        if state:
            params["state"] = state
        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    def exchange_code_for_token(self, *, client_id: str, client_secret: str, code: str) -> StravaTokens:
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
        }
        data = self._post_json(self.TOKEN_URL, payload)
        return _parse_token_payload(data)

    def refresh_access_token(self, *, client_id: str, client_secret: str, refresh_token: str) -> StravaTokens:
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        data = self._post_json(self.TOKEN_URL, payload)
        return _parse_token_payload(data)

    def list_activities(
        self,
        *,
        access_token: str,
        page: int = 1,
        per_page: int = 200,
        after: int | None = None,
        before: int | None = None,
    ) -> list[dict]:
        params: Dict[str, Any] = {"page": page, "per_page": per_page}
        if after is not None:
            params["after"] = after
        if before is not None:
            params["before"] = before
        url = f"{self.API_BASE}/athlete/activities"
        data = self._get_json(url, access_token=access_token, params=params)
        if not isinstance(data, list):
            raise StravaApiError("Unexpected response from Strava athlete/activities (expected list)", payload=data)
        return data

    def get_activity_streams(
        self,
        *,
        access_token: str,
        activity_id: int,
        keys: str = "latlng,time,altitude",
        key_by_type: bool = True,
    ) -> dict:
        params = {"keys": keys, "key_by_type": "true" if key_by_type else "false"}
        url = f"{self.API_BASE}/activities/{activity_id}/streams"
        data = self._get_json(url, access_token=access_token, params=params)
        if not isinstance(data, (dict, list)):
            raise StravaApiError("Unexpected response from Strava activity streams", payload=data)
        return data

    def _get_json(self, url: str, *, access_token: str, params: Optional[dict] = None) -> Any:
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            response = requests.get(url, headers=headers, params=params, timeout=self._timeout_s)
        except requests.RequestException as exc:
            raise StravaApiError(f"Strava request failed: {exc}") from exc
        return _handle_json_response(response)

    def _post_json(self, url: str, payload: dict) -> Any:
        try:
            response = requests.post(url, data=payload, timeout=self._timeout_s)
        except requests.RequestException as exc:
            raise StravaApiError(f"Strava request failed: {exc}") from exc
        return _handle_json_response(response)


def _handle_json_response(response: requests.Response) -> Any:
    try:
        data = response.json()
    except ValueError:
        data = None

    if response.status_code >= 400:
        message = None
        if isinstance(data, dict):
            message = data.get("message") or data.get("error")
        message = message or f"Strava error {response.status_code}"
        raise StravaApiError(message, status_code=response.status_code, payload=data)

    return data


def _parse_token_payload(data: Any) -> StravaTokens:
    if not isinstance(data, dict):
        raise StravaApiError("Unexpected token response from Strava", payload=data)

    access_token = data.get("access_token")
    refresh_token = data.get("refresh_token")
    expires_at = data.get("expires_at")
    scope = data.get("scope")
    athlete = data.get("athlete") if isinstance(data.get("athlete"), dict) else None
    athlete_id = athlete.get("id") if athlete else None

    if not access_token or not refresh_token or not expires_at:
        raise StravaApiError("Token response missing required fields", payload=data)

    try:
        expires_at_int = int(expires_at)
    except (TypeError, ValueError) as exc:
        raise StravaApiError("Token response expires_at was invalid", payload=data) from exc

    return StravaTokens(
        access_token=str(access_token),
        refresh_token=str(refresh_token),
        expires_at=expires_at_int,
        scope=str(scope) if scope is not None else None,
        athlete_id=int(athlete_id) if athlete_id is not None else None,
    )


