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

