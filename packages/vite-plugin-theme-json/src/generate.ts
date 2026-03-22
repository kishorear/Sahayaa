import { oklchToHSLString, oklchShiftedHSL } from './color.js';

export interface ThemeJson {
  primary: string;      // CSS color value, e.g. "oklch(70% 0.1 260)"
  appearance: 'light' | 'dark' | 'system';
  radius: number;       // base radius multiplier (1 = 0.5rem per step)
  variant?: string;     // optional label, not used for generation
}

/**
 * Generate a full block of shadcn/ui CSS custom properties from a theme.json.
 * Returns a <style> tag string ready to inject into <head>.
 */
export function generateThemeCSS(theme: ThemeJson): string {
  const primary = theme.primary;
  const radiusBase = theme.radius * 0.5; // radius:1 → 0.5rem

  // Derive foreground: very light or very dark depending on appearance
  const isDark = theme.appearance === 'dark';

  // Primary foreground is near-white for dark-on-primary, near-black for light
  const primaryHSL = oklchToHSLString(primary);

  // Shift primary to get secondary/accent colours
  const secondary = oklchShiftedHSL(primary, isDark ? -0.15 : +0.15);
  const accent     = oklchShiftedHSL(primary, isDark ? +0.10 : -0.10);
  const ring       = primaryHSL;

  const light = `
  :root {
    --background:             0 0% 100%;
    --foreground:             222.2 84% 4.9%;

    --card:                   0 0% 100%;
    --card-foreground:        222.2 84% 4.9%;

    --popover:                0 0% 100%;
    --popover-foreground:     222.2 84% 4.9%;

    --primary:                ${primaryHSL};
    --primary-foreground:     210 40% 98%;

    --secondary:              ${secondary};
    --secondary-foreground:   222.2 47.4% 11.2%;

    --muted:                  210 40% 96.1%;
    --muted-foreground:       215.4 16.3% 46.9%;

    --accent:                 ${accent};
    --accent-foreground:      222.2 47.4% 11.2%;

    --destructive:            0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border:                 214.3 31.8% 91.4%;
    --input:                  214.3 31.8% 91.4%;
    --ring:                   ${ring};

    --radius:                 ${radiusBase}rem;
  }`;

  const dark = `
  .dark {
    --background:             222.2 84% 4.9%;
    --foreground:             210 40% 98%;

    --card:                   222.2 84% 4.9%;
    --card-foreground:        210 40% 98%;

    --popover:                222.2 84% 4.9%;
    --popover-foreground:     210 40% 98%;

    --primary:                ${primaryHSL};
    --primary-foreground:     222.2 47.4% 11.2%;

    --secondary:              ${secondary};
    --secondary-foreground:   210 40% 98%;

    --muted:                  217.2 32.6% 17.5%;
    --muted-foreground:       215 20.2% 65.1%;

    --accent:                 ${accent};
    --accent-foreground:      210 40% 98%;

    --destructive:            0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border:                 217.2 32.6% 17.5%;
    --input:                  217.2 32.6% 17.5%;
    --ring:                   ${ring};
  }`;

  const body = `
  *, *::before, *::after { box-sizing: border-box; }

  body {
    background-color: hsl(var(--background));
    color:            hsl(var(--foreground));
  }`;

  if (theme.appearance === 'light') {
    return `<style data-sahayaa-theme>\n${light}\n${body}\n</style>`;
  }
  if (theme.appearance === 'dark') {
    return `<style data-sahayaa-theme>\n${dark}\n${body}\n</style>`;
  }
  // system → inject both, toggle via class
  return `<style data-sahayaa-theme>\n${light}\n${dark}\n${body}\n</style>`;
}
