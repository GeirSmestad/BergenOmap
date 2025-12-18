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

export function computeSampledTrackBounds(trackPayload, sampleCount = 20) {
  const segments = getAllSegments(trackPayload);
  if (segments.length === 0) {
    return null;
  }

  const segmentLengths = segments.map((segment) =>
    Array.isArray(segment?.points) ? segment.points.length : 0
  );
  const totalPoints = segmentLengths.reduce((sum, len) => sum + len, 0);

  if (totalPoints <= 0) {
    return null;
  }

  const desiredSamples = Math.max(2, Math.min(sampleCount, totalPoints));
  const sampleIndices = computeUniformSampleIndices(totalPoints, desiredSamples);

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let usedSamples = 0;

  sampleIndices.forEach((globalIndex) => {
    const point = getPointAtGlobalIndex(segments, segmentLengths, globalIndex);
    const latLng = normalizeLatLng(point);
    if (!latLng) {
      return;
    }
    const [lat, lon] = latLng;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    usedSamples += 1;
  });

  if (usedSamples === 0) {
    return null;
  }

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    sampleCount: usedSamples,
    totalPointCount: totalPoints
  };
}

function getAllSegments(trackPayload) {
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
      if (Array.isArray(segment?.points) && segment.points.length) {
        segments.push(segment);
      }
    });
  });

  return segments;
}

function computeUniformSampleIndices(totalPoints, sampleCount) {
  if (totalPoints <= 0) {
    return [];
  }
  if (sampleCount <= 1) {
    return [0];
  }
  if (sampleCount >= totalPoints) {
    return Array.from({ length: totalPoints }, (_, idx) => idx);
  }

  const lastIndex = totalPoints - 1;
  const indices = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / (sampleCount - 1);
    indices.push(Math.round(t * lastIndex));
  }

  // De-duplicate (rounding can create duplicates for small tracks)
  return Array.from(new Set(indices));
}

function getPointAtGlobalIndex(segments, segmentLengths, globalIndex) {
  let idx = globalIndex;
  for (let i = 0; i < segments.length; i += 1) {
    const segLen = segmentLengths[i] ?? 0;
    if (idx < segLen) {
      return segments[i]?.points?.[idx] ?? null;
    }
    idx -= segLen;
  }
  return null;
}

