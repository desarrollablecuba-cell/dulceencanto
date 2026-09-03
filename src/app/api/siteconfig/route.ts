import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '@/lib/auth';

// Default config devuelto si la BD no tiene SiteConfig todavía.
// Permite que la UI cargue aunque la migración JSON aún no se haya corrido.
const DEFAULT_CONFIG = {
  id: 'site',
  storeName: 'Dulce Encanto',
  tagline: 'Sabor y elegancia para tus momentos especiales',
  logo: '/logo-dulce-encanto.webp',
  cover: '/hero-slide-1.webp',
  heroTitle: 'Sabor y elegancia para tus **momentos especiales**',
  heroSubtitle: 'Pasteles personalizados, cupcakes y postres fríos elaborados con los mejores ingredientes y mucho amor.',
  heroSlides: JSON.stringify([
    { image: '/hero-slide-1.webp', title: 'Sabor y elegancia para tus momentos especiales', subtitle: 'Pasteles personalizados, cupcakes y postres fríos elaborados con los mejores ingredientes y mucho amor.', cta: '🧁 Ver catálogo', link: 'catalog' },
    { image: '/hero-slide-2.webp', title: 'Cupcakes recién horneados', subtitle: 'Surtidos de vainilla, chocolate y frutos rojos con buttercream cremoso. Caja lista para regalar.', cta: '🧁 Ver cupcakes', link: 'catalog', category: 'cupcakes' },
    { image: '/hero-slide-3.webp', title: 'Combos para tus eventos', subtitle: 'Tarta personalizada + cupcakes + galletas. Diseños únicos para cumpleaños, bodas y celebraciones.', cta: '🎁 Ver combos', link: 'catalog', category: 'combos' },
  ]),
  promoBannerTitle: '',
  promoBannerSubtitle: '',
  promoBannerButtonText: '',
  reservableDeliverySchedule: '',
  priorityDeliveryInfo1: '',
  priorityDeliveryInfo2: '',
  priorityDeliveryInfo3: '',
  phone: '',
  whatsappNumber: '',
  address: '',
  zelleEmail: '',
  zelleName: '',
  primaryColor: '#A855F7',
  primaryColorDark: '#7E22CE',
  primaryColorLight: '#F3E8FF',
  footerBgColor: '#1E112A',
  footerTextColor: '#E9D5FF',
  footerAccentColor: '#EC4899',
  themeId: 'dulce-encanto',
  themeData: '',
  homeSectionsOrder: '',
  homeSectionsEnabled: '',
  offersCarousel: '',
  savedThemes: '[]',
  zelleEnabled: true,
  freeShippingEnabled: true,
  customerRegistrationEnabled: true,
  customerLoginEnabled: true,
  tickerEnabled: true,
  catalogLayout: 'categories',
  freeShippingMin: 100,
  minOrderAmount: 10,
  shippingCost: 9.99,
  scheduleLunes: '15:00 - 18:00',
  scheduleMartes: '15:00 - 18:00',
  scheduleMiercoles: '15:00 - 18:00',
  scheduleJueves: '15:00 - 18:00',
  scheduleViernes: '15:00 - 18:00',
  scheduleSabado: '15:00 - 18:00',
  scheduleDomingo: '15:00 - 18:00',
  asapSurchargeType: 'fixed',
  asapSurchargeValue: 5,
  asapStartHour: '06:00',
  asapEndHour: '22:00',
  normalSchedule: '15:00 - 18:00',
  maxOrderHour: '14:00',
  asapMinLeadTime: 60,
  asapMaxPerHour: 5,
  asapExcludeNormalHours: false,
  activeCountries: 'US,CU',
  tickerItems: '[]',
  horarioSectionTitle: '',
  horarioSectionDesc: '',
  horarioCards: '[]',
  socialLinks: '[]',
  trustBadges: '[]',
  socialStats: '[]',
  testimonials: '[]',
  homeBenefits: '[]',
  howItWorksSteps: '',
  createdAt: '',
  updatedAt: '',
};

export async function GET() {
  try {
    let config = await db.siteConfig.findUnique({ where: { id: 'site' } });
    if (!config) {
      // Auto-crear config por defecto para que la UI no rompa.
      try {
        config = await db.siteConfig.create({ data: { id: 'site', ...DEFAULT_CONFIG } as any });
      } catch {
        // Si no puede crear (ej: tabla no existe), devolver default sin persistir
        return NextResponse.json(DEFAULT_CONFIG);
      }
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching site config:', error);
    // Devolver default en lugar de 500 para no romper la UI
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: Request) {
  // Solo el admin puede modificar la configuración del sitio
  const admin = requireAdmin(request);
  if (!admin) return unauthorized();
  try {
    const body = await request.json();
    const allowedFields = [
      'storeName', 'tagline', 'logo', 'cover', 'heroTitle', 'heroSubtitle', 'promoBannerTitle', 'promoBannerSubtitle', 'promoBannerButtonText', 'reservableDeliverySchedule', 'priorityDeliveryInfo1', 'priorityDeliveryInfo2', 'priorityDeliveryInfo3', 'phone', 'whatsappNumber', 'address',
      'zelleEmail', 'zelleName',
      'primaryColor', 'primaryColorDark', 'primaryColorLight',
      'footerBgColor', 'footerTextColor', 'footerAccentColor',
      'themeId', 'themeData',
      'homeSectionsOrder', 'homeSectionsEnabled',
      'offersCarousel', 'savedThemes', 'heroSlides', 'sectionImages',
      'navSections', 'hamburgerItems',
      'zelleEnabled', 'freeShippingEnabled',
      'customerRegistrationEnabled', 'customerLoginEnabled',
      'tickerEnabled', 'catalogLayout',
      'freeShippingMin', 'shippingCost', 'minOrderAmount',
      'scheduleLunes', 'scheduleMartes', 'scheduleMiercoles', 'scheduleJueves',
      'scheduleViernes', 'scheduleSabado', 'scheduleDomingo',
      'asapSurchargeType', 'asapSurchargeValue', 'asapStartHour', 'asapEndHour', 'normalSchedule', 'maxOrderHour', 'asapMinLeadTime', 'asapMaxPerHour', 'asapExcludeNormalHours', 'activeCountries',
      'tickerItems', 'horarioSectionTitle', 'horarioSectionDesc', 'horarioCards', 'specialDates',
      'socialLinks', 'trustBadges', 'socialStats', 'testimonials', 'homeBenefits', 'howItWorksSteps',
    ];
    const floatFields = ['freeShippingMin', 'shippingCost', 'minOrderAmount', 'asapSurchargeValue'];
    const intFields = ['asapMinLeadTime', 'asapMaxPerHour'];
    const boolFields = ['zelleEnabled', 'freeShippingEnabled', 'customerRegistrationEnabled', 'customerLoginEnabled', 'tickerEnabled', 'asapExcludeNormalHours'];

    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        if (floatFields.includes(key)) {
          data[key] = Number(body[key]) || 0;
        } else if (intFields.includes(key)) {
          data[key] = parseInt(String(body[key])) || 0;
        } else if (boolFields.includes(key)) {
          data[key] = body[key] === true || body[key] === 'true';
        } else {
          data[key] = body[key];
        }
      }
    }

    const config = await db.siteConfig.update({
      where: { id: 'site' },
      data,
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating site config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
