'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, GripVertical, RefreshCw, Loader2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
//  PromotionManager — editor visual de promociones (CRUD via API)
// ═══════════════════════════════════════════════════════════════════════════

interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  occasion: string;
  discountPct: number;
  startDate: string;
  endDate: string;
  active: boolean;
  order: number;
}

const OCCASIONS = [
  { value: 'dia_madres', label: 'Día de las Madres' },
  { value: 'dia_padres', label: 'Día de los Padres' },
  { value: 'san_valentin', label: 'San Valentín' },
  { value: 'dia_mujer', label: 'Día de la Mujer' },
  { value: 'fin_anio', label: 'Fin de Año' },
  { value: 'otra', label: 'Otra ocasión' },
];

export function PromotionManager() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/promotions').then(r => r.json()).then(data => {
      setPromos(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async (promo: Promotion) => {
    setSaving(promo.id);
    await fetch('/api/promotions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promo),
    }).catch(() => {});
    setSaving(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    await fetch(`/api/promotions?id=${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  const add = async () => {
    await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nueva promoción',
        description: 'Descripción de la promoción',
        image: '',
        occasion: 'otra',
        discountPct: 10,
        startDate: '',
        endDate: '',
        active: true,
      }),
    }).catch(() => {});
    load();
  };

  const update = (id: string, field: keyof Promotion, val: any) => {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  if (loading) return <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="space-y-4">
      {promos.map((promo) => (
        <div key={promo.id} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
            <span className="text-lg">{promo.image ? '🖼️' : '💝'}</span>
            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{promo.title || 'Sin título'}</span>
            <button onClick={() => save(promo)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Guardar cambios">
              {saving === promo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button onClick={() => remove(promo.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Título</Label>
                <Input value={promo.title} onChange={e => update(promo.id, 'title', e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Ocasión</Label>
                <select value={promo.occasion} onChange={e => update(promo.id, 'occasion', e.target.value)} className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm">
                  {OCCASIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Descripción</Label>
              <Textarea value={promo.description} onChange={e => update(promo.id, 'description', e.target.value)} rows={2} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Descuento (%)</Label>
                <Input type="number" value={promo.discountPct} onChange={e => update(promo.id, 'discountPct', Number(e.target.value))} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Inicio</Label>
                <Input type="date" value={promo.startDate?.slice(0,10) || ''} onChange={e => update(promo.id, 'startDate', e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Fin</Label>
                <Input type="date" value={promo.endDate?.slice(0,10) || ''} onChange={e => update(promo.id, 'endDate', e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Imagen (URL)</Label>
                <Input value={promo.image} onChange={e => update(promo.id, 'image', e.target.value)} placeholder="/promo-..." className="text-sm h-9" />
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1.5" /> Añadir promoción
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  GalleryManager — editor visual de galería (CRUD via API)
// ═══════════════════════════════════════════════════════════════════════════

interface GalleryItem {
  id: string;
  title: string;
  image: string;
  eventType: string;
  description: string;
  active: boolean;
}

const EVENT_TYPES = [
  { value: 'cumple_ninos', label: 'Cumpleaños Infantiles' },
  { value: '15_anos', label: '15 Años' },
  { value: 'cumple_adultos', label: 'Cumpleaños Adultos' },
  { value: 'boda', label: 'Bodas' },
  { value: 'otro', label: 'Otro evento' },
];

export function GalleryManager() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/gallery').then(r => r.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async (item: GalleryItem) => {
    setSaving(item.id);
    await fetch('/api/gallery', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => {});
    setSaving(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este item de la galería?')) return;
    await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  const add = async () => {
    await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nuevo evento',
        image: '',
        eventType: 'otro',
        description: 'Descripción del evento',
        active: true,
      }),
    }).catch(() => {});
    load();
  };

  const update = (id: string, field: keyof GalleryItem, val: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  if (loading) return <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
            {item.image ? <img src={item.image} alt="" className="w-12 h-8 rounded object-cover" /> : <span className="text-lg">🖼️</span>}
            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{item.title || 'Sin título'}</span>
            <button onClick={() => save(item)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Guardar">
              {saving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Título</Label>
                <Input value={item.title} onChange={e => update(item.id, 'title', e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Tipo de evento</Label>
                <select value={item.eventType} onChange={e => update(item.id, 'eventType', e.target.value)} className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm">
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Imagen (URL o ruta)</Label>
              <Input value={item.image} onChange={e => update(item.id, 'image', e.target.value)} placeholder="/gallery-..." className="text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Descripción</Label>
              <Textarea value={item.description} onChange={e => update(item.id, 'description', e.target.value)} rows={2} className="text-sm" />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1.5" /> Añadir item a la galería
      </Button>
    </div>
  );
}
