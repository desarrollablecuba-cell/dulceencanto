'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, GripVertical, Eye, EyeOff } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
//  Editores visuales — reemplazan los JSON editors con UI amigable
// ═══════════════════════════════════════════════════════════════════════════

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link?: string;
  category?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}

function parseJSON<T>(str: string, fallback: T): T {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function stringifyJSON(data: unknown): string {
  return JSON.stringify(data);
}

// ─── HERO SLIDES EDITOR ─────────────────────────────────────────────────────

export function HeroSlidesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [slides, setSlides] = useState<Slide[]>([]);

  useEffect(() => {
    const parsed = parseJSON<Slide[]>(value, []);
    setSlides(parsed);
  }, [value]);

  const update = (newSlides: Slide[]) => {
    setSlides(newSlides);
    onChange(stringifyJSON(newSlides));
  };

  const updateSlide = (idx: number, field: keyof Slide, val: string) => {
    const next = [...slides];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };

  const addSlide = () => {
    update([...slides, { image: '/hero-slide-1.webp', title: 'Nuevo slide', subtitle: 'Descripción del slide', cta: '🧁 Ver más', link: 'catalog' }]);
  };

  const removeSlide = (idx: number) => {
    update(slides.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {slides.map((slide, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Header con preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
            <img src={slide.image} alt="" className="w-16 h-10 rounded object-cover shrink-0" />
            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">Slide {idx + 1}: {slide.title.slice(0, 30)}</span>
            <button
              onClick={() => removeSlide(idx)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar slide"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {/* Campos editables */}
          <div className="p-3 space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Imagen (URL o ruta)</Label>
              <Input value={slide.image} onChange={(e) => updateSlide(idx, 'image', e.target.value)} placeholder="/hero-slide-1.webp" className="text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Título (usa **texto** para resaltar)</Label>
              <Input value={slide.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)} placeholder="Título del slide" className="text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Subtítulo</Label>
              <Input value={slide.subtitle} onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)} placeholder="Descripción" className="text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Texto del botón</Label>
                <Input value={slide.cta} onChange={(e) => updateSlide(idx, 'cta', e.target.value)} placeholder="🧁 Ver catálogo" className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Sección destino</Label>
                <select
                  value={slide.category || ''}
                  onChange={(e) => updateSlide(idx, 'category', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="">Catálogo general</option>
                  <option value="immediate">Venta Directa</option>
                  <option value="reservations">Reservas</option>
                  <option value="services">Servicios</option>
                  <option value="promotions">Promociones</option>
                  <option value="gallery">Galería</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addSlide} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1.5" /> Añadir slide
      </Button>
    </div>
  );
}

// ─── NAV SECTIONS EDITOR ────────────────────────────────────────────────────

export function NavSectionsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    setItems(parseJSON<NavItem[]>(value, []));
  }, [value]);

  const update = (newItems: NavItem[]) => {
    setItems(newItems);
    onChange(stringifyJSON(newItems));
  };

  const toggleVisible = (idx: number) => {
    const next = [...items];
    next[idx] = { ...next[idx], visible: !next[idx].visible };
    update(next);
  };

  const updateField = (idx: number, field: keyof NavItem, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };

  const removeItem = (idx: number) => {
    update(items.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    update([...items, { id: `seccion-${Date.now()}`, label: 'Nueva sección', icon: '✨', visible: true }]);
  };

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const next = [...items];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    update(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white">
          {/* Drag handle */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button onClick={() => moveItem(idx, 'up')} className="text-gray-400 hover:text-gray-700" disabled={idx === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
            </button>
            <GripVertical className="h-4 w-4 text-gray-300" />
            <button onClick={() => moveItem(idx, 'down')} className="text-gray-400 hover:text-gray-700" disabled={idx === items.length - 1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
          </div>
          {/* Icon input */}
          <Input
            value={item.icon}
            onChange={(e) => updateField(idx, 'icon', e.target.value)}
            className="w-14 text-center text-lg h-9 shrink-0"
            maxLength={2}
          />
          {/* Label input */}
          <Input
            value={item.label}
            onChange={(e) => updateField(idx, 'label', e.target.value)}
            className="flex-1 h-9 text-sm"
            placeholder="Nombre de la sección"
          />
          {/* Visibility toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => toggleVisible(idx)}
              className={`p-1.5 rounded-lg transition-colors ${item.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={item.visible ? 'Visible (clic para ocultar)' : 'Oculto (clic para mostrar)'}
            >
              {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => removeItem(idx)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1.5" /> Añadir sección
      </Button>
    </div>
  );
}

// ─── HAMBURGER ITEMS EDITOR ─────────────────────────────────────────────────

export function HamburgerItemsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    setItems(parseJSON<NavItem[]>(value, []));
  }, [value]);

  const update = (newItems: NavItem[]) => {
    setItems(newItems);
    onChange(stringifyJSON(newItems));
  };

  const toggleVisible = (idx: number) => {
    const next = [...items];
    next[idx] = { ...next[idx], visible: !next[idx].visible };
    update(next);
  };

  const updateField = (idx: number, field: keyof NavItem, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };

  const removeItem = (idx: number) => {
    update(items.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    update([...items, { id: `item-${Date.now()}`, label: 'Nuevo item', icon: '📌', visible: true }]);
  };

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const next = [...items];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    update(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-2">
        Estos son los enlaces que aparecen en el menú lateral (hamburguesa). Activa o desactiva con el ícono 👁, reordena con las flechas.
      </p>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-0.5 shrink-0">
            <button onClick={() => moveItem(idx, 'up')} className="text-gray-400 hover:text-gray-700" disabled={idx === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
            </button>
            <GripVertical className="h-4 w-4 text-gray-300" />
            <button onClick={() => moveItem(idx, 'down')} className="text-gray-400 hover:text-gray-700" disabled={idx === items.length - 1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
          </div>
          <Input
            value={item.icon}
            onChange={(e) => updateField(idx, 'icon', e.target.value)}
            className="w-14 text-center text-lg h-9 shrink-0"
            maxLength={2}
          />
          <Input
            value={item.label}
            onChange={(e) => updateField(idx, 'label', e.target.value)}
            className="flex-1 h-9 text-sm"
            placeholder="Nombre del item"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => toggleVisible(idx)}
              className={`p-1.5 rounded-lg transition-colors ${item.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={item.visible ? 'Visible' : 'Oculto'}
            >
              {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => removeItem(idx)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1.5" /> Añadir item
      </Button>
    </div>
  );
}
