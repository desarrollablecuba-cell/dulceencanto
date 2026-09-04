'use client';

/**
 * MobileNavDock — barra de navegación flotante para móvil (< lg).
 *
 * El problema: en móvil el Header no muestra los enlaces de sección
 * (Venta Directa, Reservas, Servicios…) y quedan enterrados en el drawer.
 *
 * La solución "ingeniosa": un dock flotante estilo app nativa:
 *   · Siempre visible al alcance del pulgar, con blur glassmorphism y
 *     soporte para safe-area (iPhone con notch).
 *   · Item activo con píldora degradada elevada (el icono "salta" fuera
 *     de la barra, estilo tab bar de iOS/Android).
 *   · V52.6: SIEMPRE visible (no se oculta al hacer scroll) para que los
 *     clientes puedan navegar de inmediato a las diferentes secciones.
 *   · Se alimenta de las mismas secciones configurables del admin
 *     (siteconfig.navSections) que el menú de escritorio.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Home, ShoppingBag, CalendarHeart, Sparkles, Percent, Images,
  Clock, MapPin, DollarSign, Grid3X3, Package, User, CalendarPlus,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore, type AppView } from '@/store/app-store';
import { motion } from 'framer-motion';

interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  catalog: Grid3X3,
  immediate: ShoppingBag,
  reservations: CalendarHeart,
  services: Sparkles,
  promotions: Percent,
  gallery: Images,
  schedules: Clock,
  'delivery-zones': MapPin,
  'exchange-rates': DollarSign,
  orders: Package,
  account: User,
};

const LABELS: Record<string, string> = {
  home: 'Inicio',
  catalog: 'Catálogo',
  immediate: 'Venta Directa',
  reservations: 'Reservas',
  services: 'Servicios',
  promotions: 'Promos',
  gallery: 'Galería',
  schedules: 'Horarios',
  'delivery-zones': 'Zonas',
  'exchange-rates': 'Tasas',
  orders: 'Pedidos',
  account: 'Mi cuenta',
};

/** Fallback cuando aún no cargó siteconfig (o viene vacío). */
const FALLBACK_ITEMS: DockItem[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'immediate', label: 'Venta Directa', icon: ShoppingBag },
  { id: 'reservations', label: 'Reservas', icon: CalendarHeart },
  { id: 'services', label: 'Servicios', icon: Sparkles },
  { id: 'promotions', label: 'Promos', icon: Percent },
  { id: 'gallery', label: 'Galería', icon: Images },
];

export function MobileNavDock() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);
  const [items, setItems] = useState<DockItem[]>(FALLBACK_ITEMS);

  // Cargar secciones configurables (mismas que el menú de escritorio)
  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        try {
          const ns = JSON.parse(data.navSections || '[]');
          if (Array.isArray(ns) && ns.length > 0) {
            const mapped: DockItem[] = [
              { id: 'home', label: 'Inicio', icon: Home },
              ...ns
                .filter((s: { visible: boolean }) => s.visible)
                .slice(0, 4) // Inicio + 4 secciones = 5 items: caben sin apretarse
                .map((s: { id: string; label: string }) => ({
                  id: s.id,
                  label: LABELS[s.id] || s.label,
                  icon: ICON_MAP[s.id] || Sparkles,
                })),
            ];
            setItems(mapped);
          }
        } catch { /* fallback */ }
      })
      .catch(() => {});
  }, []);

  // V52.6 — el dock es SIEMPRE visible: los clientes pueden saltar a
  // cualquier sección en cualquier momento sin importar el scroll.

  const go = useCallback((id: string) => {
    setView(id as AppView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setView]);

  const openReservation = useCallback(() => {
    window.dispatchEvent(new Event('dulce-encanto:open-reservation'));
  }, []);

  // No mostrar el dock en vistas a pantalla completa con flujo propio
  if (currentView === 'checkout' || currentView === 'admin') return null;

  const isActive = (id: string) =>
    currentView === id || (id === 'home' && currentView === 'catalog');

  return (
    <>
      {/* Espaciador para que el dock no tape el footer */}
      <div className="h-[84px] lg:hidden" aria-hidden />

      <motion.nav
        key="mobile-dock"
        initial={{ y: 90 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        aria-label="Navegación principal"
      >
            <div className="px-3">
              <div
                className="max-w-md mx-auto flex items-end justify-around rounded-[26px] px-2 pt-2 pb-1.5 pointer-events-auto"
                style={{
                  background: 'rgba(46, 16, 101, 0.88)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(236, 72, 153, 0.35)',
                  boxShadow: '0 12px 40px -6px rgba(46,16,101,0.55), 0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-2xl transition-transform active:scale-90"
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.label}
                    >
                      {/* Píldora activa */}
                      {active && (
                        <motion.span
                          layoutId="dock-pill"
                          className="absolute inset-x-1 -top-0.5 bottom-0 rounded-2xl"
                          style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 6px 18px -2px rgba(236,72,153,0.55)' }}
                          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                        />
                      )}
                      <Icon
                        className="relative z-10 transition-all"
                        style={{
                          width: active ? 22 : 20,
                          height: active ? 22 : 20,
                          color: active ? '#FFF' : 'rgba(233,213,255,0.75)',
                          transform: active ? 'translateY(-3px)' : 'none',
                        }}
                      />
                      <span
                        className="relative z-10 text-[9px] font-bold leading-none truncate w-full text-center"
                        style={{ color: active ? '#FFF' : 'rgba(233,213,255,0.65)' }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}

                {/* Botón central destacado: Reservar Evento (acción estrella) */}
                <button
                  onClick={openReservation}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-2xl transition-transform active:scale-90"
                  aria-label="Reservar evento"
                >
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 30,
                      height: 30,
                      marginTop: -16,
                      background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
                      boxShadow: '0 6px 16px -2px rgba(245,158,11,0.6)',
                      border: '2px solid rgba(255,255,255,0.85)',
                    }}
                  >
                    <CalendarPlus className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-[9px] font-bold leading-none" style={{ color: '#FDE68A' }}>
                    Reservar
                  </span>
                </button>
              </div>
            </div>
      </motion.nav>
    </>
  );
}
