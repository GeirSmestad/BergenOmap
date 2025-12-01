import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional


GPX_NS = {
    'gpx': 'http://www.topografix.com/GPX/1/1',
    'gpxtpx': 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1',
    'gpxx': 'http://www.garmin.com/xmlschemas/GpxExtensions/v3'
}


def parse_strava_gpx(gpx_bytes: bytes) -> Dict[str, Any]:
    """
    Parse a Strava-exported GPX file and return a JSON-serializable dict.
    Focuses on track metadata plus an easy-to-iterate list of trackpoints.
    """
    root = ET.fromstring(gpx_bytes)

    metadata = {
        "creator": root.attrib.get("creator"),
        "version": root.attrib.get("version")
    }

    metadata_time = root.find('gpx:metadata/gpx:time', GPX_NS)
    if metadata_time is not None and metadata_time.text:
        metadata["time"] = metadata_time.text.strip()

    tracks: List[Dict[str, Any]] = []
    for trk in root.findall('gpx:trk', GPX_NS):
        track_info = {
            "name": _get_text(trk, 'gpx:name'),
            "type": _get_text(trk, 'gpx:type'),
            "segments": []
        }

        segments = []
        for seg in trk.findall('gpx:trkseg', GPX_NS):
            segment_points = [
                _parse_track_point(tp)
                for tp in seg.findall('gpx:trkpt', GPX_NS)
            ]
            segments.append({"points": segment_points})

        track_info["segments"] = segments
        track_info["points"] = [pt for segment in segments for pt in segment["points"]]
        tracks.append(track_info)

    return {
        "metadata": metadata,
        "tracks": tracks
    }


def _parse_track_point(trkpt: ET.Element) -> Dict[str, Any]:
    lat = float(trkpt.attrib['lat'])
    lon = float(trkpt.attrib['lon'])

    point: Dict[str, Any] = {
        "lat": lat,
        "lon": lon,
    }

    ele = _get_text(trkpt, 'gpx:ele')
    if ele is not None:
        point["elevation"] = _maybe_float(ele)

    time_text = _get_text(trkpt, 'gpx:time')
    if time_text is not None:
        point["time"] = time_text

    extensions = _parse_track_point_extensions(trkpt)
    if extensions:
        point["extensions"] = extensions

    return point


def _parse_track_point_extensions(trkpt: ET.Element) -> Dict[str, Any]:
    extensions_node = trkpt.find('gpx:extensions', GPX_NS)
    if extensions_node is None:
        return {}

    tpx_node = extensions_node.find('gpxtpx:TrackPointExtension', GPX_NS)
    if tpx_node is None:
        return {}

    extension_values: Dict[str, Any] = {}
    for child in tpx_node:
        tag_name = _strip_namespace(child.tag)
        value = _maybe_float(child.text) if child.text else None
        extension_values[tag_name] = value

    return {k: v for k, v in extension_values.items() if v is not None}


def _strip_namespace(tag: str) -> str:
    return tag.split('}', 1)[-1] if '}' in tag else tag


def _get_text(node: ET.Element, path: str) -> Optional[str]:
    found = node.find(path, GPX_NS)
    if found is not None and found.text:
        return found.text.strip()
    return None


def _maybe_float(value: str) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

