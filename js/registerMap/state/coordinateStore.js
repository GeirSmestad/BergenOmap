import { NUM_COORDINATE_PAIRS_FOR_REGISTRATION } from '../config.js';

const createLatLonPoints = () => Array.from({ length: NUM_COORDINATE_PAIRS_FOR_REGISTRATION }, () => ({
  lat: 0,
  lon: 0
}));

const createImagePoints = () => Array.from({ length: NUM_COORDINATE_PAIRS_FOR_REGISTRATION }, () => ({
  x: 0,
  y: 0
}));

const createOccupancyArray = (length) => Array.from({ length }, () => false);

const clampIndex = (index, length) => (length === 0 ? null : Math.max(0, Math.min(index, length - 1)));

export class CoordinateStore extends EventTarget {
  constructor() {
    super();
    this.latLon = createLatLonPoints();
    this.xy = createImagePoints();

    this.latLonOccupied = createOccupancyArray(this.latLon.length);
    this.xyOccupied = createOccupancyArray(this.xy.length);

    this.currentLatLonIndex = this.latLon.length ? 0 : null;
    this.currentXYIndex = this.xy.length ? 0 : null;
  }

  /**
   * Legacy helper retained for compatibility. Still follows round-robin rules.
   */
  recordLatLng(lat, lon) {
    if (this.currentLatLonIndex == null) {
      return;
    }
    this.setLatLonAt(this.currentLatLonIndex, lat, lon);
  }

  /**
   * Legacy helper retained for compatibility. Still follows round-robin rules.
   */
  recordImageCoordinate(x, y) {
    if (this.currentXYIndex == null) {
      return;
    }
    this.setImageCoordinateAt(this.currentXYIndex, x, y);
  }

  setLatLonAt(index, lat, lon, options = {}) {
    const resolvedIndex = clampIndex(index, this.latLon.length);
    if (resolvedIndex == null) {
      return;
    }

    const shouldAdvance = this.shouldAdvanceToNext(options);
    this.latLon[resolvedIndex] = { lat, lon };
    this.latLonOccupied[resolvedIndex] = true;

    if (shouldAdvance) {
      this.currentLatLonIndex = this.findNextAvailableIndex(resolvedIndex, this.latLonOccupied);
    }

    this.emitChange();
  }

  setImageCoordinateAt(index, x, y, options = {}) {
    const resolvedIndex = clampIndex(index, this.xy.length);
    if (resolvedIndex == null) {
      return;
    }

    const shouldAdvance = this.shouldAdvanceToNext(options);
    this.xy[resolvedIndex] = { x, y };
    this.xyOccupied[resolvedIndex] = true;

    if (shouldAdvance) {
      this.currentXYIndex = this.findNextAvailableIndex(resolvedIndex, this.xyOccupied);
    }

    this.emitChange();
  }

  clearLatLonAt(index) {
    const resolvedIndex = clampIndex(index, this.latLon.length);
    if (resolvedIndex == null) {
      return;
    }

    this.latLon[resolvedIndex] = { lat: 0, lon: 0 };
    this.latLonOccupied[resolvedIndex] = false;
    this.currentLatLonIndex = resolvedIndex;
    this.emitChange();
  }

  clearImageCoordinateAt(index) {
    const resolvedIndex = clampIndex(index, this.xy.length);
    if (resolvedIndex == null) {
      return;
    }

    this.xy[resolvedIndex] = { x: 0, y: 0 };
    this.xyOccupied[resolvedIndex] = false;
    this.currentXYIndex = resolvedIndex;
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

  getLatLonOccupancy() {
    return [...this.latLonOccupied];
  }

  getImageOccupancy() {
    return [...this.xyOccupied];
  }

  getSnapshot() {
    return {
      latLon: this.getLatLonCoordinates(),
      xy: this.getImageCoordinates(),
      ...this.getCurrentIndices(),
      latLonOccupancy: this.getLatLonOccupancy(),
      xyOccupancy: this.getImageOccupancy()
    };
  }

  emitChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: this.getSnapshot() }));
  }

  findNextAvailableIndex(startIndex, occupancyArray) {
    if (!occupancyArray.length) {
      return null;
    }

    const length = occupancyArray.length;
    const startingPoint = (startIndex + 1) % length;

    for (let offset = 0; offset < length; offset += 1) {
      const candidate = (startingPoint + offset) % length;
      if (!occupancyArray[candidate]) {
        return candidate;
      }
    }

    return null;
  }

  hasAvailableLatLonSlot() {
    return this.latLonOccupied.some((isSet) => !isSet);
  }

  hasAvailableImageSlot() {
    return this.xyOccupied.some((isSet) => !isSet);
  }

  isLatLonSet(index) {
    const resolvedIndex = clampIndex(index, this.latLon.length);
    return resolvedIndex == null ? false : this.latLonOccupied[resolvedIndex];
  }

  isImageCoordinateSet(index) {
    const resolvedIndex = clampIndex(index, this.xy.length);
    return resolvedIndex == null ? false : this.xyOccupied[resolvedIndex];
  }

  shouldAdvanceToNext(options = {}) {
    if (options.skipAdvance === true) {
      return false;
    }
    if (typeof options.advanceToNext === 'boolean') {
      return options.advanceToNext;
    }
    return true;
  }
}

