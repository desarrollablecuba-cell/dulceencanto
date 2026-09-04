'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, GripVertical, RefreshCw, Loader2, ImagePlus, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile } from '@/lib/compress-image';

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
//  GalleryManager — gestor de la galería por categorías (v2)
//
//  Cada categoría (15 Años, Bodas, Cumpleaños Infantiles…) tiene:
//    · Portada configurable (la imagen que se muestra en el grid público)
//    · N fotos de eventos reales que se ven en el carrusel con vista ampliada
//  CRUD completo vía /api/admin/gallery (categorías) y
//  /api/admin/gallery/photos (fotos). Subidas vía /api/admin/gallery/upload.
// ═══════════════════════════════════════════════════════════════════════════

interface GalleryPhoto {
  id: string;
  categoryId: string;
  image: string;
  title: string;
  description: string;
  order: number;
  active: boolean;
}

interface GalleryCat {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover: string;
  icon: string;
  order: number;
  active: boolean;
  photos: GalleryPhoto[];
}

const ADMIN_TOKEN_KEY = 'diaz-admin-token';

function adminAuthHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

/** Sube una imagen a /api/admin/gallery/upload y devuelve la URL servible.
 *  V52.5: comprime EN EL CLIENTE antes de enviar (fix del 502 con fotos de
 *  móvil de 8MB+) — la galería usa carruseles grandes → borde 1800px. */
async function uploadGalleryImage(file: File): Promise<string> {
  const compressed = await compressImageFile(file, { maxEdge: 1800, targetBytes: 900 * 1024 });
  const fd = new FormData();
  fd.append('file', compressed);
  const res = await fetch('/api/admin/gallery/upload', {
    method: 'POST',
    headers: adminAuthHeaders(),
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error al subir (${res.status})`);
  return data.url as string;
}

export function GalleryManager() {
  const [cats, setCats] = useState<GalleryCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  /** V52.5 — progreso de subida múltiple: { catId, done, total }. */
  const [progress, setProgress] = useState<{ catId: string; done: number; total: number } | null>(null);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch('/api/admin/gallery', { headers: adminAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCats(data);
          setError('');
        } else {
          setError(data?.error || 'No se pudo cargar la galería');
        }
      })
      .catch(() => setError('Error de conexión al cargar la galería'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const wrap = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); } catch (e: any) { alert(e?.message || 'Error'); }
    setBusy(null);
    load();
  };

  // ── Categorías ──
  const addCategory = () => wrap('add', async () => {
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: adminAuthHeaders(true),
      body: JSON.stringify({ name: 'Nueva categoría', description: 'Eventos de este tipo', icon: '🖼️' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setOpenId(data.id);
  });

  const saveCategory = (cat: GalleryCat) => wrap(`cat-${cat.id}`, async () => {
    const res = await fetch('/api/admin/gallery', {
      method: 'PUT',
      headers: adminAuthHeaders(true),
      body: JSON.stringify({ id: cat.id, name: cat.name, description: cat.description, cover: cat.cover, icon: cat.icon, active: cat.active, order: cat.order }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  const removeCategory = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}" y TODAS sus fotos? Esta acción no se puede deshacer.`)) return;
    wrap(`del-${id}`, async () => {
      const res = await fetch(`/api/admin/gallery?id=${id}`, { method: 'DELETE', headers: adminAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
    });
  };

  const uploadCover = async (catId: string, file: File) => {
    try {
      const url = await uploadGalleryImage(file);
      setCats((prev) => prev.map((c) => (c.id === catId ? { ...c, cover: url } : c)));
      await fetch('/api/admin/gallery', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ id: catId, cover: url }),
      });
      load();
      toast({ title: '🖼️ Portada actualizada', description: 'La nueva portada ya está visible en la tienda.', duration: 2500 });
    } catch (e: any) {
      alert(e?.message || 'No se pudo subir la portada');
    }
  };

  // ── Fotos ──
  const uploadPhotos = async (catId: string, files: FileList) => {
    const total = files.length;
    setUploadingFor(catId);
    setProgress({ catId, done: 0, total });
    try {
      let n = 0;
      let lastErr: string | null = null;
      for (let i = 0; i < total; i++) {
        setProgress({ catId, done: i, total });
        try {
          const url = await uploadGalleryImage(files[i]);
          const res = await fetch('/api/admin/gallery/photos', {
            method: 'POST',
            headers: adminAuthHeaders(true),
            body: JSON.stringify({ categoryId: catId, image: url, title: '' }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'No se pudo guardar la foto');
          }
          n++;
        } catch (e: any) {
          lastErr = e?.message || 'No se pudo subir una de las fotos';
        }
      }
      load();
      if (n > 0) {
        toast({
          title: `📷 ${n} ${n === 1 ? 'foto subida' : 'fotos subidas'} al carrusel`,
          description: 'Ya se muestran en la galería de la tienda (se comprimieron automáticamente).',
          duration: 3000,
        });
      }
      if (lastErr) {
        toast({
          title: `⚠️ ${total - n} ${total - n === 1 ? 'foto no se pudo subir' : 'fotos no se pudieron subir'}`,
          description: lastErr,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (e: any) {
      alert(e?.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingFor(null);
      setProgress(null);
    }
  };

  const removePhoto = (photoId: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    wrap(`ph-${photoId}`, async () => {
      const res = await fetch(`/api/admin/gallery/photos?id=${photoId}`, { method: 'DELETE', headers: adminAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
    });
  };

  const movePhoto = (photoId: string, direction: 'up' | 'down') => wrap(`mv-${photoId}`, async () => {
    await fetch('/api/admin/gallery/photos', {
      method: 'PATCH',
      headers: adminAuthHeaders(true),
      body: JSON.stringify({ id: photoId, direction }),
    });
  });

  const savePhotoTitle = (photo: GalleryPhoto, title: string) => {
    setCats((prev) => prev.map((c) => ({
      ...c,
      photos: c.photos.map((p) => (p.id === photo.id ? { ...p, title } : p)),
    })));
    // Guardado con debounce simple al blur — se llama desde onBlur
  };

  const commitPhotoTitle = (photo: GalleryPhoto) => wrap(`pt-${photo.id}`, async () => {
    await fetch('/api/admin/gallery/photos', {
      method: 'PUT',
      headers: adminAuthHeaders(true),
      body: JSON.stringify({ id: photo.id, title: photo.title }),
    });
  });

  const update = (id: string, field: keyof GalleryCat, val: any) => {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  };

  if (loading) return <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-brand" /></div>;

  if (error) {
    return (
      <div className="rounded-xl p-4 text-sm" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
        {error} — verifica que iniciaste sesión como administrador.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* V52.5 — guía de uso: el carrusel se llena expandiendo la categoría */}
      <div className="rounded-xl p-3 text-xs flex items-start gap-2.5" style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', color: '#9D174D' }}>
        <span className="text-base leading-none mt-0.5" aria-hidden>💡</span>
        <p className="leading-relaxed">
          Las fotos del <strong>carrusel</strong> de cada categoría (15 Años, Bodas…) se suben <strong>expandiendo la categoría</strong> (clic en su portada) y pulsando <strong>“Añadir fotos”</strong>. Puedes seleccionar varias a la vez — se comprimen automáticamente. La <strong>portada</strong> es la imagen grande que se ve en el grid público.
        </p>
      </div>
      {cats.map((cat) => {
        const isOpen = openId === cat.id;
        return (
          <div key={cat.id} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Cabecera de la categoría */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
              <button onClick={() => setOpenId(isOpen ? null : cat.id)} className="shrink-0" title={isOpen ? 'Contraer' : 'Expandir fotos'}>
                {cat.cover ? (
                  <img src={cat.cover} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-gray-200" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-gray-200">{cat.icon || '🖼️'}</div>
                )}
              </button>
              <button onClick={() => setOpenId(isOpen ? null : cat.id)} className="flex-1 min-w-0 text-left">
                <span className="text-sm font-semibold text-gray-700 block truncate">{cat.icon} {cat.name || 'Sin nombre'}</span>
                <span className="text-[11px] text-gray-400">{cat.photos.length} {cat.photos.length === 1 ? 'foto' : 'fotos'} · {cat.active ? 'visible' : 'oculta'}</span>
              </button>
              <button onClick={() => saveCategory(cat)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" title="Guardar cambios">
                {busy === `cat-${cat.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
              <button onClick={() => removeCategory(cat.id, cat.name)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Eliminar categoría">
                {busy === `del-${cat.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Edición de la categoría */}
            <div className="p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Portada */}
                <div className="shrink-0">
                  <Label className="text-xs text-gray-600">Portada (se ve en el grid público)</Label>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="w-28 h-20 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
                      {cat.cover ? (
                        <img src={cat.cover} alt="Portada" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-gray-400 px-2 text-center">Sin portada</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer text-center" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                        {busy === `cov-${cat.id}` ? '…' : 'Subir'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) { uploadCover(cat.id, f); }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {cat.cover && (
                        <button
                          onClick={() => { update(cat.id, 'cover', ''); saveCategory({ ...cat, cover: '' }); }}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Nombre / icono / descripción */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="grid grid-cols-[70px_1fr] gap-2">
                    <div>
                      <Label className="text-xs text-gray-600">Icono</Label>
                      <Input value={cat.icon} onChange={(e) => update(cat.id, 'icon', e.target.value)} className="text-sm h-9 text-center" maxLength={4} />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Nombre</Label>
                      <Input value={cat.name} onChange={(e) => update(cat.id, 'name', e.target.value)} className="text-sm h-9" placeholder="Ej: Quinceañeras" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Descripción</Label>
                    <Textarea value={cat.description} onChange={(e) => update(cat.id, 'description', e.target.value)} rows={2} className="text-sm" />
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={cat.active} onChange={(e) => update(cat.id, 'active', e.target.checked)} className="rounded" />
                    Visible en la tienda
                  </label>
                </div>
              </div>

              {/* Fotos del evento (expandible) */}
              {isOpen && (
                <div className="rounded-lg border border-dashed border-purple-200 p-3" style={{ background: '#FAF5FF' }}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold" style={{ color: '#7E22CE' }}>
                      📸 Fotos del carrusel de esta categoría ({cat.photos.length})
                    </Label>
                    <label
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white cursor-pointer inline-flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', opacity: uploadingFor === cat.id ? 0.6 : 1 }}
                    >
                      {uploadingFor === cat.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Plus className="h-3.5 w-3.5" />}
                      {uploadingFor === cat.id
                        ? (progress && progress.catId === cat.id
                            ? `Subiendo ${Math.min(progress.done + 1, progress.total)}/${progress.total}…`
                            : 'Preparando…')
                        : 'Añadir fotos al carrusel'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) uploadPhotos(cat.id, e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {/* Barra de progreso V52.5 */}
                  {uploadingFor === cat.id && progress && progress.catId === cat.id && (
                    <div className="mb-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#F3E8FF' }}>
                      <div className="h-full transition-all duration-300" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`, background: 'linear-gradient(90deg, #EC4899 0%, #A855F7 100%)' }} />
                    </div>
                  )}
                  {cat.photos.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">
                      Todavía no hay fotos. Sube imágenes de eventos reales de este tipo — se verán en el carrusel público.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {cat.photos.map((p, i) => (
                        <div key={p.id} className="rounded-lg overflow-hidden bg-white ring-1 ring-gray-200">
                          <div className="relative aspect-[4/3] bg-gray-100">
                            <img src={p.image} alt={p.title || 'Foto'} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute top-1 left-1 flex gap-0.5">
                              <button
                                onClick={() => movePhoto(p.id, 'up')}
                                disabled={i === 0 || busy === `mv-${p.id}`}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] text-white disabled:opacity-30"
                                style={{ background: 'rgba(46,16,101,0.65)' }}
                                title="Mover atrás"
                              >‹</button>
                              <button
                                onClick={() => movePhoto(p.id, 'down')}
                                disabled={i === cat.photos.length - 1 || busy === `mv-${p.id}`}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] text-white disabled:opacity-30"
                                style={{ background: 'rgba(46,16,101,0.65)' }}
                                title="Mover adelante"
                              >›</button>
                            </div>
                            <button
                              onClick={() => removePhoto(p.id)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                              style={{ background: 'rgba(220,38,38,0.75)' }}
                              title="Eliminar foto"
                            >
                              {busy === `ph-${p.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </button>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
                              #{i + 1}
                            </span>
                          </div>
                          <div className="p-1.5">
                            <input
                              value={p.title}
                              onChange={(e) => savePhotoTitle(p, e.target.value)}
                              onBlur={() => commitPhotoTitle(p)}
                              placeholder="Título (opcional)"
                              className="w-full text-[11px] px-1.5 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={addCategory} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1.5" /> Añadir categoría a la galería
      </Button>
      <p className="text-[11px] text-gray-400 text-center">
        Las fotos se optimizan automáticamente a WebP. Los clientes las verán en un carrusel con vista ampliada dentro de cada categoría.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SectionImagesEditor — imágenes de las secciones del home (configurables)
//
//  Cada sección (Venta Directa, Reservas, Servicios, Promociones, Galería)
//  muestra una imagen grande en el home y en el banner de su página. Por
//  defecto están sembradas en la BD (SiteConfig.sectionImages) y aquí el
//  negocio puede reemplazarlas por sus propias fotos o restaurar las
//  originales. Subida vía /api/admin/sections/upload.
// ═══════════════════════════════════════════════════════════════════════════

const SECTION_IMAGE_META: { id: string; label: string; icon: string; fallback: string }[] = [
  { id: 'immediate', label: 'Venta Directa', icon: '🛒', fallback: '/card-venta-directa.webp' },
  { id: 'reservations', label: 'Reservas de Tartas y Pasteles', icon: '📅', fallback: '/card-reservas.webp' },
  { id: 'services', label: 'Servicios para Eventos', icon: '🎨', fallback: '/card-servicios.webp' },
  { id: 'promotions', label: 'Promociones Especiales', icon: '💝', fallback: '/card-promociones.webp' },
  { id: 'gallery', label: 'Galería de Eventos', icon: '🖼️', fallback: '/card-galeria.webp' },
];

export function SectionImagesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  let images: Record<string, string> = {};
  try {
    const parsed = JSON.parse(value || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) images = parsed;
  } catch { /* defaults */ }

  const currentFor = (id: string, fallback: string) => {
    const v = images[id];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback;
  };

  const commit = (next: Record<string, string>) => {
    onChange(JSON.stringify(next));
  };

  const upload = async (id: string, file: File) => {
    setUploading(id);
    try {
      // V52.5: comprimir en el cliente antes de subir (fix 502)
      const compressed = await compressImageFile(file, { maxEdge: 1600, targetBytes: 800 * 1024 });
      const fd = new FormData();
      fd.append('file', compressed);
      const res = await fetch('/api/admin/sections/upload', {
        method: 'POST',
        headers: adminAuthHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error al subir (${res.status})`);
      commit({ ...images, [id]: data.url });
      toast({ title: '🖼️ Imagen de sección actualizada', description: 'Se guarda al pulsar “Guardar Cambios”.', duration: 2500 });
    } catch (e: any) {
      alert(e?.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(null);
    }
  };

  const reset = (id: string) => {
    const next = { ...images };
    delete next[id];
    commit(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Estas son las imágenes grandes que representan cada sección en el inicio y en el banner al entrar. Por defecto están las sembradas en la BD — súbelas con tus propias fotos si lo prefieres.
      </p>
      {SECTION_IMAGE_META.map((sec) => {
        const url = currentFor(sec.id, sec.fallback);
        // "Personalizada" solo si el valor en la BD difiere de la imagen por defecto
        const isCustom = Boolean(images[sec.id]) && images[sec.id] !== sec.fallback;
        return (
          <div key={sec.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200" style={{ background: isCustom ? '#F0FDF4' : '#FAFAFA' }}>
            <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 shrink-0">
              <img src={url} alt={sec.label} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700 truncate">{sec.icon} {sec.label}</p>
              <p className="text-[11px] text-gray-400 truncate">{isCustom ? 'Imagen personalizada ✓' : 'Imagen por defecto (sembrada en la BD)'}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <label
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer text-center"
                style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', opacity: uploading === sec.id ? 0.6 : 1 }}
              >
                {uploading === sec.id ? 'Subiendo…' : 'Subir imagen'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(sec.id, f);
                    e.target.value = '';
                  }}
                />
              </label>
              {isCustom && (
                <button
                  onClick={() => reset(sec.id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
                >
                  Restaurar
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-gray-400">
        Recuerda pulsar <strong>Guardar</strong> para aplicar los cambios. “Restaurar” devuelve la imagen sembrada por defecto.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ServicesManager — CRUD de Servicios para Eventos (V52.5 refactorizado)
//
//  · Cards verticales con imagen protagonista (foto real del negocio).
//  · Precio SOLO EN USD (petición del negocio) — el CUP se deriva
//    automáticamente (price = priceUsd × 700) y se muestra como referencia
//    de solo lectura.
//  · Toggle "Servicio con variantes": activa el editor de variantes, donde
//    cada variante tiene NOMBRE + FOTO propia (+ precio USD opcional).
//    Ej: Muñeco Sorpresa → Payasita / Conejo Chispa / Coneja Maricusa.
//  · Subidas comprimidas EN EL CLIENTE (fix del 502 con fotos de 8MB+).
//
//  API: /api/admin/services (requiere admin).
// ═══════════════════════════════════════════════════════════════════════════

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  price: number;
  priceUsd: number;
  category: string;
  active: boolean;
  order: number;
  variants: ServiceVariantRow[];
}

interface ServiceVariantRow {
  id: string;
  name: string;
  image: string;
  priceUsd: number;
  active: boolean;
  order: number;
}

const SERVICE_CATEGORIES = [
  { value: 'decoracion', label: '🎨 Decoración' },
  { value: 'entretenimiento', label: '🎪 Entretenimiento' },
  { value: 'personalizado', label: '✨ Personalizado' },
  { value: 'suenos_sorpresa', label: '🙀 Sueños Sorpresa' },
];

/** Tasa de referencia para mostrar el CUP derivado (solo informativo). */
const USD_RATE = 700;

/** Parsea variants del servicio (string JSON del backend o array ya parseado). */
function toVariantRows(raw: unknown): ServiceVariantRow[] {
  if (Array.isArray(raw)) {
    return raw.map((v: any, i) => ({
      id: String(v?.id || `var-${Date.now().toString(36)}-${i}`),
      name: String(v?.name || ''),
      image: String(v?.image || ''),
      priceUsd: Number(v?.priceUsd) || 0,
      active: v?.active !== false,
      order: Number.isFinite(Number(v?.order)) ? Number(v.order) : i,
    }));
  }
  if (typeof raw === 'string' && raw.trim()) {
    try { return toVariantRows(JSON.parse(raw)); } catch { return []; }
  }
  return [];
}

const newVariantId = () => `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Sube la imagen de un servicio (o variante) a /api/admin/services/upload.
 *  V52.5: comprime EN EL CLIENTE antes de enviar (fix del 502 con fotos de
 *  móvil de 8MB+) → borde 1600px, objetivo ~800KB. */
async function uploadServiceImage(file: File): Promise<string> {
  const compressed = await compressImageFile(file, { maxEdge: 1600, targetBytes: 800 * 1024 });
  const fd = new FormData();
  fd.append('file', compressed);
  const res = await fetch('/api/admin/services/upload', {
    method: 'POST',
    headers: adminAuthHeaders(),
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error al subir (${res.status})`);
  return data.path as string;
}

export function ServicesManager() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch('/api/admin/services', { headers: adminAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setServices(data.map((s: any) => ({ ...s, variants: toVariantRows(s.variants) })));
        else setError(data?.error || 'Respuesta inválida');
      })
      .catch(() => setError('No se pudieron cargar los servicios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const patch = (id: string, fields: Partial<ServiceRow>) =>
    setServices((list) => list.map((s) => (s.id === id ? { ...s, ...fields } : s)));

  const save = async (svc: ServiceRow) => {
    setSaving(svc.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify(svc),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  const addService = async () => {
    const draft: ServiceRow = {
      id: '',
      name: 'Nuevo servicio',
      description: 'Describe el servicio para eventos…',
      icon: '✨',
      image: '',
      price: 0,
      priceUsd: 2,
      category: 'decoracion',
      active: true,
      order: (services.length ? Math.max(...services.map((s) => s.order)) + 1 : 0),
      variants: [],
    };
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: adminAuthHeaders(true),
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setServices((list) => [...list, { ...draft, ...data, variants: toVariantRows(data.variants) }]);
    } catch (e: any) {
      setError(e?.message || 'Error al crear el servicio');
    }
  };

  const removeService = async (svc: ServiceRow) => {
    if (!confirm(`¿Eliminar "${svc.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/admin/services?id=${encodeURIComponent(svc.id)}`, {
        method: 'DELETE',
        headers: adminAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setServices((list) => list.filter((s) => s.id !== svc.id));
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar');
    }
  };

  const move = async (svc: ServiceRow, dir: -1 | 1) => {
    const sorted = [...services].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === svc.id);
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[j];
    patch(a.id, { order: b.order });
    patch(b.id, { order: a.order });
    await Promise.all([
      fetch('/api/admin/services', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify({ ...a, order: b.order }) }),
      fetch('/api/admin/services', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify({ ...b, order: a.order }) }),
    ]);
    load();
  };

  const uploadImg = async (svc: ServiceRow, file: File) => {
    setUploadingId(svc.id);
    setError(null);
    try {
      const path = await uploadServiceImage(file);
      patch(svc.id, { image: path });
      // Auto-guardar la imagen al subirla
      await fetch('/api/admin/services', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ ...svc, image: path }),
      });
      toast({ title: '🖼️ Foto del servicio actualizada', description: `${svc.name} — guardada y visible en la tienda.`, duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al subir la imagen');
    } finally {
      setUploadingId(null);
    }
  };

  // ── Variantes ──
  const hasVariants = (svc: ServiceRow) => svc.variants.length > 0;

  const toggleVariants = (svc: ServiceRow) => {
    if (hasVariants(svc)) {
      if (!confirm('¿Quitar TODAS las variantes de este servicio? Volverá a mostrarse como un servicio simple.')) return;
      const next = { ...svc, variants: [] };
      patch(svc.id, { variants: [] });
      save(next);
      return;
    }
    const first: ServiceVariantRow = { id: newVariantId(), name: '', image: '', priceUsd: 0, active: true, order: 0 };
    patch(svc.id, { variants: [first] });
  };

  const patchVariant = (svcId: string, varId: string, fields: Partial<ServiceVariantRow>) =>
    setServices((list) => list.map((s) => (s.id === svcId
      ? { ...s, variants: s.variants.map((v) => (v.id === varId ? { ...v, ...fields } : v)) }
      : s)));

  const addVariant = (svc: ServiceRow) => {
    const next = [...svc.variants, { id: newVariantId(), name: '', image: '', priceUsd: 0, active: true, order: svc.variants.length }];
    patch(svc.id, { variants: next });
  };

  const removeVariant = (svc: ServiceRow, varId: string) => {
    patch(svc.id, { variants: svc.variants.filter((v) => v.id !== varId).map((v, i) => ({ ...v, order: i })) });
  };

  const moveVariant = (svc: ServiceRow, varId: string, dir: -1 | 1) => {
    const arr = [...svc.variants].sort((a, b) => a.order - b.order);
    const idx = arr.findIndex((v) => v.id === varId);
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    patch(svc.id, { variants: arr.map((v, i) => ({ ...v, order: i })) });
  };

  const uploadVariantImg = async (svc: ServiceRow, varId: string, file: File) => {
    setUploadingVariant(varId);
    setError(null);
    try {
      const path = await uploadServiceImage(file);
      patchVariant(svc.id, varId, { image: path });
      toast({ title: '🖼️ Foto de la variante lista', description: 'Pulsa Guardar para aplicarla en la tienda.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al subir la imagen de la variante');
    } finally {
      setUploadingVariant(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…
      </div>
    );
  }

  const sorted = [...services].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {sorted.length} {sorted.length === 1 ? 'servicio' : 'servicios'} · precio en <strong>USD</strong> (el CUP se calcula solo) · la foto es la protagonista de la card
        </p>
        <Button variant="outline" size="sm" type="button" onClick={addService}>
          <Plus className="h-4 w-4 mr-1" /> Agregar servicio
        </Button>
      </div>

      {sorted.length === 0 && (
        <p className="text-xs text-gray-400 italic">Sin servicios — agrega el primero.</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {sorted.map((s) => {
          const vOn = hasVariants(s);
          return (
          <div key={s.id} className={`rounded-lg border p-3 space-y-2 ${s.active ? 'border-pink-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
            <div className="flex gap-3">
              {/* Imagen protagonista (preview vertical 3:4) */}
              <div className="relative w-24 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100" style={{ aspectRatio: '3 / 4' }}>
                {s.image ? (
                   
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">{s.icon || '✨'}</div>
                )}
                {uploadingId === s.id && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
                  </div>
                )}
                {vOn && s.variants.length > 0 && (
                  <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white text-center" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                    {s.variants.length} {s.variants.length === 1 ? 'variante' : 'variantes'}
                  </span>
                )}
              </div>
              {/* Campos */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex gap-2 items-center">
                  <Input
                    value={s.icon}
                    onChange={(e) => patch(s.id, { icon: e.target.value.slice(0, 4) })}
                    className="w-12 text-center h-8"
                    aria-label="Emoji"
                  />
                  <Input
                    value={s.name}
                    onChange={(e) => patch(s.id, { name: e.target.value })}
                    className="flex-1 h-8 text-xs font-semibold"
                    placeholder="Nombre del servicio"
                  />
                  <Button
                    variant="ghost" size="icon" type="button"
                    className="text-red-500 hover:bg-red-50 shrink-0 h-8 w-8"
                    onClick={() => removeService(s)}
                    aria-label="Eliminar servicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={s.description}
                  onChange={(e) => patch(s.id, { description: e.target.value })}
                  className="min-h-[52px] text-xs"
                  placeholder="Descripción"
                />
                <div className="flex gap-2 flex-wrap items-center">
                  {/* V52.5 — precio SOLO en USD (el CUP se deriva ×700) */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-500">$ USD</span>
                    <Input
                      type="number" min={0} step="0.01"
                      value={s.priceUsd}
                      onChange={(e) => patch(s.id, { priceUsd: Number(e.target.value) || 0 })}
                      className="w-24 h-8 text-xs"
                      aria-label="Precio USD"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400" title="El precio en pesos se calcula automáticamente con la tasa 1 USD = 700 CUP">
                    ≈ ₱{Math.round((s.priceUsd || 0) * USD_RATE).toLocaleString('es-CU')} CUP (auto)
                  </span>
                  <select
                    value={s.category}
                    onChange={(e) => patch(s.id, { category: e.target.value })}
                    className="rounded-md border border-gray-300 bg-white px-2 h-8 text-xs"
                    aria-label="Categoría"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ⭐ Toggle: servicio con variantes (V52.5) */}
            <div className="rounded-lg border p-2.5" style={{ background: vOn ? '#FDF2F8' : '#FAFAFA', borderColor: vOn ? '#FBCFE8' : '#F3F4F6' }}>
              <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: vOn ? '#BE185D' : '#6B7280' }}>
                  <span aria-hidden>🎭</span>
                  {vOn ? 'Servicio CON variantes' : 'Servicio con variantes'}
                  {vOn && <span className="font-normal text-[10px] text-gray-400">(cada una con su foto y nombre)</span>}
                </span>
                <input
                  type="checkbox"
                  checked={vOn}
                  onChange={() => toggleVariants(s)}
                  className="accent-pink-600 h-4 w-4"
                  aria-label={`Activar variantes para ${s.name}`}
                />
              </label>

              {vOn && (
                <div className="mt-2.5 space-y-2">
                  {s.variants.length === 0 && (
                    <p className="text-[11px] text-gray-400 italic">Agrega la primera variante (ej: Payasita, Conejo Chispa…).</p>
                  )}
                  {s.variants.map((v, i) => (
                    <div key={v.id} className="flex gap-2 items-center rounded-lg border border-gray-200 bg-white p-1.5">
                      {/* Foto de la variante */}
                      <div className="relative w-12 h-14 shrink-0 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                        {v.image ? (
                           
                          <img src={v.image} alt={v.name || 'Variante'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 text-center px-0.5">sin foto</div>
                        )}
                        {uploadingVariant === v.id && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-600" />
                          </div>
                        )}
                      </div>
                      <label className="shrink-0 px-2 py-1 rounded-md text-[10px] font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} title="Subir foto de la variante (se comprime automáticamente)">
                        {v.image ? 'Cambiar' : 'Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadVariantImg(s, v.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {/* Nombre + precio opcional */}
                      <div className="flex-1 min-w-0 flex gap-1.5">
                        <Input
                          value={v.name}
                          onChange={(e) => patchVariant(s.id, v.id, { name: e.target.value })}
                          placeholder="Nombre (ej: Payasita)"
                          className="h-7 text-xs flex-1"
                          aria-label="Nombre de la variante"
                        />
                        <div className="flex items-center gap-0.5 shrink-0" title="Precio USD opcional — vacío (0) usa el precio del servicio">
                          <span className="text-[10px] text-gray-400">$</span>
                          <Input
                            type="number" min={0} step="0.01"
                            value={v.priceUsd || ''}
                            onChange={(e) => patchVariant(s.id, v.id, { priceUsd: Number(e.target.value) || 0 })}
                            placeholder="auto"
                            className="w-16 h-7 text-xs"
                            aria-label="Precio USD de la variante (opcional)"
                          />
                        </div>
                      </div>
                      {/* Acciones */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveVariant(s, v.id, -1)} disabled={i === 0} className="text-gray-400 hover:text-purple-700 disabled:opacity-25" aria-label="Subir variante" title="Subir orden">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => moveVariant(s, v.id, 1)} disabled={i === s.variants.length - 1} className="text-gray-400 hover:text-purple-700 disabled:opacity-25" aria-label="Bajar variante" title="Bajar orden">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <label className="shrink-0 flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer" title={v.active ? 'Visible en la tienda' : 'Oculta'}>
                        <input
                          type="checkbox"
                          checked={v.active}
                          onChange={(e) => patchVariant(s.id, v.id, { active: e.target.checked })}
                          className="accent-green-600 h-3.5 w-3.5"
                          aria-label={`Variante ${v.name || i + 1} visible`}
                        />
                        {v.active ? '👁' : '🚫'}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeVariant(s, v.id)}
                        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50"
                        aria-label="Eliminar variante"
                        title="Eliminar variante"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addVariant(s)}
                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-dashed border-pink-300 text-pink-600 hover:bg-pink-50"
                  >
                    <Plus className="h-3 w-3" /> Agregar variante
                  </button>
                  <p className="text-[10px] text-gray-400">
                    Ej: Servicio <em>Muñeco Sorpresa</em> → variantes <em>Payasita</em>, <em>Conejo Chispa</em>, <em>Coneja Maricusa</em>. El cliente verá las fotos y elegirá al reservar.
                  </p>
                </div>
              )}
            </div>

            {/* Acciones: foto, activo, orden, guardar */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
              <label className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && s.id) uploadImg(s, file);
                    e.target.value = '';
                  }}
                />
                <ImagePlus className="h-3.5 w-3.5" /> {s.image ? 'Cambiar foto' : 'Subir foto'}
              </label>
              {s.image && (
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-red-500 bg-red-50 hover:bg-red-100"
                  onClick={() => { patch(s.id, { image: '' }); }}
                >
                  Quitar foto
                </button>
              )}
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={(e) => { patch(s.id, { active: e.target.checked }); setTimeout(() => { const row = services.find((x) => x.id === s.id); if (row) save({ ...row, active: e.target.checked }); }, 0); }}
                  className="accent-green-600 h-4 w-4"
                />
                {s.active ? 'Visible' : 'Oculto'}
              </label>
              <div className="flex flex-col gap-0.5 ml-auto">
                <Button variant="ghost" size="icon" type="button" className="h-5 w-5" onClick={() => move(s, -1)} aria-label="Subir" title="Subir orden">
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" type="button" className="h-5 w-5" onClick={() => move(s, 1)} aria-label="Bajar" title="Bajar orden">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <Button size="sm" type="button" className="h-8" onClick={() => save(s)} disabled={saving === s.id}>
                {saving === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400">
        Recuerda pulsar <strong>Guardar</strong> tras editar textos, precios o variantes. Las fotos se comprimen automáticamente al subirlas (ya no hay error 502 con fotos de móvil).
      </p>
    </div>
  );
}
