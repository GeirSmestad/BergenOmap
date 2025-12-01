const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

const isLocal =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '';

export const backendBaseUrl = isLocal ? 'http://127.0.0.1:5000' : '';

export const errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';

export const MAP_LIST_SOURCE = {
  NEAR_ME: 'nearMe',
  NEAR_VIEWPORT: 'nearViewport'
};

export const ONLY_FOLLOW_WHEN_ACCURACY_IS_BETTER_THAN = 100;

export const defaultMapCenter = [60.4002, 5.3411]; // Bergen
export const defaultMapZoom = 15;

export const tileLayerConfig = {
  url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
  options: {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>'
  }
};

