'use client';

import { useState, useEffect } from 'react';
import { Images, Expand, X } from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  image: string;
  eventType: string;
  description: string;
}

const EVENT_TYPES: { id: string; label: string; emoji: string }[] = [
  { id: 'cumple_ninos', label: 'Cumpleaños Infantiles', emoji: '🧸' },
  { id: '15_anos', label: '15 Años', emoji: '🎀' },
  { id: 'cumple_adultos', label: 'Cumpleaños Adultos', emoji: '🥂' },
  { id: 'boda', label: 'Bodas', emoji: '💍' },
];

export function GallerySection() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.eventType === filter);

  return (
    <section id="galeria" className="py-16 relative" style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 px-3 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
            <Images className="h-3.5 w-3.5" /> Galería
          </span>
          <h2 className="font-bold" style={{ fontSize: '32px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
            Eventos que hemos hecho realidad
          </h2>
          <p className="mt-2" style={{ fontSize: '15px', color: '#6B7280' }}>
            Inspírate con nuestros trabajos anteriores
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setFilter('all')}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filter === 'all' ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FFF',
              color: filter === 'all' ? '#FFF' : '#2E1065',
              border: filter === 'all' ? 'none' : '1px solid #FBCFE8',
              boxShadow: filter === 'all' ? '0 4px 12px rgba(168,85,247,0.3)' : 'none',
            }}
          >
            ✨ Ver todos
          </button>
          {EVENT_TYPES.map((et) => (
            <button
              key={et.id}
              onClick={() => setFilter(et.id)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filter === et.id ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#FFF',
                color: filter === et.id ? '#FFF' : '#2E1065',
                border: filter === et.id ? 'none' : '1px solid #FBCFE8',
                boxShadow: filter === et.id ? '0 4px 12px rgba(168,85,247,0.3)' : 'none',
              }}
            >
              {et.emoji} {et.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Images className="h-12 w-12 mx-auto mb-3" style={{ color: '#FBCFE8' }} />
            <p style={{ color: '#6B7280' }}>No hay eventos de este tipo todavía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map((item) => {
              const et = EVENT_TYPES.find((e) => e.id === item.eventType);
              return (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: '0 6px 20px -4px rgba(236,72,153,0.15)' }}
                  onClick={() => setLightbox(item)}
                >
                  <div className="aspect-[4/3] overflow-hidden" style={{ background: '#F3E8FF' }}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(46,16,101,0.85) 0%, rgba(46,16,101,0.1) 50%, transparent 100%)' }} />
                  {/* Expand icon */}
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
                    <Expand className="h-4 w-4" style={{ color: '#7E22CE' }} />
                  </div>
                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
                      {et?.emoji} {et?.label}
                    </span>
                    <h3 className="font-bold leading-tight" style={{ fontSize: '15px', fontFamily: 'Georgia, serif' }}>
                      {item.title}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(46,16,101,0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.image} alt={lightbox.title} className="w-full rounded-2xl shadow-2xl" />
            <div className="mt-4 text-center text-white">
              <h3 className="font-bold mb-1" style={{ fontSize: '22px', fontFamily: 'Georgia, serif' }}>{lightbox.title}</h3>
              <p className="text-sm opacity-90">{lightbox.description}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
