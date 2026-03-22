/**
 * Minimal color conversion pipeline: OKLCH → OKLab → Linear sRGB → sRGB → HSL
 * Handles the color format used in theme.json ("oklch(L% C H)")
 */

// ── OKLCH → OKLab ────────────────────────────────────────────────────────────

function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

// ── OKLab → Linear sRGB ──────────────────────────────────────────────────────
// Coefficients from https://bottosson.github.io/posts/oklab/

function oklabToLinearSRGB(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

// ── Linear sRGB → sRGB (gamma) ───────────────────────────────────────────────

function linearToSRGB(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

// ── sRGB → HSL ───────────────────────────────────────────────────────────────

function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:  h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g:  h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6; break;
  }

  return [
    Math.round(h * 3600) / 10,   // 1 decimal place
    Math.round(s * 1000) / 10,
    Math.round(l * 1000) / 10,
  ];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse an "oklch(L% C H)" string and return [L, C, H] where L is 0–1.
 * Handles both "70%" and "0.70" for lightness.
 */
export function parseOklch(value: string): [number, number, number] {
  const match = value.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)/i,
  );
  if (!match) throw new Error(`Cannot parse OKLCH value: "${value}"`);
  const [, rawL, pct, c, h] = match;
  const L = pct === '%' ? parseFloat(rawL) / 100 : parseFloat(rawL);
  return [L, parseFloat(c), parseFloat(h)];
}

/** Convert an OKLCH value string to an "H S% L%" string for shadcn CSS vars. */
export function oklchToHSLString(oklchValue: string): string {
  const [l, c, h] = parseOklch(oklchValue);
  const [la, a, b] = oklchToOklab(l, c, h);
  const [lr, lg, lb] = oklabToLinearSRGB(la, a, b);
  const r = linearToSRGB(lr);
  const g = linearToSRGB(lg);
  const bv = linearToSRGB(lb);
  const [hDeg, sPercent, lPercent] = rgbToHSL(r, g, bv);
  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/** Return a lightness-adjusted variant of an OKLCH color as "H S% L%". */
export function oklchShiftedHSL(oklchValue: string, lShift: number): string {
  const [l, c, h] = parseOklch(oklchValue);
  const [la, a, b] = oklchToOklab(Math.max(0, Math.min(1, l + lShift)), c, h);
  const [lr, lg, lb] = oklabToLinearSRGB(la, a, b);
  const r = linearToSRGB(lr);
  const g = linearToSRGB(lg);
  const bv = linearToSRGB(lb);
  const [hDeg, sPercent, lPercent] = rgbToHSL(r, g, bv);
  return `${hDeg} ${sPercent}% ${lPercent}%`;
}
