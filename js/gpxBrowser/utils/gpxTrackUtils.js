export function getSegmentLatLngs(trackPayload) {
  const tracks = trackPayload?.gpx?.tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return { segments: [], metadata: [] };
  }

  const segments = [];
  const metadata = [];

  tracks.forEach((track) => {
    const trackSegments = track?.segments;
    if (!Array.isArray(trackSegments)) {
      return;
    }

    trackSegments.forEach((segment) => {
      const points = Array.isArray(segment?.points) ? segment.points : [];
      const latLngs = [];
      const metaEntries = [];

      points.forEach((point) => {
        const latLng = normalizeLatLng(point);
        if (!latLng) {
          return;
        }
        latLngs.push(latLng);
        metaEntries.push({
          time: point?.time ?? null
        });
      });

      if (latLngs.length > 0) {
        segments.push(latLngs);
        metadata.push(metaEntries);
      }
    });
  });

  return { segments, metadata };
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

