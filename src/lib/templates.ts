/**
 * Plantillas de tienda reutilizables (Task 7 — v27-checkout-templates).
 *
 * Una plantilla agrupa la configuración visual + estructura del home para
 * que el admin pueda arrancar con una base preconfigurada y después
 * personalizarla (colores, logo, etc.).
 *
 * Las plantillas NO contienen datos específicos del cliente (sin logos,
 * sin nombres, sin imágenes). Solo configuran:
 *   - Paleta de colores (primary, dark, light, footer)
 *   - themeId (para BrandTheme)
 *   - Orden y activación de las secciones del home
 *   - Modo de visualización del catálogo
 */

export interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  config: {
    primaryColor: string;
    primaryColorDark: string;
    primaryColorLight: string;
    footerBgColor: string;
    footerTextColor: string;
    footerAccentColor: string;
    themeId: string;
    homeSectionsOrder: string;
    homeSectionsEnabled: string;
    catalogLayout: string;
  };
}

export const TEMPLATES: StoreTemplate[] = [
  {
    id: 'delivery',
    name: 'Delivery',
    description:
      'Plantilla optimizada para tiendas de delivery, supermercados y envíos. ' +
      'Incluye todas las secciones del home habilitadas (hero, beneficios, ofertas, ' +
      'catálogo por categorías, cómo funciona, horario, zonas de entrega, reseñas, ' +
      'banner promocional y prueba social) con la paleta naranja clásica.',
    config: {
      primaryColor: '#f59e0b',
      primaryColorDark: '#d97706',
      primaryColorLight: '#fef3c7',
      footerBgColor: '#111827',
      footerTextColor: '#d1d5db',
      footerAccentColor: '#f59e0b',
      themeId: 'diaz-premium',
      homeSectionsOrder: JSON.stringify([
        'hero',
        'buyFrom',
        'benefits',
        'offers',
        'catalog',
        'howItWorks',
        'schedule',
        'deliveryZones',
        'storeReviews',
        'promoBanner',
        'socialStats',
      ]),
      homeSectionsEnabled: JSON.stringify({
        hero: true,
        buyFrom: true,
        benefits: true,
        offers: true,
        catalog: true,
        howItWorks: true,
        schedule: true,
        scheduleDetailed: false,
        deliveryZones: true,
        storeReviews: true,
        promoBanner: true,
        socialStats: true,
      }),
      catalogLayout: 'categories',
    },
  },
];

/**
 * Devuelve la lista de IDs de secciones que una plantilla activa.
 * Útil para mostrar un preview del orden en el admin.
 */
export function getTemplateSectionIds(template: StoreTemplate): string[] {
  try {
    const arr = JSON.parse(template.config.homeSectionsOrder);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}
