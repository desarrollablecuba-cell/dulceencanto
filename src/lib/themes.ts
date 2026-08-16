/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DESIGN SYSTEM — Entidad Theme
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un Theme agrupa todos los tokens visuales de una tienda:
 *  - Paleta (primario, secundario, acento, success/warning/error/info)
 *  - Tipografía (familia, pesos)
 *  - Radios de borde (botones, tarjetas, inputs)
 *  - Sombras (ninguna, suaves, modernas, elevadas)
 *  - Estilo de botones (cuadrados, redondeados, pill)
 *  - Estilo de tarjetas (compactas, clásicas, premium)
 *  - Colores del footer (fondo, texto, acento)
 *
 * Cada tienda tiene un themeId ('clasico-naranja', 'azul-corporativo', etc.)
 * o 'custom' si está personalizado. Cuando es custom, themeData contiene
 * los tokens editados a mano.
 *
 * Los tokens se inyectan como variables CSS en :root (ver BrandTheme.tsx)
 * y se exponen como utilidades en globals.css (.bg-brand, .radius-button,
 * .shadow-card, etc.). Toda la UI consume estas utilidades en vez de
 * colores/estilos hardcodeados.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────

export type RadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type ShadowStyle = 'none' | 'soft' | 'modern' | 'elevated';
export type ButtonStyle = 'square' | 'rounded' | 'pill';
export type CardStyle = 'compact' | 'classic' | 'premium';

export interface ThemePalette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeTypography {
  /** Familia CSS para headings y body. Ej: 'Inter', 'Poppins'. */
  fontFamily: string;
  /** Peso para headings (400-900). */
  headingWeight: number;
  /** Peso para body text (300-700). */
  bodyWeight: number;
}

export interface ThemeRadius {
  button: RadiusSize;
  card: RadiusSize;
  input: RadiusSize;
}

export interface ThemeFooter {
  bg: string;
  text: string;
  accent: string;
}

export type CardImageRatio = 'square' | 'portrait' | 'landscape' | 'tall';
export type CardImageFit = 'cover' | 'contain' | 'auto';
export type ImageRadiusMode = 'inherit' | 'custom';

export const CARD_IMAGE_RATIO_VALUES: Record<CardImageRatio, string> = {
  square: '1 / 1',
  portrait: '4 / 5',
  landscape: '5 / 4',
  tall: '3 / 4',
};

export const CARD_IMAGE_RATIO_LABELS: Record<CardImageRatio, string> = {
  square: 'Cuadrada (1:1)',
  portrait: 'Retrato (4:5)',
  landscape: 'Paisaje (5:4)',
  tall: 'Retrato alto (3:4)',
};

export const CARD_IMAGE_FIT_LABELS: Record<CardImageFit, string> = {
  cover: 'Cubrir (recorta exceso)',
  contain: 'Contener (muestra todo, con espacio)',
  auto: 'Automático (tamaño natural)',
};

export interface ThemeTokens {
  id: string;
  name: string;
  isCustom: boolean;
  palette: ThemePalette;
  typography: ThemeTypography;
  radius: ThemeRadius;
  shadows: ShadowStyle;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  cardImageRatio: CardImageRatio;
  /** Modo de ajuste de la imagen: cover, contain o auto. */
  cardImageFit: CardImageFit;
  /**
   * 'inherit' = la imagen hereda el border-radius de la tarjeta.
   * 'custom' = usa el imageRadius propio (desacoplado).
   */
  imageRadiusMode: ImageRadiusMode;
  /** Radio propio de la imagen cuando imageRadiusMode === 'custom'. */
  imageRadius: RadiusSize;
  footer: ThemeFooter;
}

// ─── Catálogo de fuentes disponibles ──────────────────────────────────────

export interface FontOption {
  /** Nombre CSS para font-family. */
  family: string;
  /** Etiqueta legible para el select del admin. */
  label: string;
  /** URL de Google Fonts para cargar dinámicamente. */
  googleFontsUrl: string;
  /** Pesos disponibles en Google Fonts. */
  weights: number[];
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    family: 'Inter',
    label: 'Inter (Moderna, neutra)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    weights: [300, 400, 500, 600, 700, 800, 900],
  },
  {
    family: 'Poppins',
    label: 'Poppins (Geométrica, amigable)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: 'Montserrat',
    label: 'Montserrat (Elegante, corporativa)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap',
    weights: [300, 400, 500, 600, 700, 800, 900],
  },
  {
    family: 'Nunito',
    label: 'Nunito (Suave, redondeada)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap',
    weights: [300, 400, 500, 600, 700, 800, 900],
  },
  {
    family: 'Roboto',
    label: 'Roboto (Limpia, técnica)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap',
    weights: [300, 400, 500, 700, 900],
  },
  {
    family: 'Open Sans',
    label: 'Open Sans (Universal, legible)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap',
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: 'Lato',
    label: 'Lato (Sofisticada, sutil)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap',
    weights: [300, 400, 700, 900],
  },
  {
    family: 'Playfair Display',
    label: 'Playfair Display (Serif, luxury)',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap',
    weights: [400, 500, 600, 700, 800, 900],
  },
];

export function getFontOption(family: string): FontOption | undefined {
  return AVAILABLE_FONTS.find((f) => f.family === family);
}

// ─── Mapas de valores CSS por token ───────────────────────────────────────

export const RADIUS_VALUES: Record<RadiusSize, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px',
};

export const RADIUS_LABELS: Record<RadiusSize, string> = {
  none: 'Rectos (0px)',
  sm: 'Suaves (4px)',
  md: 'Medianos (8px)',
  lg: 'Redondeados (16px)',
  full: 'Pill (9999px)',
};

/**
 * Mapa de sombras: cada estilo define 3 niveles (card, hover, modal).
 * Los valores son box-shadow CSS completos.
 */
export const SHADOW_VALUES: Record<ShadowStyle, { card: string; hover: string; modal: string }> = {
  none: {
    card: 'none',
    hover: 'none',
    modal: 'none',
  },
  soft: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    hover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    modal: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  modern: {
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    hover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  elevated: {
    card: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    hover: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
};

export const SHADOW_LABELS: Record<ShadowStyle, string> = {
  none: 'Sin sombras',
  soft: 'Suaves',
  modern: 'Modernas',
  elevated: 'Elevadas',
};

export const BUTTON_STYLE_LABELS: Record<ButtonStyle, string> = {
  square: 'Cuadrados',
  rounded: 'Redondeados',
  pill: 'Pill (cápsula)',
};

export const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  compact: 'Compactas',
  classic: 'Clásicas',
  premium: 'Premium',
};

/**
 * Cada estilo de botón mapea a un radio específico (que puede ser
 * overrideado por el token radius.button, pero el estilo define la
 * "personalidad" por defecto).
 */
export const BUTTON_STYLE_RADIUS: Record<ButtonStyle, RadiusSize> = {
  square: 'none',
  rounded: 'md',
  pill: 'full',
};

export const CARD_STYLE_RADIUS: Record<CardStyle, RadiusSize> = {
  compact: 'sm',
  classic: 'md',
  premium: 'lg',
};

// ─── Temas predefinidos ───────────────────────────────────────────────────

export const PREDEFINED_THEMES: ThemeTokens[] = [
  {
    id: 'diaz-premium',
    name: 'Diaz Premium',
    isCustom: false,
    palette: {
      primary: '#0E3446',
      primaryDark: '#092736',
      primaryLight: '#EAF3F8',
      secondary: '#C89B3C',
      accent: '#D7A548',
      success: '#2E9E63',
      warning: '#D7A548',
      error: '#E05353',
      info: '#4C9FD8',
    },
    typography: { fontFamily: 'Playfair Display', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'sm', card: 'md', input: 'sm' },
    shadows: 'soft',
    buttonStyle: 'square',
    cardStyle: 'classic',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#0E3446', text: '#FFFFFF', accent: '#C89B3C' },
  },
  {
    id: 'clasico-naranja',
    name: 'Clásico Naranja',
    isCustom: false,
    palette: {
      primary: '#f59e0b',
      primaryDark: '#d97706',
      primaryLight: '#fef3c7',
      secondary: '#ea580c',
      accent: '#fb923c',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Inter', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'md', card: 'md', input: 'md' },
    shadows: 'modern',
    buttonStyle: 'rounded',
    cardStyle: 'classic',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#111827', text: '#d1d5db', accent: '#f59e0b' },
  },
  {
    id: 'azul-corporativo',
    name: 'Azul Corporativo',
    isCustom: false,
    palette: {
      primary: '#2563eb',
      primaryDark: '#1d4ed8',
      primaryLight: '#dbeafe',
      secondary: '#0ea5e9',
      accent: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
    },
    typography: { fontFamily: 'Inter', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'md', card: 'md', input: 'md' },
    shadows: 'modern',
    buttonStyle: 'rounded',
    cardStyle: 'classic',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#0f172a', text: '#cbd5e1', accent: '#3b82f6' },
  },
  {
    id: 'verde-premium',
    name: 'Verde Premium',
    isCustom: false,
    palette: {
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#d1fae5',
      secondary: '#14b8a6',
      accent: '#34d399',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Poppins', headingWeight: 600, bodyWeight: 400 },
    radius: { button: 'lg', card: 'lg', input: 'md' },
    shadows: 'soft',
    buttonStyle: 'rounded',
    cardStyle: 'premium',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#064e3b', text: '#a7f3d0', accent: '#10b981' },
  },
  {
    id: 'dorado-elegante',
    name: 'Dorado Elegante',
    isCustom: false,
    palette: {
      primary: '#d4af37',
      primaryDark: '#b8941f',
      primaryLight: '#fef3c7',
      secondary: '#92400e',
      accent: '#fbbf24',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Playfair Display', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'sm', card: 'md', input: 'sm' },
    shadows: 'elevated',
    buttonStyle: 'rounded',
    cardStyle: 'premium',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#1c1917', text: '#d6d3d1', accent: '#d4af37' },
  },
  {
    id: 'negro-luxury',
    name: 'Negro Luxury',
    isCustom: false,
    palette: {
      primary: '#1a1a1a',
      primaryDark: '#000000',
      primaryLight: '#e5e5e5',
      secondary: '#404040',
      accent: '#a3a3a3',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Playfair Display', headingWeight: 800, bodyWeight: 400 },
    radius: { button: 'none', card: 'none', input: 'none' },
    shadows: 'elevated',
    buttonStyle: 'square',
    cardStyle: 'premium',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#000000', text: '#a3a3a3', accent: '#ffffff' },
  },
  {
    id: 'rojo-comercial',
    name: 'Rojo Comercial',
    isCustom: false,
    palette: {
      primary: '#dc2626',
      primaryDark: '#b91c1c',
      primaryLight: '#fee2e2',
      secondary: '#ea580c',
      accent: '#f87171',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Montserrat', headingWeight: 800, bodyWeight: 400 },
    radius: { button: 'md', card: 'md', input: 'md' },
    shadows: 'modern',
    buttonStyle: 'rounded',
    cardStyle: 'classic',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#1f2937', text: '#d1d5db', accent: '#dc2626' },
  },
  {
    id: 'morado-moderno',
    name: 'Morado Moderno',
    isCustom: false,
    palette: {
      primary: '#7c3aed',
      primaryDark: '#6d28d9',
      primaryLight: '#ede9fe',
      secondary: '#9333ea',
      accent: '#a78bfa',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Poppins', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'lg', card: 'lg', input: 'lg' },
    shadows: 'modern',
    buttonStyle: 'pill',
    cardStyle: 'premium',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#1e1b4b', text: '#c7d2fe', accent: '#a78bfa' },
  },
  {
    id: 'cyan-tecnologico',
    name: 'Cyan Tecnológico',
    isCustom: false,
    palette: {
      primary: '#06b6d4',
      primaryDark: '#0891b2',
      primaryLight: '#cffafe',
      secondary: '#0ea5e9',
      accent: '#22d3ee',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Roboto', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'md', card: 'md', input: 'md' },
    shadows: 'modern',
    buttonStyle: 'rounded',
    cardStyle: 'classic',
    cardImageRatio: 'square',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'md',
    footer: { bg: '#082f49', text: '#bae6fd', accent: '#06b6d4' },
  },
  {
    id: 'dulce-encanto',
    name: 'Dulce Encanto',
    isCustom: false,
    palette: {
      primary: '#A855F7',
      primaryDark: '#7E22CE',
      primaryLight: '#F3E8FF',
      secondary: '#EC4899',
      accent: '#EC4899',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    typography: { fontFamily: 'Playfair Display', headingWeight: 700, bodyWeight: 400 },
    radius: { button: 'full', card: 'lg', input: 'md' },
    shadows: 'soft',
    buttonStyle: 'pill',
    cardStyle: 'premium',
    cardImageRatio: 'portrait',
    cardImageFit: 'cover',
    imageRadiusMode: 'inherit',
    imageRadius: 'lg',
    footer: { bg: '#1E112A', text: '#E9D5FF', accent: '#EC4899' },
  },
];

/**
 * Devuelve un tema predefinido por ID (copia profunda para que el caller
 * pueda mutar sin afectar el original).
 */
export function getPredefinedTheme(id: string): ThemeTokens | undefined {
  const theme = PREDEFINED_THEMES.find((t) => t.id === id);
  if (!theme) return undefined;
  return JSON.parse(JSON.stringify(theme)) as ThemeTokens;
}

/**
 * Tema por defecto (Clásico Naranja). Se usa cuando la tienda no tiene
 * un themeId guardado o el ID no existe.
 */
export const DEFAULT_THEME: ThemeTokens = PREDEFINED_THEMES[0];

// ─── Aplicación de tokens al DOM ──────────────────────────────────────────

/**
 * Inyecta todos los tokens del tema como variables CSS en :root.
 *
 * Variables inyectadas:
 *  - --brand-primary, --brand-primary-dark, --brand-primary-light
 *  - --brand-secondary, --brand-accent
 *  - --brand-success, --brand-warning, --brand-error, --brand-info
 *  - --font-heading, --font-body
 *  - --weight-heading, --weight-body
 *  - --radius-button, --radius-card, --radius-input
 *  - --shadow-card, --shadow-hover, --shadow-modal
 *  - --footer-bg, --footer-text, --footer-accent
 */
export function applyTheme(theme: ThemeTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { palette, typography, radius, shadows, footer } = theme;

  // ── Paleta ──
  root.style.setProperty('--brand-primary', palette.primary);
  root.style.setProperty('--brand-primary-dark', palette.primaryDark);
  root.style.setProperty('--brand-primary-light', palette.primaryLight);
  root.style.setProperty('--brand-secondary', palette.secondary);
  root.style.setProperty('--brand-accent', palette.accent);
  root.style.setProperty('--brand-success', palette.success);
  root.style.setProperty('--brand-warning', palette.warning);
  root.style.setProperty('--brand-error', palette.error);
  root.style.setProperty('--brand-info', palette.info);

  // ── Tipografía ──
  // Usamos comillas para familias con espacios (ej: "Playfair Display").
  const fontStack = `"${typography.fontFamily}", system-ui, -apple-system, sans-serif`;
  root.style.setProperty('--font-heading', fontStack);
  root.style.setProperty('--font-body', fontStack);
  root.style.setProperty('--weight-heading', String(typography.headingWeight));
  root.style.setProperty('--weight-body', String(typography.bodyWeight));

  // ── Radios ──
  // El radio del botón depende del token radius.button, pero si el
  // buttonStyle es 'pill', forzamos 'full' (es su personalidad).
  const effectiveButtonRadius =
    theme.buttonStyle === 'pill' ? 'full' : radius.button;
  root.style.setProperty('--radius-button', RADIUS_VALUES[effectiveButtonRadius]);
  // El radio de la tarjeta depende de radius.card, pero cardStyle define
  // la personalidad por defecto.
  const effectiveCardRadius = radius.card === 'md' && theme.cardStyle === 'premium'
    ? 'lg'
    : radius.card;
  root.style.setProperty('--radius-card', RADIUS_VALUES[effectiveCardRadius]);
  root.style.setProperty('--radius-input', RADIUS_VALUES[radius.input]);

  // ── Imágenes de cards ──
  root.style.setProperty('--card-image-ratio', CARD_IMAGE_RATIO_VALUES[theme.cardImageRatio]);
  root.style.setProperty('--card-image-fit', theme.cardImageFit || 'cover');

  // Radio de imagen: si imageRadiusMode === 'inherit', usa el radio de la
  // tarjeta. Si es 'custom', usa el imageRadius propio (desacoplado).
  const imgRadius = theme.imageRadiusMode === 'custom'
    ? RADIUS_VALUES[theme.imageRadius || radius.card]
    : RADIUS_VALUES[radius.card];
  root.style.setProperty('--card-image-radius', imgRadius);

  // ── Sombras ──
  const shadowSet = SHADOW_VALUES[shadows];
  root.style.setProperty('--shadow-card', shadowSet.card);
  root.style.setProperty('--shadow-hover', shadowSet.hover);
  root.style.setProperty('--shadow-modal', shadowSet.modal);

  // ── Footer ──
  root.style.setProperty('--footer-bg', footer.bg);
  root.style.setProperty('--footer-text', footer.text);
  root.style.setProperty('--footer-accent', footer.accent);
}

// ─── Serialización / Validación ───────────────────────────────────────────

/**
 * Serializa un tema a JSON string para persistencia o exportación.
 */
export function serializeTheme(theme: ThemeTokens): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Parsea y valida un JSON de tema (para importación).
 * Lanza error si el JSON es inválido o falta campos críticos.
 */
export function parseTheme(json: string): ThemeTokens {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('JSON inválido. Verifica el formato del archivo.');
  }
  return validateTheme(parsed);
}

/**
 * Valida que un objeto tenga la estructura de ThemeTokens.
 * Es estricto en los campos críticos (palette, typography) y
 * permisivo en campos opcionales (usa defaults si faltan).
 */
export function validateTheme(obj: unknown): ThemeTokens {
  if (!obj || typeof obj !== 'object') {
    throw new Error('El tema debe ser un objeto.');
  }
  const t = obj as Record<string, unknown>;

  // Validar palette
  const palette = t.palette as Record<string, unknown> | undefined;
  if (!palette) throw new Error('Falta "palette" en el tema.');
  const requiredColors = ['primary', 'primaryDark', 'primaryLight'];
  for (const c of requiredColors) {
    if (typeof palette[c] !== 'string') {
      throw new Error(`Falta o es inválido "palette.${c}".`);
    }
  }
  // Completar colores opcionales con defaults sensatos
  const fullPalette: ThemePalette = {
    primary: String(palette.primary),
    primaryDark: String(palette.primaryDark),
    primaryLight: String(palette.primaryLight),
    secondary: typeof palette.secondary === 'string' ? palette.secondary : '#6b7280',
    accent: typeof palette.accent === 'string' ? palette.accent : String(palette.primary),
    success: typeof palette.success === 'string' ? palette.success : '#10b981',
    warning: typeof palette.warning === 'string' ? palette.warning : '#f59e0b',
    error: typeof palette.error === 'string' ? palette.error : '#ef4444',
    info: typeof palette.info === 'string' ? palette.info : '#3b82f6',
  };

  // Validar typography
  const typography = t.typography as Record<string, unknown> | undefined;
  if (!typography || typeof typography.fontFamily !== 'string') {
    throw new Error('Falta o es inválido "typography.fontFamily".');
  }
  const fullTypography: ThemeTypography = {
    fontFamily: String(typography.fontFamily),
    headingWeight: typeof typography.headingWeight === 'number' ? typography.headingWeight : 700,
    bodyWeight: typeof typography.bodyWeight === 'number' ? typography.bodyWeight : 400,
  };

  // Validar radius (con defaults)
  const radius = (t.radius as Record<string, unknown> | undefined) ?? {};
  const validRadius = (v: unknown, def: RadiusSize): RadiusSize => {
    if (typeof v === 'string' && ['none', 'sm', 'md', 'lg', 'full'].includes(v)) {
      return v as RadiusSize;
    }
    return def;
  };
  const fullRadius: ThemeRadius = {
    button: validRadius(radius.button, 'md'),
    card: validRadius(radius.card, 'md'),
    input: validRadius(radius.input, 'md'),
  };

  // Validar shadows
  const shadows = typeof t.shadows === 'string' && ['none', 'soft', 'modern', 'elevated'].includes(t.shadows)
    ? (t.shadows as ShadowStyle)
    : 'modern';

  // Validar buttonStyle
  const buttonStyle = typeof t.buttonStyle === 'string' && ['square', 'rounded', 'pill'].includes(t.buttonStyle)
    ? (t.buttonStyle as ButtonStyle)
    : 'rounded';

  // Validar cardStyle
  const cardStyle = typeof t.cardStyle === 'string' && ['compact', 'classic', 'premium'].includes(t.cardStyle)
    ? (t.cardStyle as CardStyle)
    : 'classic';

  // Validar cardImageRatio
  const cardImageRatio = typeof t.cardImageRatio === 'string' && ['square', 'portrait', 'landscape', 'tall'].includes(t.cardImageRatio)
    ? (t.cardImageRatio as CardImageRatio)
    : 'square';

  // Validar cardImageFit
  const cardImageFit = typeof t.cardImageFit === 'string' && ['cover', 'contain', 'auto'].includes(t.cardImageFit)
    ? (t.cardImageFit as CardImageFit)
    : 'cover';

  // Validar imageRadiusMode e imageRadius
  const imageRadiusMode = t.imageRadiusMode === 'custom' ? 'custom' : 'inherit';
  const imageRadius = typeof t.imageRadius === 'string' && ['none', 'sm', 'md', 'lg', 'full'].includes(t.imageRadius)
    ? (t.imageRadius as RadiusSize)
    : fullRadius.card;

  // Validar footer
  const footer = (t.footer as Record<string, unknown> | undefined) ?? {};
  const fullFooter: ThemeFooter = {
    bg: typeof footer.bg === 'string' ? footer.bg : '#111827',
    text: typeof footer.text === 'string' ? footer.text : '#d1d5db',
    accent: typeof footer.accent === 'string' ? footer.accent : fullPalette.primary,
  };

  return {
    id: typeof t.id === 'string' ? t.id : 'custom',
    name: typeof t.name === 'string' ? t.name : 'Personalizado',
    isCustom: true, // Siempre es custom después de importar/validar
    palette: fullPalette,
    typography: fullTypography,
    radius: fullRadius,
    shadows,
    buttonStyle,
    cardStyle,
    cardImageRatio,
    cardImageFit,
    imageRadiusMode,
    imageRadius,
    footer: fullFooter,
  };
}

/**
 * Crea un tema "custom" a partir de uno predefinido, marcándolo como
 * personalizado para que el admin sepa que fue editado.
 */
export function cloneAsCustom(theme: ThemeTokens, newName?: string): ThemeTokens {
  return {
    ...JSON.parse(JSON.stringify(theme)),
    id: 'custom',
    name: newName || `${theme.name} (Personalizado)`,
    isCustom: true,
  };
}
