import { COORDINATE_PAIRS } from '../config.js';

const createLatLonPoints = () => Array.from({ length: COORDINATE_PAIRS }, () => ({
  lat: 0,
  lon: 0
}));

const createImagePoints = () => Array.from({ length: COORDINATE_PAIRS }, () => ({
  x: 0,
  y: 0
}));

export class CoordinateStore extends EventTarget {
  constructor() {
    super();
    this.latLon = createLatLonPoints();
    this.xy = createImagePoints();
    this.currentLatLonIndex = 0;
    this.currentXYIndex = 0;
  }

  recordLatLng(lat, lon) {
    this.latLon[this.currentLatLonIndex] = { lat, lon };
    this.currentLatLonIndex = this.getNextIndex(this.currentLatLonIndex, this.latLon.length);
    this.emitChange();
  }

  recordImageCoordinate(x, y) {
    this.xy[this.currentXYIndex] = { x, y };
    this.currentXYIndex = this.getNextIndex(this.currentXYIndex, this.xy.length);
    this.emitChange();
  }

  getLatLonCoordinates() {
    return this.latLon.map(point => ({ ...point }));
  }

  getImageCoordinates() {
    return this.xy.map(point => ({ ...point }));
  }

  getCurrentIndices() {
    return {
      currentLatLonIndex: this.currentLatLonIndex,
      currentXYIndex: this.currentXYIndex
    };
  }

  getSnapshot() {
    return {
      latLon: this.getLatLonCoordinates(),
      xy: this.getImageCoordinates(),
      ...this.getCurrentIndices()
    };
  }

  emitChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: this.getSnapshot() }));
  }

  getNextIndex(currentIndex, length) {
    return (currentIndex + 1) % length;
  }
}

