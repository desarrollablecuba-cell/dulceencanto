'use client';

import { ShoppingCart, Search, History, Menu, X, User, Sparkles, Phone, Clock, CalendarHeart, Home, ChevronRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { useCustomerStore } from '@/store/customer-store';
import { useCurrencyStore } from '@/store/currency-store';
import { useWishlistStore, useWishlistCount } from '@/store/wishlist-store';
import { SearchOverlay } from '@/components/ecommerce/SearchOverlay';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Dulce Encanto');
  const [tagline, setTagline] = useState<string>('Repostería artesanal');
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [navSections, setNavSections] = useState<{ id: string; label: string; icon: string; visible: boolean }[]>([]);
  const [hamburgerItems, setHamburgerItems] = useState<{ id: string; label: string; icon: string; visible: boolean }[]>([]);
  const cartItems = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s._hydrated);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);
  const { setSearchQuery, setView } = useAppStore();
  const customer = useCustomerStore((s) => s.customer);
  const customerHydrated = useCustomerStore((s) => s.hydrated);
  const hydrateCustomer = useCustomerStore((s) => s.hydrate);
  // Moneda global (persistida en localStorage). Se hidrata al montar para
  // garantizar que el estado del server y del cliente coincidan en SSR.
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const toggleCurrency = useCurrencyStore((s) => s.toggle);
  const hydrateCurrency = useCurrencyStore((s) => s.hydrate);
  // Micro-interacción: badge flotante "+1" sobre el carrito cuando se agrega
  // un item. Se elimina automáticamente después de 1.2s.
  const [cartPulse, setCartPulse] = useState<{ id: number; name: string } | null>(null);
  const [cartBump, setCartBump] = useState<boolean>(false);
  // Wishlist: conteo reactivo para mostrar badge en el Header.
  const wishlistCount = useWishlistCount();
  const hydrateWishlist = useWishlistStore((s) => s.hydrate);

  useEffect(() => {
    if (!customerHydrated) hydrateCustomer();
    hydrateCurrency();
    hydrateWishlist();
  }, [customerHydrated, hydrateCustomer, hydrateCurrency, hydrateWishlist]);

  // Escuchar el evento global `dulce-encanto:cart-item-added` que emite el
  // cart-store cuando se agrega un item. Mostrar un badge flotante "+1" y
  // un pequeño bounce en el botón del carrito.
  useEffect(() => {
    let pulseTimer: ReturnType<typeof setTimeout> | null = null;
    let bumpTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setCartPulse({ id: Date.now(), name: String(detail.name || '') });
      setCartBump(true);
      if (pulseTimer) clearTimeout(pulseTimer);
      if (bumpTimer) clearTimeout(bumpTimer);
      pulseTimer = setTimeout(() => setCartPulse(null), 1200);
      bumpTimer = setTimeout(() => setCartBump(false), 600);
    };
    window.addEventListener('dulce-encanto:cart-item-added', handler);
    return () => {
      window.removeEventListener('dulce-encanto:cart-item-added', handler);
      if (pulseTimer) clearTimeout(pulseTimer);
      if (bumpTimer) clearTimeout(bumpTimer);
    };
  }, []);

  // Cargar logo + horarios desde la API
  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        if (data.logo) setLogoUrl(data.logo);
        if (data.storeName) setStoreName(data.storeName);
        if (data.tagline) setTagline(data.tagline);
        if (data.phone) setPhone(data.phone);
        if (data.whatsappNumber) setWhatsapp(data.whatsappNumber);
        try { const ns = JSON.parse(data.navSections || '[]'); if (Array.isArray(ns)) setNavSections(ns); } catch {}
        try { const hi = JSON.parse(data.hamburgerItems || '[]'); if (Array.isArray(hi)) setHamburgerItems(hi); } catch {}
        setSchedule({
          Lunes: data.scheduleLunes || '',
          Martes: data.scheduleMartes || '',
          Miércoles: data.scheduleMiercoles || '',
          Jueves: data.scheduleJueves || '',
          Viernes: data.scheduleViernes || '',
          Sábado: data.scheduleSabado || '',
          Domingo: data.scheduleDomingo || '',
        });
      })
      .catch(() => {});
  }, []);

  const itemCount = hydrated ? getItemCount() : 0;
  const cartTotal = hydrated ? getTotal() : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchValue);
    setView('catalog');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-[1600px] mx-auto">
        {/* Top bar — compacta en móvil */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
          {/* Hamburger — SIEMPRE visible (contiene items de utilidad) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', color: '#FFF', boxShadow: '0 4px 12px rgba(168,85,247,0.3)' }}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => { setView('home'); setSearchQuery(''); setSearchValue(''); }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} aria-hidden>
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{storeName}</h1>
            </div>
          </div>

          {/* Section nav links — desktop (configurables desde admin) */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {navSections.filter((s) => s.visible).map((sec) => (
              <button
                key={sec.id}
                onClick={() => setView(sec.id as any)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                style={{ color: '#2E1065', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F3E8FF'; e.currentTarget.style.color = '#7E22CE'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2E1065'; }}
              >
                <span className="mr-1">{sec.icon}</span>{sec.label}
              </button>
            ))}
          </nav>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
            <div className="relative w-full flex">
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={(e) => {
                  // Al hacer focus en el input, abrir el overlay de búsqueda
                  // con sugerencias en tiempo real (en lugar de solo navegar
                  // al catálogo al submit).
                  e.target.blur();
                  setSearchOverlayOpen(true);
                }}
                className="rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 cursor-pointer"
                readOnly
              />
              <Button
                type="submit"
                className="rounded-l-none bg-brand hover:bg-brand-dark h-10 px-6"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Mobile search trigger — botón compacto que abre el overlay */}
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="md:hidden shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)', border: '1px solid #FBCFE8' }}
            aria-label="Buscar productos"
          >
            <Search className="h-5 w-5" style={{ color: '#7E22CE' }} />
          </button>

          {/* Currency toggle — global (afecta a toda la tienda). Compacto en móvil */}
          <div
            className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-full cursor-pointer select-none transition-all hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)', border: '1px solid #FBCFE8' }}
            role="radiogroup"
            aria-label="Seleccionar moneda"
            title={`Moneda: ${currency === 'CUP' ? 'Peso Cubano (CUP)' : 'Dólar Americano (USD)'}`}
            onClick={(e) => {
              // Click directo en el contenedor → toggle entre CUP/USD.
              // (Los botones internos hacen stopPropagation para cambiar a uno específico.)
              e.preventDefault();
              toggleCurrency();
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrency('CUP'); }}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all"
              style={{
                background: currency === 'CUP' ? 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)' : 'transparent',
                color: currency === 'CUP' ? '#FFF' : '#7E22CE',
                boxShadow: currency === 'CUP' ? '0 2px 8px -2px rgba(168,85,247,0.5)' : 'none',
              }}
              aria-pressed={currency === 'CUP'}
              aria-label="Ver precios en CUP (peso cubano)"
            >
              <span className="mr-0.5">₱</span>CUP
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrency('USD'); }}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all"
              style={{
                background: currency === 'USD' ? 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' : 'transparent',
                color: currency === 'USD' ? '#FFF' : '#BE185D',
                boxShadow: currency === 'USD' ? '0 2px 8px -2px rgba(236,72,153,0.5)' : 'none',
              }}
              aria-pressed={currency === 'USD'}
              aria-label="Ver precios en USD (dólar)"
            >
              <span className="mr-0.5">$</span>USD
            </button>
          </div>

          {/* Cart button */}
          <div className="relative shrink-0">
            {/* Wishlist button — botón corazón con contador */}
            <Button
              variant="outline"
              size="icon"
              className="relative shrink-0 h-10 w-10 transition-transform hover:scale-105"
              onClick={() => window.dispatchEvent(new CustomEvent('dulce-encanto:toggle-wishlist'))}
              aria-label={`Abrir favoritos${wishlistCount > 0 ? ` (${wishlistCount})` : ''}`}
              style={{ borderColor: wishlistCount > 0 ? '#EC4899' : undefined, color: wishlistCount > 0 ? '#EC4899' : undefined }}
            >
              <Heart className={`h-5 w-5 ${wishlistCount > 0 ? 'fill-pink-500' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Button>

            {/* Badge flotante "+1" — micro-interacción al agregar al carrito */}
            <AnimatePresence>
              {cartPulse && (
                <motion.div
                  key={cartPulse.id}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: 1, y: -28, scale: 1 }}
                  exit={{ opacity: 0, y: -44, scale: 0.9 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
                  aria-live="polite"
                >
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}>
                    <span style={{ fontSize: '12px' }}>+</span>1
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {itemCount > 0 ? (
              <Button
                onClick={() => window.dispatchEvent(new CustomEvent('toggleCart'))}
                className={`relative bg-brand hover:bg-brand-dark text-white h-11 px-4 rounded-full shadow-lg animate-pulse-slow shrink-0 transition-transform ${cartBump ? 'scale-110' : 'scale-100'}`}
                style={{ transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                aria-label={`Abrir carrito con ${itemCount} producto(s), total $${cartTotal.toFixed(2)}`}
              >
                <ShoppingCart className="h-5 w-5 fill-white" />
                <span className="ml-1.5 font-bold text-base hidden sm:inline">${cartTotal.toFixed(2)}</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">{itemCount}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className={`relative shrink-0 h-10 w-10 transition-transform ${cartBump ? 'scale-110' : 'scale-100'}`}
                style={{ transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                onClick={() => window.dispatchEvent(new CustomEvent('toggleCart'))}
                aria-label="Abrir carrito"
              >
                <ShoppingCart className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Búsqueda móvil: se abre con el botón compacto de la barra superior
            (SearchOverlay). Se eliminó el formulario duplicado que ocupaba una
            fila entera y empujaba todo el contenido hacia abajo. */}

        {/* Mobile menu — Enhanced animated drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(46,16,101,0.5)', backdropFilter: 'blur(4px)' }}
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* Drawer */}
              <motion.div
                key="drawer-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-sm overflow-y-auto"
                style={{ background: 'linear-gradient(180deg, #2E1065 0%, #4C1D95 100%)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(236,72,153,0.2)' }}>
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt={storeName} className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                        {storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white leading-tight" style={{ fontFamily: 'Georgia, serif', fontSize: '16px' }}>{storeName}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: '#E9D5FF' }}>{tagline}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation — configurable items (hamburgerItems) */}
                <div className="px-4 py-4 space-y-1.5">
                  {/* Inicio siempre presente */}
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                    onClick={() => { setView('home'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium transition-all hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(236,72,153,0.15)' }}
                  >
                    <Home className="h-4 w-4" style={{ color: '#F9A8D4' }} />
                    <span className="flex-1 text-left">Inicio</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </motion.button>
                  {hamburgerItems.filter((it) => it.visible).map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      onClick={() => { setView(item.id as any); setMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(236,72,153,0.15)' }}
                    >
                      <span style={{ fontSize: '18px' }}>{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </motion.button>
                  ))}
                </div>

                {/* Reservar Evento CTA */}
                <div className="px-4 pb-4">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => {
                      window.dispatchEvent(new Event('dulce-encanto:open-reservation'));
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-white text-sm font-semibold transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 8px 20px -4px rgba(236,72,153,0.4)' }}
                  >
                    <CalendarHeart className="h-4 w-4" /> Reservar Evento
                  </motion.button>
                </div>

                {/* Horarios y contacto eliminados del drawer — ahora son páginas independientes accesibles via hamburgerItems */}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Search Overlay — dropdown con sugerencias en tiempo real */}
      <SearchOverlay
        open={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        initialQuery={searchValue}
      />
    </header>
  );
}

/**
 * Cinta de titulares (marquee) — animación horizontal infinita.
 * Componente separado para poder ubicarlo DESPUÉS de la CategoryBar en
 * page.tsx (orden visual: Header → CategoryBar → Ticker → Home).
 */
export function HeaderTicker() {
  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const [tickerEnabled, setTickerEnabled] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        try {
          const items = JSON.parse(data.tickerItems || '[]');
          if (Array.isArray(items) && items.length > 0) setTickerItems(items);
        } catch { /* ignore */ }
        if (data.tickerEnabled === false) setTickerEnabled(false);
      })
      .catch(() => {});
  }, []);

  if (!tickerEnabled || tickerItems.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-brand to-brand-dark text-white overflow-hidden">
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: 'marquee 30s linear infinite',
          willChange: 'transform',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = 'paused'; }}
        onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = 'running'; }}
      >
        {/* Duplicamos el contenido para que el scroll sea continuo */}
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center shrink-0">
            {tickerItems.map((item, i) => (
              <span key={`${dup}-${i}`} className="text-xs py-1.5 px-6 font-medium inline-flex items-center gap-1.5">
                {item}
                <span className="text-white/40 ml-3">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
