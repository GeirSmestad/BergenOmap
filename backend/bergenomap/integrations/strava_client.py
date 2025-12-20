from __future__ import annotations

"""
Strava integration boundary (stub).

This module is intentionally empty for now. When you add Strava integration later,
the intent is:
- keep OAuth/token handling + HTTP calls here (no Flask, no DB)
- keep orchestration in a service (see `bergenomap/services/strava_sync_service.py`)
"""


class StravaClient:
    def __init__(self) -> None:
        raise NotImplementedError("Strava integration not implemented yet.")


