import { ONLY_FOLLOW_WHEN_ACCURACY_IS_BETTER_THAN } from '../config.js';

export function getMapCenterCoords(definition) {
  if (
    !definition ||
    !Array.isArray(definition.nw_coords) ||
    !Array.isArray(definition.se_coords)
  ) {
    return null;
  }

  const lat = (definition.nw_coords[0] + definition.se_coords[0]) / 2;
  const lng = (definition.nw_coords[1] + definition.se_coords[1]) / 2;
  return { lat, lng };
}

export function calculateDistanceMeters(pointA, pointB) {
  if (!pointA || !pointB) {
    return null;
  }

  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371000; // meters
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLon = toRad(pointB.lng - pointA.lng);
  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export function formatDistanceLabel(distanceInMeters) {
  if (distanceInMeters === null || typeof distanceInMeters === 'undefined') {
    return 'Ukjent avstand';
  }

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }

  return `${(distanceInMeters / 1000).toFixed(1)} km`;
}

export function isAccuracyAcceptable(accuracyInMeters) {
  if (typeof accuracyInMeters !== 'number') {
    return false;
  }

  return accuracyInMeters <= ONLY_FOLLOW_WHEN_ACCURACY_IS_BETTER_THAN;
}

export function parseMapScaleDenominator(mapScale) {
  if (mapScale === null || typeof mapScale === 'undefined') {
    return null;
  }

  if (typeof mapScale !== 'string') {
    return null;
  }

  const trimmed = mapScale.trim();
  if (!trimmed) {
    return null;
  }

  // We consider the stored value malformed unless it is strictly on the form "1:XXXX"
  const match = trimmed.match(/^1:(\d{4,5})$/);
  if (!match) {
    return null;
  }

  const denominator = parseInt(match[1], 10);
  return Number.isFinite(denominator) && denominator > 0 ? denominator : null;
}

export function formatMapScaleLabel(scaleDenominator) {
  if (typeof scaleDenominator !== 'number' || !Number.isFinite(scaleDenominator) || scaleDenominator <= 0) {
    return '';
  }

  return `1:${Math.round(scaleDenominator)}`;
}

function getDeviceScaleCorrectionFactor() {
  if (typeof navigator === 'undefined') {
    return 1.0;
  }

  const ua = navigator.userAgent || navigator.vendor || window.opera;

  // Apple iOS Devices (iPhone, iPad, iPod)
  // iPhones are calibrated very consistently to ~160-163 logical PPI.
  // 160 / 96 ≈ 1.66
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
    return 1.66;
  }

  // Android Devices
  // Highly variable, but generally range from 1.3 to 1.6.
  // 1.45 is a solid average for modern Samsung/Pixel devices.
  if (/android/i.test(ua)) {
    return 1.45;
  }

  // Default (Desktop / Laptop)
  return 1.0;
}

export function calculateZoomLevelForScale(latitude, scaleDenominator) {
  if (typeof latitude !== 'number' || typeof scaleDenominator !== 'number') {
    return null;
  }

  const correctionFactor = getDeviceScaleCorrectionFactor();

  // Constants for Web Mercator and CSS standards
  const TILE_SIZE = 256;
  const EARTH_CIRCUMFERENCE = 40075016.686; // meters at equator
  const METERS_PER_PIXEL_AT_ZOOM_0 = EARTH_CIRCUMFERENCE / TILE_SIZE; // ~156543.03
  const CSS_DPI = 96; // Standard Web DPI
  const METERS_IN_ONE_INCH = 0.0254;

  const latRad = latitude * (Math.PI / 180);

  // Resolution (meters/pixel) needed for the given scale
  // 1 pixel = 1/96 inch (CSS standard)
  // Scale 1:X means 1 unit on screen = X units on ground
  // Screen resolution needed = X * (meters per pixel)
  // We divide by correctionFactor because on mobile we need MORE pixels to represent the same physical inch.
  // Effectively, we are saying the device DPI is (CSS_DPI * correctionFactor).
  const adjustedDpi = CSS_DPI * correctionFactor;
  const metersPerPixelNeeded = (scaleDenominator * METERS_IN_ONE_INCH) / adjustedDpi;

  // Resolution at zoom z = (MetersPerPixelAtZoom0 * cos(lat)) / 2^z
  // Therefore: 2^z = (MetersPerPixelAtZoom0 * cos(lat)) / metersPerPixelNeeded
  const twoToZ = (METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos(latRad)) / metersPerPixelNeeded;

  return Math.log2(twoToZ);
}

