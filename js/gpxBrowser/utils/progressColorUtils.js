/**
 * Utilities for mapping a track's "progress through session" to colors.
 *
 * Design goals:
 * - Deterministic and easy to validate.
 * - Uses HSV interpolation across a rainbow-like hue ramp.
 * - Purely index/progress based (caller provides progress 0..1).
 */

/**
 * Map a progress value (0..1) to a rainbow hue ramp starting at purple and ending at red.
 *
 * We use HSV with full saturation and value:
 * - start: purple ~ 270°
 * - end: red 0°
 *
 * Linear interpolation of hue from 270 -> 0 goes through:
 * purple -> blue -> cyan/green -> yellow -> orange -> red (a "rainbow" direction).
 */
export function progressToRainbowPurpleToRedHex(progress01, { levels = 180 } = {}) {
  const t = quantize01(progress01, levels);
  const hue = lerp(270, 0, t);
  return hsvToHex(hue, 1, 1);
}

export function quantize01(value, levels) {
  const safeLevels = Number.isFinite(levels) && levels > 1 ? levels : 1;
  const v = clamp01(value);
  return Math.round(v * safeLevels) / safeLevels;
}

export function clamp01(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return 0;
  }
  return Math.max(0, Math.min(1, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

/**
 * Standard HSV -> RGB conversion.
 *
 * - h: degrees (any real number; normalized to [0, 360))
 * - s, v: [0, 1]
 *
 * Returns integer RGB in [0,255].
 */
export function hsvToRgb(h, s, v) {
  const hh = ((Number(h) % 360) + 360) % 360;
  const ss = clamp01(s);
  const vv = clamp01(v);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

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

export function rgbToHex(r, g, b) {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function toHexByte(value) {
  const v = Math.max(0, Math.min(255, Math.round(Number(value))));
  return v.toString(16).padStart(2, '0');
}

