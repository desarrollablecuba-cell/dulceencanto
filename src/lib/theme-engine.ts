/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME ENGINE — Motor de Plantillas del SaaS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Filosofía: como Shopify. El usuario:
 *  1. Elige una plantilla completa (Comida, Moda, Farmacia…).
 *  2. Elige una paleta de colores.
 *  3. Crea la tienda.
 *
 * Cada plantilla define TODO: estructura, tipografía, densidad, tarjetas,
 * botones, imágenes, hero, navegación, footer. La paleta solo cambia colores.
 *
 * El usuario básico NUNCA ve: border-radius, aspect-ratio, object-fit,
 * shadows, spacing, tokens. Esas decisiones están preconfiguradas en la
 * plantilla y solo se exponen en el Modo Diseñador.
 */

import { type ThemeTokens, type ThemePalette, type ThemeTypography, type ThemeRadius, type RadiusSize, type ShadowStyle, type ButtonStyle, type CardStyle, type CardImageRatio, type CardImageFit } from './themes-old';

export type {
  ThemeTokens, ThemePalette, ThemeTypography, ThemeRadius, RadiusSize,
  ShadowStyle, ButtonStyle, CardStyle, CardImageRatio, CardImageFit,
};

// ─── PLANTILLAS COMPLETAS ──────────────────────────────────────────────────

export type TemplateId =
  | 'delivery'
  | 'custom';

export interface StoreTemplate {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
  /** Paleta por defecto (el usuario puede cambiarla después). */
  defaultPalette: string;
  /** Industria (para futura categorización). */
  industry?: string;
  /** Tema completo preconfigurado (sin colores, se rellenan al aplicar). */
  theme: Omit<ThemeTokens, 'palette' | 'footer' | 'id' | 'name' | 'isCustom'>;
  /** Configuración del footer derivada del color principal. */
  footerMode: 'dark' | 'primary' | 'light';
}

export const STORE_TEMPLATES: StoreTemplate[] = [
  {
    id: 'delivery',
    name: 'Delivery',
    description: 'Plantilla optimizada para tiendas de delivery, supermercados y envíos.',
    icon: '🛒',
    defaultPalette: '#f59e0b',
    industry: 'delivery',
    theme: {
      shadows: 'soft',
      cardStyle: 'default',
      buttonStyle: 'rounded',
      radius: { button: 'md', card: 'md', input: 'sm' },
      spacing: 'comfortable',
      headerStyle: 'centered',
      catalogStyle: 'grid',
      productCardSize: 'medium',
      footerAccentFromPrimary: true,
      imageRadius: 'md',
      imageFit: 'cover',
    },
    footerMode: 'dark',
  },
  {
    id: 'custom',
    name: 'Personalizado',
    description: 'Configura cada aspecto del diseño manualmente.',
    icon: '🎨',
    defaultPalette: '#f59e0b',
    industry: 'custom',
    theme: {
      shadows: 'soft',
      cardStyle: 'default',
      buttonStyle: 'rounded',
      radius: { button: 'md', card: 'md', input: 'sm' },
      spacing: 'comfortable',
      headerStyle: 'centered',
      catalogStyle: 'grid',
      productCardSize: 'medium',
      footerAccentFromPrimary: true,
      imageRadius: 'md',
      imageFit: 'cover',
    },
    footerMode: 'dark',
  },
];

// ─── PALETAS DE COLORES ────────────────────────────────────────────────────

export interface ColorPalette {
  name: string;
  hex: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  { name: 'Azul', hex: '#2563eb' },
  { name: 'Azul Oscuro', hex: '#0E3446' },
  { name: 'Verde', hex: '#10b981' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Dorado', hex: '#d4af37' },
  { name: 'Morado', hex: '#7c3aed' },
  { name: 'Naranja', hex: '#ea580c' },
  { name: 'Negro', hex: '#1a1a1a' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Índigo', hex: '#4f46e5' },
];

// ─── MOTOR: GENERAR TEMA DESDE PLANTILLA + COLOR ───────────────────────────

function adjustColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  const adj = (c: number) =>
    amount >= 0 ? Math.round(c + (255 - c) * (amount / 100)) : Math.round(c * (1 + amount / 100));
  const toHex = (c: number) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

export function generatePalette(primary: string): ThemePalette {
  return {
    primary,
    primaryDark: adjustColor(primary, -25),
    primaryLight: adjustColor(primary, 85),
    secondary: adjustColor(primary, -15),
    accent: adjustColor(primary, 20),
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  };
}

function generateFooter(primary: string, mode: 'dark' | 'primary' | 'light') {
  if (mode === 'dark') {
    return { bg: '#111827', text: '#d1d5db', accent: primary };
  }
  if (mode === 'primary') {
    return { bg: adjustColor(primary, -80), text: '#ffffff', accent: adjustColor(primary, 40) };
  }
  return { bg: '#f9fafb', text: '#374151', accent: primary };
}

/**
 * El MOTOR principal: aplica una plantilla + color y genera el tema completo.
 *
 * El usuario elige "Moda" + "Morado" y obtiene:
 *  - Tipografía Playfair Display
 *  - Botones pill, tarjetas premium con bordes redondos
 *  - Imágenes portrait con cover
 *  - Sombras elevadas
 *  - Footer oscuro con acento morado
 *  - Paleta completa derivada del morado
 */
export function applyTemplate(templateId: TemplateId, primaryColor: string): ThemeTokens {
  const template = STORE_TEMPLATES.find((t) => t.id === templateId);
  const palette = generatePalette(primaryColor);
  const footer = generateFooter(primaryColor, template?.footerMode ?? 'dark');

  return {
    id: 'custom',
    name: `${template?.name ?? 'Custom'}`,
    isCustom: true,
    palette,
    ...(template?.theme ?? {}),
    footer,
  };
}

export function getTemplate(id: TemplateId): StoreTemplate | undefined {
  return STORE_TEMPLATES.find((t) => t.id === id);
}

// ─── EXPORTS LEGACY (para compatibilidad con código existente) ─────────────

export const INDUSTRY_THEMES = STORE_TEMPLATES.map(t => ({
  id: t.id,
  name: t.name,
  icon: t.icon,
  description: t.description,
  defaultColor: t.defaultPalette || '#f59e0b',
  defaultPersonality: 'moderna' as const,
  defaultDensity: 'balanceado' as const,
  defaultCardStyle: 'clasica' as const,
  defaultButtonStyle: 'filled' as const,
  defaultFont: (t.theme as any)?.typography?.fontFamily || 'Inter, sans-serif',
}));

export const PERSONALITIES = [
  { id: 'minimalista' as const, name: 'Minimalista', icon: '⚪', description: 'Limpio, sin distracciones.', shadows: 'none' as const, cardStyle: 'compact' as const, buttonStyle: 'square' as const, radius: { button: 'none' as const, card: 'none' as const, input: 'none' as const }, footerAccentFromPrimary: false },
  { id: 'elegante' as const, name: 'Elegante', icon: '🎩', description: 'Sofisticado, sombras suaves.', shadows: 'soft' as const, cardStyle: 'premium' as const, buttonStyle: 'rounded' as const, radius: { button: 'md' as const, card: 'md' as const, input: 'sm' as const }, footerAccentFromPrimary: true },
  { id: 'premium' as const, name: 'Premium', icon: '💎', description: 'Lujo, sombras elevadas.', shadows: 'elevated' as const, cardStyle: 'premium' as const, buttonStyle: 'pill' as const, radius: { button: 'full' as const, card: 'lg' as const, input: 'md' as const }, footerAccentFromPrimary: true },
  { id: 'corporativa' as const, name: 'Corporativa', icon: '🏢', description: 'Profesional, estructurado.', shadows: 'modern' as const, cardStyle: 'classic' as const, buttonStyle: 'square' as const, radius: { button: 'sm' as const, card: 'sm' as const, input: 'sm' as const }, footerAccentFromPrimary: false },
  { id: 'moderna' as const, name: 'Moderna', icon: '✨', description: 'Contemporáneo, bordes suaves.', shadows: 'modern' as const, cardStyle: 'classic' as const, buttonStyle: 'rounded' as const, radius: { button: 'md' as const, card: 'md' as const, input: 'md' as const }, footerAccentFromPrimary: true },
  { id: 'luxury' as const, name: 'Luxury', icon: '👑', description: 'Alta gama, máximo impacto.', shadows: 'elevated' as const, cardStyle: 'premium' as const, buttonStyle: 'rounded' as const, radius: { button: 'sm' as const, card: 'lg' as const, input: 'sm' as const }, footerAccentFromPrimary: true },
];

export const DENSITY_PRESETS = [
  { id: 'compacto' as const, name: 'Compacto', icon: '📦', description: 'Más productos por pantalla.', cardImageRatio: 'square' as const, cardImageFit: 'cover' as const },
  { id: 'balanceado' as const, name: 'Balanceado', icon: '⚖️', description: 'Uso general.', cardImageRatio: 'square' as const, cardImageFit: 'cover' as const },
  { id: 'premium' as const, name: 'Premium', icon: '✨', description: 'Productos grandes.', cardImageRatio: 'portrait' as const, cardImageFit: 'cover' as const },
  { id: 'visual' as const, name: 'Visual', icon: '🖼️', description: 'Tipo boutique.', cardImageRatio: 'tall' as const, cardImageFit: 'cover' as const },
];

export const CARD_STYLES = [
  { id: 'minimal' as const, name: 'Minimal', icon: '▫️', description: 'Sin bordes ni sombras.', cardStyle: 'compact' as const, imageRadiusMode: 'inherit' as const, imageRadius: 'none' as const },
  { id: 'clasica' as const, name: 'Clásicas', icon: '📋', description: 'Bordes definidos.', cardStyle: 'classic' as const, imageRadiusMode: 'inherit' as const, imageRadius: 'sm' as const },
  { id: 'moderna' as const, name: 'Modernas', icon: '🔲', description: 'Bordes redondeados.', cardStyle: 'classic' as const, imageRadiusMode: 'custom' as const, imageRadius: 'md' as const },
  { id: 'premium' as const, name: 'Premium', icon: '💎', description: 'Bordes pronunciados.', cardStyle: 'premium' as const, imageRadiusMode: 'custom' as const, imageRadius: 'lg' as const },
  { id: 'luxury' as const, name: 'Luxury', icon: '👑', description: 'Máximo impacto.', cardStyle: 'premium' as const, imageRadiusMode: 'custom' as const, imageRadius: 'full' as const },
];

export const BUTTON_STYLES = [
  { id: 'minimal' as const, name: 'Minimal', icon: '⬜', description: 'Solo texto.', buttonStyle: 'square' as const, radius: 'none' as const },
  { id: 'outline' as const, name: 'Outline', icon: '▢', description: 'Borde visible.', buttonStyle: 'square' as const, radius: 'sm' as const },
  { id: 'filled' as const, name: 'Filled', icon: '⬛', description: 'Fondo sólido.', buttonStyle: 'rounded' as const, radius: 'sm' as const },
  { id: 'rounded' as const, name: 'Rounded', icon: '🔘', description: 'Bordes redondeados.', buttonStyle: 'rounded' as const, radius: 'md' as const },
  { id: 'pill' as const, name: 'Pill', icon: '💊', description: 'Cápsula.', buttonStyle: 'pill' as const, radius: 'full' as const },
];

export const PRIMARY_COLORS = COLOR_PALETTES;

// Legacy compat
export type IndustryThemeId = TemplateId;
export type PersonalityId = string;
export type DensityId = string;
export type CardStyleId = string;
export type ButtonStyleId = string;
export interface SimpleThemeChoices {
  industry: TemplateId;
  primaryColor: string;
}
export function getDefaultChoices(industry: TemplateId): SimpleThemeChoices {
  const t = getTemplate(industry)!;
  return { industry, primaryColor: t.defaultPalette };
}
export function generateTheme(choices: SimpleThemeChoices): ThemeTokens {
  return applyTemplate(choices.industry, choices.primaryColor);
}
