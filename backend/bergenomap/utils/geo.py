from __future__ import annotations

import math
from typing import Iterable, Sequence, Tuple


LatLon = Tuple[float, float]
Pixel = Tuple[float, float]


"""Haversine distance in meters"""
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def latlon_to_local_xy(lat: float, lon: float, lat0: float, lon0: float) -> Tuple[float, float]:
    """
    Convert lat/lon to local tangent-plane x/y meters.
    lat0/lon0 is the reference origin.
    """
    R = 6371000
    dlat = math.radians(lat - lat0)
    dlon = math.radians(lon - lon0)
    x = R * dlon * math.cos(math.radians(lat0))
    y = R * dlat
    return x, y


"""Helper function to estimate the number of meters per pixel from a list of pixel coordinates and
their associated latitudes and longitudes."""
def meters_per_pixel_xy(pixel_pts: Sequence[Pixel], geo_pts: Sequence[LatLon]) -> Tuple[float, float]:
    # Use the first real-world point as local origin
    lat0, lon0 = geo_pts[0]

    # Convert all geo points to local meter coordinates
    xy = [latlon_to_local_xy(lat, lon, lat0, lon0) for lat, lon in geo_pts]

    ratios_x = []
    ratios_y = []

    n = len(pixel_pts)
    for i in range(n):
        for j in range(i + 1, n):
            (px1, py1), (px2, py2) = pixel_pts[i], pixel_pts[j]
            dx_px = px2 - px1
            dy_px = py2 - py1

            x1, y1 = xy[i]
            x2, y2 = xy[j]
            dx_m = x2 - x1
            dy_m = y2 - y1

            # Only compute ratios when movement exists in that axis
            if dx_px != 0:
                ratios_x.append(dx_m / dx_px)
            if dy_px != 0:
                ratios_y.append(dy_m / dy_px)

    m_per_px_x = sum(ratios_x) / len(ratios_x)
    m_per_px_y = sum(ratios_y) / len(ratios_y)

    return abs(m_per_px_x), abs(m_per_px_y)


"""Helper function to calculate the area between the rectangle encompassed by a latitude and longitude"""
def rectangular_area_from_bounds(nw_corner: LatLon, se_corner: LatLon) -> float:
    """
    nw_corner = [lat, lon] of north-west corner
    se_corner = [lat, lon] of south-east corner
    Returns area in m².
    """
    nw_lat, nw_lon = nw_corner
    se_lat, se_lon = se_corner

    # North–south distance: longitude fixed at NW
    ns_dist = haversine(nw_lat, nw_lon, se_lat, nw_lon)

    # East–west distance: at mid-latitude for accuracy
    mid_lat = (nw_lat + se_lat) / 2
    ew_dist = haversine(mid_lat, nw_lon, mid_lat, se_lon)

    # Return unit: Square kilometers (legacy comment in Backend.py)
    return (ns_dist * ew_dist) / 1000000.0


