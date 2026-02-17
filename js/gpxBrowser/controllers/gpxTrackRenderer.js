const DEFAULT_POLYLINE_OPTIONS = {
  color: '#ff2d2d',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round'
};
const OUTLINE_COLOR = '#2b0000'; // very dark red for subtle contrast
const OUTLINE_EXTRA_WEIGHT = 1; // add 1px around the inner stroke
const SPEED_MAX_KMH_DEFAULT = 12;
const SPEED_COLOR_LEVELS = 60; // quantize for fewer layers without looking "steppy"
const SPEED_OUTLINE_COLOR = '#000000';
const SPEED_OUTLINE_OPACITY = 0.55;
const SPEED_HITBOX_OPACITY = 0.001;
const EARTH_RADIUS_METERS = 6371000;

export function createGpxTrackRenderer({
  map,
  polylineOptions = {},
  paneName = 'gpx-track-pane',
  paneZIndex = 650,
  onPointHover
} = {}) {
  if (!map || typeof L === 'undefined') {
    throw new Error('Leaflet map instance is required for GPX track renderer');
  }

  ensurePane(map, paneName, paneZIndex);

  const layers = [];

  function clearTrack() {
    layers.splice(0).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  }

  function renderTrack(segmentLatLngs, segmentMetadata, { colorBySpeed = false, speedMaxKmh = SPEED_MAX_KMH_DEFAULT } = {}) {
    clearTrack();

    if (!Array.isArray(segmentLatLngs) || segmentLatLngs.length === 0) {
      return;
    }

    segmentLatLngs.forEach((segment, index) => {
      if (!Array.isArray(segment) || segment.length < 2) {
        return;
      }

      const metadataPoints = segmentMetadata?.[index] ?? [];

      const mergedOptions = {
        ...DEFAULT_POLYLINE_OPTIONS,
        ...polylineOptions
      };

      const baseWeight = typeof mergedOptions.weight === 'number'
        ? mergedOptions.weight
        : DEFAULT_POLYLINE_OPTIONS.weight;

      if (!colorBySpeed) {
        const outline = L.polyline(segment, {
          color: OUTLINE_COLOR,
          opacity: 1,
          weight: baseWeight + OUTLINE_EXTRA_WEIGHT,
          lineCap: mergedOptions.lineCap,
          lineJoin: mergedOptions.lineJoin,
          pane: paneName
        }).addTo(map);

        const polyline = L.polyline(segment, {
          ...mergedOptions,
          pane: paneName
        }).addTo(map);

        if (typeof polyline.bringToFront === 'function') {
          polyline.bringToFront();
        }

        if (typeof onPointHover === 'function') {
          polyline.on('mousemove', (event) => {
            const time = findClosestPointTime(event.latlng, segment, metadataPoints);
            onPointHover(time, event.latlng);
          });

          polyline.on('mouseout', () => {
            onPointHover(null, null);
          });
        }

        layers.push(outline, polyline);
        return;
      }

      const outline = L.polyline(segment, {
        color: SPEED_OUTLINE_COLOR,
        opacity: SPEED_OUTLINE_OPACITY,
        weight: baseWeight + OUTLINE_EXTRA_WEIGHT,
        lineCap: mergedOptions.lineCap,
        lineJoin: mergedOptions.lineJoin,
        pane: paneName,
        interactive: false
      }).addTo(map);

      const speedLayers = createSpeedColoredLayers({
        segment,
        metadataPoints,
        mergedOptions,
        baseWeight,
        paneName,
        speedMaxKmh
      });

      speedLayers.forEach((layer) => layer.addTo(map));

      let hitbox = null;
      if (typeof onPointHover === 'function') {
        hitbox = L.polyline(segment, {
          color: '#000000',
          opacity: SPEED_HITBOX_OPACITY,
          weight: baseWeight + 8,
          lineCap: mergedOptions.lineCap,
          lineJoin: mergedOptions.lineJoin,
          pane: paneName
        }).addTo(map);

        hitbox.on('mousemove', (event) => {
          const time = findClosestPointTime(event.latlng, segment, metadataPoints);
          onPointHover(time, event.latlng);
        });

        hitbox.on('mouseout', () => {
          onPointHover(null, null);
        });
      }

      speedLayers.forEach((layer) => {
        if (typeof layer.bringToFront === 'function') {
          layer.bringToFront();
        }
      });
      hitbox?.bringToFront?.();

      layers.push(outline, ...speedLayers);
      if (hitbox) {
        layers.push(hitbox);
      }
    });
  }

  return {
    renderTrack,
    clearTrack
  };
}

function ensurePane(map, paneName, paneZIndex) {
  const existingPane = map.getPane(paneName);
  if (existingPane) {
    return existingPane;
  }

  map.createPane(paneName);
  const pane = map.getPane(paneName);
  pane.style.zIndex = String(paneZIndex);
  pane.style.pointerEvents = 'auto';
  return pane;
}

function createSpeedColoredLayers({ segment, metadataPoints, mergedOptions, baseWeight, paneName, speedMaxKmh }) {
  const layers = [];

  const safeMax = Number.isFinite(speedMaxKmh) && speedMaxKmh > 0 ? speedMaxKmh : SPEED_MAX_KMH_DEFAULT;
  const fallbackColor = mergedOptions.color ?? DEFAULT_POLYLINE_OPTIONS.color;

  let currentColor = null;
  let currentPoints = null;

  for (let i = 0; i < segment.length - 1; i += 1) {
    const p1 = segment[i];
    const p2 = segment[i + 1];
    const t1 = metadataPoints?.[i]?.time ?? null;
    const t2 = metadataPoints?.[i + 1]?.time ?? null;

    const speed = computeSpeedKmh(p1, p2, t1, t2);
    const color = speedToHex(speed, safeMax, { fallback: fallbackColor });

    if (currentColor === null) {
      currentColor = color;
      currentPoints = [p1, p2];
      continue;
    }

    if (color === currentColor) {
      currentPoints.push(p2);
      continue;
    }

    layers.push(createSpeedPolyline(currentPoints, currentColor, mergedOptions, baseWeight, paneName));
    currentColor = color;
    currentPoints = [p1, p2];
  }

  if (currentColor !== null && Array.isArray(currentPoints) && currentPoints.length >= 2) {
    layers.push(createSpeedPolyline(currentPoints, currentColor, mergedOptions, baseWeight, paneName));
  }

  return layers;
}

function createSpeedPolyline(points, color, mergedOptions, baseWeight, paneName) {
  return L.polyline(points, {
    color,
    weight: baseWeight,
    opacity: typeof mergedOptions.opacity === 'number' ? mergedOptions.opacity : DEFAULT_POLYLINE_OPTIONS.opacity,
    lineCap: mergedOptions.lineCap,
    lineJoin: mergedOptions.lineJoin,
    pane: paneName,
    interactive: false
  });
}

function computeSpeedKmh(p1, p2, time1, time2) {
  const t1 = parseTimeMs(time1);
  const t2 = parseTimeMs(time2);
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) {
    return null;
  }
  const dtSeconds = (t2 - t1) / 1000;
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
    return null;
  }
  const distanceMeters = haversineDistanceMeters(p1, p2);
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }
  return (distanceMeters / dtSeconds) * 3.6;
}

function parseTimeMs(value) {
  if (!value) {
    return NaN;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  const ms = Date.parse(value);
  return ms;
}

function haversineDistanceMeters(p1, p2) {
  // p1/p2 are [lat, lon] in degrees
  const lat1 = toRadians(p1?.[0]);
  const lon1 = toRadians(p1?.[1]);
  const lat2 = toRadians(p2?.[0]);
  const lon2 = toRadians(p2?.[1]);

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return NaN;
  }

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function toRadians(deg) {
  return (Number(deg) * Math.PI) / 180;
}

function speedToHex(speedKmh, speedMaxKmh, { fallback } = {}) {
  if (!Number.isFinite(speedKmh)) {
    return fallback ?? DEFAULT_POLYLINE_OPTIONS.color;
  }

  const max = Number.isFinite(speedMaxKmh) && speedMaxKmh > 0 ? speedMaxKmh : SPEED_MAX_KMH_DEFAULT;
  const clamped = Math.max(0, Math.min(max, speedKmh));
  const tRaw = clamped / max;
  const t = quantize01(tRaw, SPEED_COLOR_LEVELS);

  // HSV interpolation: white (h=0,s=0,v=1) -> red (h=0,s=1,v=1).
  // Since hue and value are constant, this is simply saturation = t.
  const { r, g, b } = hsvToRgb(0, t, 1);
  return rgbToHex(r, g, b);
}

function quantize01(value, levels) {
  const safeLevels = Number.isFinite(levels) && levels > 1 ? levels : 1;
  const v = Math.max(0, Math.min(1, value));
  return Math.round(v * safeLevels) / safeLevels;
}

function hsvToRgb(h, s, v) {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hh < 60) {
    rp = c; gp = x; bp = 0;
  } else if (hh < 120) {
    rp = x; gp = c; bp = 0;
  } else if (hh < 180) {
    rp = 0; gp = c; bp = x;
  } else if (hh < 240) {
    rp = 0; gp = x; bp = c;
  } else if (hh < 300) {
    rp = x; gp = 0; bp = c;
  } else {
    rp = c; gp = 0; bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255)
  };
}

function rgbToHex(r, g, b) {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function toHexByte(value) {
  const v = Math.max(0, Math.min(255, Math.round(Number(value))));
  return v.toString(16).padStart(2, '0');
}

function findClosestPointTime(latlng, segment, metadataPoints) {
  /* TODO: If I read this right, it's very inefficient; O(n) of GPX length on the client
     every time the mouse cursor changes. Can be done in O(1) by attaching the time to each
     point on the polyline when creating it. Assuming I understand it right. */
  if (!Array.isArray(metadataPoints) || metadataPoints.length !== segment.length) {
    return null;
  }

  let closestIndex = -1;
  let shortestDistance = Infinity;

  segment.forEach((point, index) => {
    const distance = latLngDistance(latlng, point);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestIndex = index;
    }
  });

  if (closestIndex === -1) {
    return null;
  }

  return metadataPoints[closestIndex]?.time ?? null;
}

function latLngDistance(latlng, pointArray) {
  const latDiff = latlng.lat - pointArray[0];
  const lngDiff = latlng.lng - pointArray[1];
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

