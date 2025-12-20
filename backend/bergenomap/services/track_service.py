from __future__ import annotations

from typing import Any, Dict, Optional, Tuple


def compute_gpx_bounds(parsed_gpx: Dict[str, Any]) -> Optional[Tuple[float, float, float, float]]:
    """
    Computes min/max lat/lon by iterating all points in the parsed GPX structure.
    Returns (min_lat, min_lon, max_lat, max_lon) or None if no valid points.
    """
    min_lat = None
    min_lon = None
    max_lat = None
    max_lon = None

    tracks = parsed_gpx.get("tracks", []) if isinstance(parsed_gpx, dict) else []
    for track in tracks:
        points = track.get("points", []) if isinstance(track, dict) else []
        for point in points:
            if not isinstance(point, dict):
                continue
            lat = point.get("lat")
            lon = point.get("lon")
            if lat is None or lon is None:
                continue
            try:
                lat = float(lat)
                lon = float(lon)
            except (TypeError, ValueError):
                continue

            min_lat = lat if min_lat is None else min(min_lat, lat)
            max_lat = lat if max_lat is None else max(max_lat, lat)
            min_lon = lon if min_lon is None else min(min_lon, lon)
            max_lon = lon if max_lon is None else max(max_lon, lon)

    if min_lat is None:
        return None

    return (min_lat, min_lon, max_lat, max_lon)


