'use client';

import { useEffect, useState } from 'react';
import {
  applyTheme,
  DEFAULT_THEME,
  getPredefinedTheme,
  parseTheme,
  getFontOption,
  type ThemeTokens,
} from '@/lib/themes';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BRAND THEME PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Carga el Theme de la tienda desde /api/siteconfig y aplica todos los
 * tokens (paleta, tipografía, radios, sombras, estilos de botón/tarjeta,
 * footer) como variables CSS en :root.
 *
 * También carga dinámicamente la fuente de Google Fonts correspondiente
 * al tema, para que no sea necesario pre-cargar todas las fuentes en el
 * layout.
 *
 * El componente es invisible (no renderiza nada). Se pone una vez en
 * layout.tsx. Cuando el admin cambia el tema en /admin, se persiste en
 * la API; al recargar la página, este provider aplica el nuevo tema.
 */

interface SiteConfigTheme {
  themeId?: string;
  themeData?: string;
  // Campos legacy (por si themeId/themeData no existen aún)
  primaryColor?: string;
  primaryColorDark?: string;
  primaryColorLight?: string;
  footerBgColor?: string;
  footerTextColor?: string;
  footerAccentColor?: string;
}

/**
 * Parsea la config del sitio y devuelve un ThemeTokens completo.
 * Prioridad:
 *  1. Si themeData existe y parsea OK → usarlo (tema custom).
 *  2. Si themeId existe y es un predefinido → usarlo.
 *  3. Si no, construir un tema custom desde los campos legacy
 *     (primaryColor, etc.) para retrocompatibilidad.
 */
export function resolveTheme(config: SiteConfigTheme): ThemeTokens {
  // 1. Intentar themeData (tema custom persistido)
  if (config.themeData && typeof config.themeData === 'string' && config.themeData.trim()) {
    try {
      return parseTheme(config.themeData);
    } catch (e) {
      console.warn('themeData inválido, fallback a themeId:', e);
    }
  }

  // 2. Intentar themeId predefinido
  if (config.themeId && config.themeId !== 'custom') {
    const predefined = getPredefinedTheme(config.themeId);
    if (predefined) return predefined;
  }

  // 3. Fallback: construir custom desde campos legacy
  if (config.primaryColor) {
    return {
      id: 'custom',
      name: 'Personalizado',
      isCustom: true,
      palette: {
        primary: config.primaryColor,
        primaryDark: config.primaryColorDark || config.primaryColor,
        primaryLight: config.primaryColorLight || config.primaryColor,
        secondary: config.primaryColor,
        accent: config.primaryColor,
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
      footer: {
        bg: config.footerBgColor || '#111827',
        text: config.footerTextColor || '#d1d5db',
        accent: config.footerAccentColor || config.primaryColor,
      },
    };
  }

  // 4. Default
  return DEFAULT_THEME;
}

/**
 * Carga un <link> de Google Fonts para la familia indicada, si no existe ya.
 * Idempotente: si la fuente ya está cargada, no hace nada.
 */
export function loadGoogleFont(family: string): void {
  if (typeof document === 'undefined') return;
  const fontOption = getFontOption(family);
  if (!fontOption) return;

  const linkId = `font-google-${family.toLowerCase().replace(/\s+/g, '-')}`;
  if (document.getElementById(linkId)) return; // ya cargada

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = fontOption.googleFontsUrl;
  document.head.appendChild(link);
}

/**
 * Hook que carga el tema desde la API y lo aplica al :root.
 * Devuelve el tema cargado (o null mientras carga).
 */
export function useBrandTheme(): ThemeTokens | null {
  const [theme, setTheme] = useState<ThemeTokens | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data || data.error) return;
        const resolved = resolveTheme(data);
        setTheme(resolved);
        applyTheme(resolved);
        loadGoogleFont(resolved.typography.fontFamily);
      })
      .catch((err) => console.error('Error cargando theme:', err));
    return () => { cancelled = true; };
  }, []);

  return theme;
}

/**
 * Componente sin render visual que solo aplica el tema al montar.
 * Ponerlo una vez en el layout raíz.
 */
export function BrandThemeApplier() {
  useBrandTheme();
  return null;
}

// ─── Retrocompatibilidad ───────────────────────────────────────────────────
//
// El AdminPanel existente importa `applyBrandColors` para la vista previa
// en vivo de la pestaña Apariencia. Lo mantenemos como wrapper que delega
// al nuevo sistema de temas, pero la nueva UI usará `applyTheme` directamente.

interface LegacyBrandColors {
  primaryColor: string;
  primaryColorDark: string;
  primaryColorLight: string;
  footerBgColor: string;
  footerTextColor: string;
  footerAccentColor: string;
}

/**
 * @deprecated Usar applyTheme() con un ThemeTokens completo en su lugar.
 * Aplica solo los 6 colores legacy (sin tipografía, radios, sombras).
 */
export function applyBrandColors(colors: Partial<LegacyBrandColors>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (colors.primaryColor) root.style.setProperty('--brand-primary', colors.primaryColor);
  if (colors.primaryColorDark) root.style.setProperty('--brand-primary-dark', colors.primaryColorDark);
  if (colors.primaryColorLight) root.style.setProperty('--brand-primary-light', colors.primaryColorLight);
  if (colors.footerBgColor) root.style.setProperty('--footer-bg', colors.footerBgColor);
  if (colors.footerTextColor) root.style.setProperty('--footer-text', colors.footerTextColor);
  if (colors.footerAccentColor) root.style.setProperty('--footer-accent', colors.footerAccentColor);
}
