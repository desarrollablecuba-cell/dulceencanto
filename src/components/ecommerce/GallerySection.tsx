'use client';

/**
 * GallerySection — Galería de Eventos por categorías (v2)
 *
 * Flujo de navegación:
 *   1. Grid de tarjetas: una por tipo de evento (15 Años, Bodas,
 *      Cumpleaños Infantiles…). La portada es una imagen representativa
 *      (configurable por el negocio desde el admin).
 *   2. Al abrir una categoría → visor inmersivo con CARRUSEL de fotos
 *      reales de ese tipo de evento (flechas, miniaturas, contador).
 *   3. Click en una foto → LIGHTBOX GIGANTE (pantalla completa) para
 *      apreciar los trabajos de Dulce Encanto al detalle.
 *
 * Las categorías y fotos se gestionan desde el Panel de Administración
 * (sección Galería): agregar, editar, eliminar y reordenar.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Images, Expand, X, ChevronLeft, ChevronRight, Camera, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryPhoto {
  id: string;
  image: string;
  title: string;
  description: string;
  order: number;
}

interface GalleryCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover: string;
  icon: string;
  photos: GalleryPhoto[];
}

export function GallerySection() {
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [openCat, setOpenCat] = useState<GalleryCategory | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    fetch('/api/gallery')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, []);

  const photos = openCat?.photos ?? [];
  const current = photos[Math.min(photoIdx, Math.max(photos.length - 1, 0))];

  const goPrev = useCallback(() => {
    if (photos.length === 0) return;
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    if (photos.length === 0) return;
    setPhotoIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const closeCategory = useCallback(() => {
    setOpenCat(null);
    setZoom(false);
    setPhotoIdx(0);
  }, []);

  // Navegación con teclado dentro del visor/lightbox
  useEffect(() => {
    if (!openCat) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { zoom ? setZoom(false) : closeCategory(); }
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    // Bloquear scroll de fondo mientras el visor está abierto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openCat, zoom, goPrev, goNext, closeCategory]);

  // Swipe táctil (móvil)
  const touchX = useRef<number | null>(null);

  return (
    <section id="galeria" className="py-16 relative" style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Encabezado */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
            <Images className="h-3.5 w-3.5" /> Galería
          </span>
          <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Eventos que hemos hecho realidad
          </h2>
          <p className="mt-2" style={{ fontSize: '15px', color: '#6B7280' }}>
            Explora cada tipo de evento y mira nuestros trabajos reales en detalle
          </p>
        </div>

        {/* Grid de categorías (portadas) */}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Images className="h-12 w-12 mx-auto mb-3" style={{ color: '#FBCFE8' }} />
            <p style={{ color: '#6B7280' }}>Aún no hay categorías en la galería.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                onClick={() => { setOpenCat(cat); setPhotoIdx(0); setZoom(false); }}
                className="group relative overflow-hidden rounded-3xl text-left cursor-pointer"
                style={{ boxShadow: '0 10px 30px -8px rgba(168,85,247,0.25)', border: '1px solid #F3E8FF' }}
                aria-label={`Ver galería de ${cat.name}`}
              >
                <div className="aspect-[4/5] overflow-hidden" style={{ background: '#F3E8FF' }}>
                  {cat.cover ? (
                    <img
                      src={cat.cover}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="h-10 w-10" style={{ color: '#D8B4FE' }} />
                    </div>
                  )}
                </div>
                {/* Degradado inferior */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(46,16,101,0.92) 0%, rgba(46,16,101,0.25) 45%, transparent 70%)' }} />
                {/* Expandir */}
                <div className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)' }}>
                  <Expand className="h-4 w-4" style={{ color: '#7E22CE' }} />
                </div>
                {/* Badge de cantidad de fotos */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }}>
                    <Camera className="h-3 w-3" /> {cat.photos.length} {cat.photos.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>
                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <span className="text-lg leading-none" aria-hidden>{cat.icon}</span>
                  <h3 className="font-bold leading-tight mt-1" style={{ fontSize: '17px', fontFamily: 'Georgia, serif' }}>
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-[11px] leading-snug mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {cat.description}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#F9A8D4' }}>
                    Ver galería <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* ═══════ VISOR DE CATEGORÍA: carrusel grande ═══════ */}
      <AnimatePresence>
        {openCat && (
          <motion.div
            key="gallery-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] flex flex-col"
            style={{ background: 'linear-gradient(180deg, #1E112A 0%, #2E1065 100%)' }}
            role="dialog"
            aria-label={`Galería: ${openCat.name}`}
            onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
              if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
              touchX.current = null;
            }}
          >
            {/* Barra superior */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5" style={{ borderBottom: '1px solid rgba(236,72,153,0.25)', background: 'rgba(30,17,42,0.6)', backdropFilter: 'blur(8px)' }}>
              <button
                onClick={closeCategory}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/15 shrink-0"
                aria-label="Volver a la galería"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white truncate leading-tight" style={{ fontFamily: 'Georgia, serif', fontSize: '17px' }}>
                  <span className="mr-1.5" aria-hidden>{openCat.icon}</span>{openCat.name}
                </h3>
                {openCat.description && (
                  <p className="text-[11px] truncate" style={{ color: '#E9D5FF' }}>{openCat.description}</p>
                )}
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'rgba(236,72,153,0.25)', color: '#F9A8D4' }}>
                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </span>
              <button
                onClick={closeCategory}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/15 shrink-0"
                aria-label="Cerrar galería"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Carrusel principal */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden px-2 sm:px-16 min-h-0">
              {photos.length === 0 ? (
                <div className="text-center py-16">
                  <Camera className="h-12 w-12 mx-auto mb-3" style={{ color: 'rgba(233,213,255,0.4)' }} />
                  <p className="text-sm" style={{ color: '#E9D5FF' }}>Todavía no hay fotos en esta categoría.</p>
                </div>
              ) : current ? (
                <>
                  {/* Flechas */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={goPrev}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                        style={{ background: 'rgba(236,72,153,0.35)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }}
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={goNext}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                        style={{ background: 'rgba(236,72,153,0.35)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }}
                        aria-label="Foto siguiente"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto py-4"
                    >
                      {/* Imagen principal — click para agrandar */}
                      <button
                        onClick={() => setZoom(true)}
                        className="relative flex-1 min-h-0 w-full flex items-center justify-center cursor-zoom-in group"
                        aria-label="Ampliar foto a pantalla completa"
                        title="Click para ampliar"
                      >
                        <img
                          src={current.image}
                          alt={current.title || openCat.name}
                          className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl"
                          style={{ maxHeight: 'calc(100vh - 240px)', boxShadow: '0 24px 80px -12px rgba(0,0,0,0.6)' }}
                        />
                        <span className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                          <Expand className="h-3 w-3" /> Ampliar
                        </span>
                      </button>

                      {/* Pie de foto */}
                      {(current.title || current.description) && (
                        <div className="text-center mt-3 px-6 max-w-2xl">
                          {current.title && (
                            <p className="font-bold text-white" style={{ fontFamily: 'Georgia, serif', fontSize: '16px' }}>{current.title}</p>
                          )}
                          {current.description && (
                            <p className="text-xs mt-0.5" style={{ color: '#D8B4FE' }}>{current.description}</p>
                          )}
                        </div>
                      )}

                      {/* Contador */}
                      {photos.length > 1 && (
                        <p className="mt-2 text-[11px] font-bold tracking-widest" style={{ color: 'rgba(233,213,255,0.6)' }}>
                          {photoIdx + 1} / {photos.length}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              ) : null}
            </div>

            {/* Miniaturas */}
            {photos.length > 1 && (
              <div className="px-4 sm:px-6 pb-4 pt-1">
                <div className="flex gap-2 overflow-x-auto justify-start sm:justify-center pb-1" style={{ scrollbarWidth: 'thin' }}>
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setPhotoIdx(i)}
                      className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all"
                      style={{
                        outline: i === photoIdx ? '3px solid #EC4899' : '2px solid rgba(255,255,255,0.15)',
                        outlineOffset: '2px',
                        opacity: i === photoIdx ? 1 : 0.55,
                      }}
                      aria-label={`Ir a foto ${i + 1}`}
                    >
                      <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ LIGHTBOX GIGANTE (pantalla completa) ═══════ */}
      <AnimatePresence>
        {zoom && current && (
          <motion.div
            key="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(10, 5, 16, 0.97)' }}
            onClick={() => setZoom(false)}
            role="dialog"
            aria-label="Foto ampliada"
            onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
              if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
              touchX.current = null;
            }}
          >
            {/* Cerrar */}
            <button
              className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
              onClick={() => setZoom(false)}
              aria-label="Cerrar vista ampliada"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Flechas gigantes */}
            {photos.length > 1 && (
              <>
                <button
                  className="absolute left-3 sm:left-6 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                  style={{ background: 'rgba(236,72,153,0.3)', backdropFilter: 'blur(6px)' }}
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  className="absolute right-3 sm:right-6 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                  style={{ background: 'rgba(236,72,153,0.3)', backdropFilter: 'blur(6px)' }}
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}

            {/* Imagen gigante — ocupa toda la pantalla posible */}
            <motion.img
              key={current.id}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              src={current.image}
              alt={current.title || openCat?.name || 'Foto de evento'}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '100vh', maxWidth: '100vw' }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Pie */}
            {(current.title || current.description) && (
              <div className="absolute bottom-5 left-0 right-0 text-center px-16 pointer-events-none">
                {current.title && <p className="font-bold text-white text-lg" style={{ fontFamily: 'Georgia, serif' }}>{current.title}</p>}
                {current.description && <p className="text-xs mt-1" style={{ color: 'rgba(233,213,255,0.8)' }}>{current.description}</p>}
                <p className="mt-1 text-[10px] font-bold tracking-widest" style={{ color: 'rgba(233,213,255,0.5)' }}>
                  {photoIdx + 1} / {photos.length} · 🧁 Dulce Encanto
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
