'use client';

/**
 * Imágenes de las secciones del home (Venta Directa, Reservas, Servicios,
 * Promociones, Galería).
 *
 * Por defecto se usan las imágenes sembradas en la BD (siteconfig.sectionImages,
 * JSON { id: url }) — que el admin puede reemplazar desde el Panel con sus
 * propias fotos — y si no hay nada configurado, estos fallbacks estáticos.
 */

export const DEFAULT_SECTION_IMAGES: Record<string, string> = {
  immediate: '/card-venta-directa.webp',
  reservations: '/card-reservas.webp',
  services: '/card-servicios.webp',
  promotions: '/card-promociones.webp',
  gallery: '/card-galeria.webp',
};

export type SectionImages = Record<string, string>;

/** Parsea el JSON crudo de SiteConfig.sectionImages con fallback a los defaults. */
export function parseSectionImages(raw?: string | null): SectionImages {
  const out: SectionImages = { ...DEFAULT_SECTION_IMAGES };
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim() !== '') out[k] = v.trim();
      }
    }
  } catch {
    /* JSON inválido → defaults */
  }
  return out;
}
