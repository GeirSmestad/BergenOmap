export function getSegmentLatLngs(trackPayload) {
  const tracks = trackPayload?.gpx?.tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return [];
  }

  const segments = [];

  tracks.forEach((track) => {
    const trackSegments = track?.segments;
    if (!Array.isArray(trackSegments)) {
      return;
    }

    trackSegments.forEach((segment) => {
      const points = Array.isArray(segment?.points) ? segment.points : [];
      const latLngs = points
        .map((point) => normalizeLatLng(point))
        .filter(Boolean);

      if (latLngs.length > 0) {
        segments.push(latLngs);
      }
    });
  });

  return segments;
}

function normalizeLatLng(point) {
  if (!point) {
    return null;
  }

  const lat = Number(point.lat);
  const lon = Number(point.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return [lat, lon];
}

