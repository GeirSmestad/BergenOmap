from __future__ import annotations

"""
Strava synchronization service (stub).

Later this service should orchestrate:
- calling `StravaClient` to fetch activities/tracks
- storing tracks via repositories (e.g. `tracks_repo`)

It should remain independent of Flask request globals.
"""


def sync_strava_for_user(*args, **kwargs):
    raise NotImplementedError("Strava sync not implemented yet.")


