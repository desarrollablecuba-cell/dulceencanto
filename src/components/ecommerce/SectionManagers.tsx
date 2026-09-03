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

/** Sube una imagen a /api/admin/gallery/upload y devuelve la URL servible. */
async function uploadGalleryImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
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
  const [error, setError] = useState<string>('');

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
    } catch (e: any) {
      alert(e?.message || 'No se pudo subir la portada');
    }
  };

  // ── Fotos ──
  const uploadPhotos = async (catId: string, files: FileList) => {
    setUploadingFor(catId);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadGalleryImage(file);
        const res = await fetch('/api/admin/gallery/photos', {
          method: 'POST',
          headers: adminAuthHeaders(true),
          body: JSON.stringify({ categoryId: catId, image: url, title: '' }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo guardar la foto');
        }
      }
      load();
    } catch (e: any) {
      alert(e?.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingFor(null);
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
                      📸 Fotos de eventos reales ({cat.photos.length})
                    </Label>
                    <label
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white cursor-pointer inline-flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', opacity: uploadingFor === cat.id ? 0.6 : 1 }}
                    >
                      {uploadingFor === cat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {uploadingFor === cat.id ? 'Subiendo…' : 'Añadir fotos'}
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
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/sections/upload', {
        method: 'POST',
        headers: adminAuthHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error al subir (${res.status})`);
      commit({ ...images, [id]: data.url });
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
