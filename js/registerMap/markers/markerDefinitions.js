import { NUM_COORDINATE_PAIRS_FOR_REGISTRATION } from '../config.js';

const BASE_MARKER_DEFINITIONS = [
  { key: 'red', label: 'Red marker', color: '#d63d3d' },
  { key: 'yellow', label: 'Yellow marker', color: '#f6c343' },
  { key: 'blue', label: 'Blue marker', color: '#1f78d1' },
  { key: 'green', label: 'Green marker', color: '#2e7d32' },
  { key: 'purple', label: 'Purple marker', color: '#8e24aa' },
  { key: 'orange', label: 'Orange marker', color: '#f57c00' }
];

const ensureMarkerPalette = (count) => {
  if (count <= BASE_MARKER_DEFINITIONS.length) {
    return BASE_MARKER_DEFINITIONS.slice(0, count);
  }

  const extraDefinitions = [];
  for (let i = BASE_MARKER_DEFINITIONS.length; i < count; i += 1) {
    const hue = (i * 55) % 360;
    const color = hslToHex(hue, 70, 48);
    extraDefinitions.push({
      key: `marker-${i + 1}`,
      label: `Marker ${i + 1}`,
      color
    });
  }

  return [
    ...BASE_MARKER_DEFINITIONS,
    ...extraDefinitions
  ];
};

const hslToHex = (h, s, l) => {
  const convert = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const saturation = s / 100;
  const lightness = l / 100;

  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const r = Math.round(convert(p, q, (h / 360) + 1 / 3) * 255);
  const g = Math.round(convert(p, q, (h / 360)) * 255);
  const b = Math.round(convert(p, q, (h / 360) - 1 / 3) * 255);

  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

const rawDefinitions = ensureMarkerPalette(NUM_COORDINATE_PAIRS_FOR_REGISTRATION);

export const MARKER_DEFINITIONS = rawDefinitions.map((definition, index) => ({
  ...definition,
  order: index,
  shortLabel: definition.shortLabel ?? `${index + 1}`
}));

export const MARKER_COUNT = MARKER_DEFINITIONS.length;

export const getMarkerDefinition = (index) => (
  MARKER_DEFINITIONS[index] ?? null
);

export const getMarkerColor = (index) => getMarkerDefinition(index)?.color ?? '#1f78d1';

export const getMarkerLabel = (index) => getMarkerDefinition(index)?.shortLabel ?? '';

const MARKER_VIEWBOX = '0 0 36 54';
const MARKER_PATH_D = 'M18 1C8.611 1 1 8.611 1 18c0 12.809 15.138 33.32 16.357 34.94a1.3 1.3 0 0 0 2.286 0C20.862 51.32 36 30.809 36 18 36 8.611 29.389 1 18 1Z';

export const buildMarkerSvgMarkup = (index) => {
  const color = getMarkerColor(index);
  const label = getMarkerLabel(index);

  return `
  <svg class="registration-marker__svg"
       viewBox="${MARKER_VIEWBOX}"
       width="36"
       height="52"
       role="presentation"
       aria-hidden="true">

    <path d="${MARKER_PATH_D}"
          fill="${color}"
          stroke="#ffffff"
          stroke-width="3"
          stroke-linejoin="round">
    </path>

    <!-- Sharp tip glyph to emphasize the pixel target of the marker-->
    <circle cx="18"
            cy="54"
            r="1.5"
            fill="#ff1493">
    </circle>

    <text class="registration-marker__svg-label"
          x="18"
          y="21"
          text-anchor="middle"
          dominant-baseline="middle">${label}
    </text>
  </svg>
`};