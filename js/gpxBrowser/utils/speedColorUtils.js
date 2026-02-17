const EARTH_RADIUS_METERS = 6371000;

/**
 * Compute speed between two points.
 *
 * - Distance uses haversine (great-circle) on WGS84 sphere approximation.
 * - Time is parsed using Date.parse (expects ISO timestamps from GPX).
 * - Returns null when speed cannot be computed (missing/invalid timestamps, non-positive dt, invalid coords).
 */
export function computeSpeedKmh(p1, p2, time1, time2) {
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

  // m/s -> km/h
  return (distanceMeters / dtSeconds) * 3.6;
}

export function parseTimeMs(value) {
  if (!value) {
    return NaN;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return Date.parse(value);
}

export function haversineDistanceMeters(p1, p2) {
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

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const a = sinHalfLat * sinHalfLat
    + Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function toRadians(deg) {
  return (Number(deg) * Math.PI) / 180;
}

/**
 * Map speed (km/h) to a color on the HSV ramp:
 *
 * - 0 km/h  => solid white  (#ffffff)  = HSV(0, 0, 1)
 * - maxKmh  => solid red    (#ff0000)  = HSV(0, 1, 1)
 *
 * We do linear interpolation in HSV between those two endpoints.
 * Since hue (0) and value (1) are constant, this is equivalent to:
 *
 *   s = t, where t = clamp(speed/maxKmh, 0..1)
 *   HSV(0, s, 1) -> RGB = (1, 1-s, 1-s)
 *
 * Returned as hex. If speed is not finite, returns fallback.
 */
export function speedKmhToWhiteRedHex(speedKmh, { maxKmh = 12, levels = 60, fallback = '#ff2d2d' } = {}) {
  if (!Number.isFinite(speedKmh)) {
    return fallback;
  }

  const max = Number.isFinite(maxKmh) && maxKmh > 0 ? maxKmh : 12;
  const clamped = Math.max(0, Math.min(max, speedKmh));
  const tRaw = clamped / max;
  const t = quantize01(tRaw, levels);

  // HSV(0, t, 1) -> RGB(1, 1-t, 1-t)
  const r = 255;
  const gb = Math.round((1 - t) * 255);
  return rgbToHex(r, gb, gb);
}

export function quantize01(value, levels) {
  const safeLevels = Number.isFinite(levels) && levels > 1 ? levels : 1;
  const v = Math.max(0, Math.min(1, value));
  return Math.round(v * safeLevels) / safeLevels;
}

export function rgbToHex(r, g, b) {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function toHexByte(value) {
  const v = Math.max(0, Math.min(255, Math.round(Number(value))));
  return v.toString(16).padStart(2, '0');
}

