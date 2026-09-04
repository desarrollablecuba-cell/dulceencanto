'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile } from '@/lib/compress-image';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Search, Eye, EyeOff,
  ImagePlus, Images, CheckCircle2, Camera, Replace, Pencil, PartyPopper, Crown, Baby, Heart,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
//  V52.9 — GalleryTab: la Galería de Eventos como SECCIÓN PROPIA del admin.
//
//  Antes estaba escondida en Ajustes → Secciones. Ahora tiene su lugar en el
//  menú lateral y un editor completo en dos vistas (como Servicios/Productos):
//   · LISTA: cards por categoría con portada + nº de fotos + estado.
//   · DETALLE: overlay a pantalla completa → datos de la categoría
//     (nombre, icono, descripción, portada, visibilidad) + gestor de FOTOS:
//     agregar varias de golpe (con progreso), editar título y descripción,
//     reemplazar la imagen, ocultar sin borrar, reordenar y eliminar.
//
//  API: /api/admin/gallery (cat CRUD) · /photos (foto CRUD) · /upload.
// ═══════════════════════════════════════════════════════════════════════════

interface GalleryPhoto {
  id: string;
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

/** Sube una foto de la galería comprimida EN EL CLIENTE (fix 502). */
async function uploadGalleryImage(file: File): Promise<string> {
  const compressed = await compressImageFile(file, { maxEdge: 1800, targetBytes: 900 * 1024 });
  const fd = new FormData();
  fd.append('file', compressed);
  const res = await fetch('/api/admin/gallery/upload', { method: 'POST', headers: adminAuthHeaders(), body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error al subir (${res.status})`);
  return data.url as string;
}

export function GalleryTab() {
  const [cats, setCats] = useState<GalleryCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  // ── Vista detalle de categoría ──
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GalleryCat | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  // Progreso de subida múltiple de fotos
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Subida de portada / reemplazo de foto individual
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/gallery', { headers: adminAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) { setCats(data); setError(null); }
        else setError(data?.error || 'No se pudo cargar la galería');
      })
      .catch(() => setError('Error de conexión al cargar la galería'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...cats].sort((a, b) => a.order - b.order), [cats]);
  const totalPhotos = useMemo(() => cats.reduce((n, c) => n + c.photos.length, 0), [cats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q) || c.photos.some((p) => (p.title + ' ' + p.description).toLowerCase().includes(q)));
  }, [sorted, search]);

  // ── Categorías ──
  const openCategory = (c: GalleryCat) => {
    setDraft({ ...c, photos: c.photos.map((p) => ({ ...p })) });
    setOpenCatId(c.id);
    setSavedFeedback(null);
    window.scrollTo({ top: 0 });
  };

  const addCategory = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ name: 'Nueva categoría', description: 'Eventos de este tipo', icon: '🖼️' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const created: GalleryCat = { ...data, photos: [] };
      setCats((l) => [...l, created]);
      openCategory(created);
      toast({ title: '🖼️ Categoría creada', description: 'Ahora agrega fotos de eventos reales.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = (c: GalleryCat) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}" y TODAS sus ${c.photos.length} fotos? Esta acción no se puede deshacer.`)) return;
    setBusy(`del-${c.id}`);
    fetch(`/api/admin/gallery?id=${c.id}`, { method: 'DELETE', headers: adminAuthHeaders() })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.error); }))
      .then(() => setCats((l) => l.filter((x) => x.id !== c.id)))
      .catch((e) => setError(e?.message || 'Error al eliminar'))
      .finally(() => setBusy(null));
  };

  const moveCategory = async (c: GalleryCat, dir: -1 | 1) => {
    const idx = sorted.findIndex((x) => x.id === c.id);
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[j];
    setCats((l) => l.map((x) => (x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x)));
    await Promise.all([
      fetch('/api/admin/gallery', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify({ id: a.id, order: b.order }) }),
      fetch('/api/admin/gallery', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify({ id: b.id, order: a.order }) }),
    ]);
    load();
  };

  // ── Guardar categoría (detalle) ──
  const saveCategory = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({
          id: draft.id, name: draft.name, description: draft.description,
          cover: draft.cover, icon: draft.icon, active: draft.active, order: draft.order,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = { ...draft };
      setCats((l) => l.map((x) => (x.id === draft.id ? updated : x)));
      setSavedFeedback(`✓ Categoría "${draft.name}" guardada.`);
      setTimeout(() => setSavedFeedback(null), 4000);
      toast({ title: '✓ Categoría guardada', description: draft.name, duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const closeCategory = () => { setOpenCatId(null); setDraft(null); setSavedFeedback(null); load(); };

  // ── Portada ──
  const uploadCover = async (file: File) => {
    if (!draft) return;
    setUploadingField('cover');
    try {
      const url = await uploadGalleryImage(file);
      setDraft((d) => (d ? { ...d, cover: url } : d));
      // Auto-guardar la portada
      await fetch('/api/admin/gallery', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ id: draft.id, cover: url }),
      });
      toast({ title: '🖼️ Portada actualizada', description: 'La nueva portada ya está visible en la tienda.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'No se pudo subir la portada');
    } finally {
      setUploadingField(null);
    }
  };

  // ── Fotos: agregar (múltiple con progreso) ──
  const addPhotos = async (files: FileList) => {
    if (!draft) return;
    const total = files.length;
    setProgress({ done: 0, total });
    try {
      let n = 0;
      let lastErr: string | null = null;
      const added: GalleryPhoto[] = [];
      for (let i = 0; i < total; i++) {
        setProgress({ done: i, total });
        try {
          const url = await uploadGalleryImage(files[i]);
          const res = await fetch('/api/admin/gallery/photos', {
            method: 'POST',
            headers: adminAuthHeaders(true),
            body: JSON.stringify({ categoryId: draft.id, image: url, title: '', description: '' }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'No se pudo guardar la foto');
          }
          const photo = await res.json();
          added.push(photo);
          n++;
        } catch (e: any) {
          lastErr = e?.message || 'No se pudo subir una de las fotos';
        }
      }
      if (added.length) setDraft((d) => (d ? { ...d, photos: [...d.photos, ...added] } : d));
      if (n > 0) {
        toast({
          title: `📷 ${n} ${n === 1 ? 'foto agregada' : 'fotos agregadas'}`,
          description: 'Ya se muestran en el carrusel de la tienda (comprimidas automáticamente).',
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
    } finally {
      setProgress(null);
    }
  };

  // ── Fotos: editar (título/descripción/activa) ──
  const patchPhoto = (photoId: string, fields: Partial<GalleryPhoto>) => {
    setDraft((d) => (d ? { ...d, photos: d.photos.map((p) => (p.id === photoId ? { ...p, ...fields } : p)) } : d));
  };

  const commitPhoto = async (photo: GalleryPhoto) => {
    setBusy(`ph-${photo.id}`);
    try {
      const res = await fetch('/api/admin/gallery/photos', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ id: photo.id, title: photo.title, description: photo.description, active: photo.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar la foto');
      }
      // Sincroniza la lista general con la foto editada (título/desc/activa)
      setCats((l) => l.map((c) => ({
        ...c,
        photos: c.photos.map((p) => (p.id === photo.id ? { ...p, title: photo.title, description: photo.description, active: photo.active } : p)),
      })));
    } catch (e: any) {
      setError(e?.message || 'Error al guardar la foto');
    } finally {
      setBusy(null);
    }
  };

  const togglePhotoActive = (photo: GalleryPhoto) => {
    const next = { ...photo, active: !photo.active };
    patchPhoto(photo.id, { active: next.active });
    commitPhoto(next);
  };

  const replacePhotoImage = async (photo: GalleryPhoto, file: File) => {
    setUploadingField(`img-${photo.id}`);
    try {
      const url = await uploadGalleryImage(file);
      const next = { ...photo, image: url };
      patchPhoto(photo.id, { image: url });
      const res = await fetch('/api/admin/gallery/photos', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ id: photo.id, image: url }),
      });
      if (!res.ok) throw new Error('No se pudo reemplazar la imagen');
      toast({ title: '🔄 Foto reemplazada', description: next.title || 'La imagen se actualizó al instante.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al reemplazar la imagen');
    } finally {
      setUploadingField(null);
    }
  };

  const removePhoto = (photo: GalleryPhoto) => {
    if (!confirm('¿Eliminar esta foto de la galería?')) return;
    setBusy(`del-${photo.id}`);
    fetch(`/api/admin/gallery/photos?id=${photo.id}`, { method: 'DELETE', headers: adminAuthHeaders() })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.error); }))
      .then(() => setDraft((d) => (d ? { ...d, photos: d.photos.filter((p) => p.id !== photo.id) } : d)))
      .catch((e) => setError(e?.message || 'Error al eliminar la foto'))
      .finally(() => setBusy(null));
  };

  const movePhoto = async (photo: GalleryPhoto, direction: 'up' | 'down') => {
    setBusy(`mv-${photo.id}`);
    try {
      await fetch('/api/admin/gallery/photos', {
        method: 'PATCH',
        headers: adminAuthHeaders(true),
        body: JSON.stringify({ id: photo.id, direction }),
      });
      // Reordenar localmente para feedback inmediato
      setDraft((d) => {
        if (!d) return d;
        const arr = [...d.photos];
        const idx = arr.findIndex((p) => p.id === photo.id);
        const j = direction === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= arr.length) return d;
        [arr[idx], arr[j]] = [arr[j], arr[idx]];
        return { ...d, photos: arr.map((p, i) => ({ ...p, order: i })) };
      });
    } finally {
      setBusy(null);
    }
  };

  // ════════════════════════════ RENDER ════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando galería…
      </div>
    );
  }

  // ── VISTA DETALLE DE CATEGORÍA (overlay a pantalla completa) ──
  if (openCatId && draft) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
        {/* Barra superior */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center gap-2 shadow-sm shrink-0">
          <Button variant="ghost" onClick={closeCategory} className="text-gray-700 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate flex items-center gap-2">
              <Images className="h-4 w-4 text-purple-600 shrink-0" />
              {draft.icon} {draft.name || 'Categoría'}
            </h1>
            <p className="text-xs text-gray-500 truncate hidden md:block">
              {draft.photos.length} {draft.photos.length === 1 ? 'foto' : 'fotos'} · {draft.active ? 'visible en la tienda' : 'oculta'} · /galería/{draft.slug}
            </p>
          </div>
          <Badge variant="outline" className={draft.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:inline-flex' : 'bg-gray-100 text-gray-500 border-gray-200 hidden sm:inline-flex'}>
            {draft.active ? '👁 Visible' : '🚫 Oculta'}
          </Badge>
          <Button variant="outline" onClick={closeCategory} className="hidden sm:inline-flex">Cancelar</Button>
          <Button onClick={saveCategory} disabled={saving} style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} className="text-white hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>

        {/* Banner de feedback / error */}
        {savedFeedback && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="flex-1">{savedFeedback}</span>
            <button type="button" onClick={() => setSavedFeedback(null)} className="text-green-600 hover:text-green-800 text-xs" aria-label="Cerrar aviso">✕</button>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200 text-sm text-red-700">
            <span className="flex-1">⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-500 text-xs" aria-label="Cerrar error">✕</button>
          </div>
        )}

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto bg-gray-50 nice-scroll">
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-8">

            {/* ── Datos de la categoría + portada ── */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Datos de la categoría</h2>
              <p className="text-sm text-gray-500 mb-6">La portada es la imagen grande del grid público; el icono y el nombre acompañan a las fotos.</p>
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                {/* Portada */}
                <div className="space-y-3">
                  <Label className="text-gray-700 font-semibold">Portada</Label>
                  <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-purple-200 bg-white" style={{ aspectRatio: '4 / 3' }}>
                    {draft.cover ? (
                      <img src={draft.cover} alt={`Portada de ${draft.name}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
                        <Camera className="h-10 w-10" />
                        <span className="text-xs">Sin portada</span>
                      </div>
                    )}
                    {uploadingField === 'cover' && (
                      <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <span className="text-xs font-semibold text-gray-600">Subiendo portada…</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer text-center transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                      <ImagePlus className="h-3.5 w-3.5 inline mr-1" />
                      {draft.cover ? 'Cambiar portada' : 'Subir portada'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadCover(f);
                        e.target.value = '';
                      }} />
                    </label>
                    {draft.cover && (
                      <button type="button" onClick={() => setDraft((d) => (d ? { ...d, cover: '' } : d))} className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100">
                        Quitar
                      </button>
                    )}
                  </div>
                  <label className="flex items-center justify-between gap-2 cursor-pointer select-none rounded-xl border border-gray-200 bg-white p-3">
                    <span className="text-sm text-gray-600">{draft.active ? '👁 Visible en la tienda' : '🚫 Oculta para clientes'}</span>
                    <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => (d ? { ...d, active: e.target.checked } : d))} className="accent-green-600 h-4 w-4" aria-label="Categoría visible" />
                  </label>
                </div>

                {/* Campos */}
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="w-16 shrink-0">
                      <Label>Icono</Label>
                      <Input value={draft.icon} onChange={(e) => setDraft((d) => (d ? { ...d, icon: e.target.value.slice(0, 4) } : d))} className="text-center h-10 text-lg" aria-label="Emoji de la categoría" />
                    </div>
                    <div className="flex-1">
                      <Label>Nombre de la categoría</Label>
                      <Input value={draft.name} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} className="h-10 font-semibold" placeholder="Ej: Quinceañeras" />
                    </div>
                    <div className="w-24">
                      <Label>Orden</Label>
                      <Input type="number" value={draft.order} onChange={(e) => setDraft((d) => (d ? { ...d, order: Number(e.target.value) || 0 } : d))} className="h-10" aria-label="Orden de la categoría" />
                    </div>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea value={draft.description} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} rows={3} className="text-sm" placeholder="Ej: Fiestas de 15 personalizadas — dulces, decoración y entretenimiento." />
                    <p className="text-[11px] text-gray-400 mt-1">Se muestra debajo del nombre en la tienda.</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #FDF2F8 0%, #FAF5FF 100%)', border: '2px solid #FBCFE8' }}>
                    <p className="text-xs" style={{ color: '#9D174D' }}>
                      💡 <strong>Consejo:</strong> usa fotos <strong>reales</strong> de tus eventos (fiestas de 15, cumpleaños infantiles, bodas…). Los clientes las ven en un carrusel con vista ampliada — la autenticidad vende más que las fotos de catálogo.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Fotos de la categoría ── */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fotos de eventos reales ({draft.photos.length})</h2>
                  <p className="text-sm text-gray-500">Agrega, edita, oculta o elimina las fotos del carrusel de esta categoría.</p>
                </div>
                <label
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer inline-flex items-center gap-1.5 shadow"
                  style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}
                >
                  {progress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {progress
                    ? (progress.total > 1 ? `Subiendo ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : 'Subiendo…')
                    : 'Agregar fotos'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) addPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {/* Barra de progreso */}
              {progress && (
                <div className="mb-3 h-2 rounded-full overflow-hidden" style={{ background: '#F3E8FF' }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`, background: 'linear-gradient(90deg, #EC4899 0%, #A855F7 100%)' }} />
                </div>
              )}

              {draft.photos.length === 0 && !progress ? (
                <div className="rounded-2xl border-2 border-dashed border-purple-200 p-10 text-center" style={{ background: '#FAF5FF' }}>
                  <Camera className="h-10 w-10 text-purple-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-2">Todavía no hay fotos en esta categoría.</p>
                  <p className="text-xs text-gray-400">Sube imágenes de eventos reales — fiestas de 15, cumpleaños infantiles…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {draft.photos.map((p, i) => (
                    <div key={p.id} className={`rounded-2xl overflow-hidden bg-white border ${p.active ? 'border-gray-200' : 'border-gray-200 opacity-60'} shadow-sm`}>
                      {/* Imagen con acciones */}
                      <div className="relative aspect-[4/3] bg-gray-100 group">
                        <img src={p.image} alt={p.title || `Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        {uploadingField === `img-${p.id}` && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-black/50">#{i + 1}</span>
                        {!p.active && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-black/60">🚫 Oculta</span>
                        )}
                        {/* Overlay de acciones */}
                        <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white cursor-pointer bg-white/20 hover:bg-white/35 backdrop-blur" title="Reemplazar esta foto por otra">
                            <Replace className="h-3 w-3 inline mr-1" /> Reemplazar
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) replacePhotoImage(p, f);
                              e.target.value = '';
                            }} />
                          </label>
                          <button type="button" onClick={() => togglePhotoActive(p)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-white/20 hover:bg-white/35 backdrop-blur" title={p.active ? 'Ocultar sin borrar' : 'Mostrar de nuevo'}>
                            {p.active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button type="button" onClick={() => removePhoto(p)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-red-500/70 hover:bg-red-500" title="Eliminar foto">
                            {busy === `del-${p.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      {/* Edición de título y descripción */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Pencil className="h-3 w-3 text-gray-400 shrink-0" />
                          <Input
                            value={p.title}
                            onChange={(e) => patchPhoto(p.id, { title: e.target.value })}
                            onBlur={() => commitPhoto(p)}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            placeholder="Título (ej: Fiesta de 15 — Rosse)"
                            className="h-8 text-xs"
                            aria-label={`Título foto ${i + 1}`}
                          />
                        </div>
                        <Textarea
                          value={p.description}
                          onChange={(e) => patchPhoto(p.id, { description: e.target.value })}
                          onBlur={() => commitPhoto(p)}
                          placeholder="Descripción (opcional — se ve en la vista ampliada)"
                          rows={2}
                          className="text-xs"
                          aria-label={`Descripción foto ${i + 1}`}
                        />
                        <div className="flex items-center gap-0.5 pt-1 border-t border-gray-100">
                          <button type="button" onClick={() => movePhoto(p, 'up')} disabled={i === 0 || busy === `mv-${p.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-25" title="Mover atrás" aria-label="Mover foto atrás">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => movePhoto(p, 'down')} disabled={i === draft.photos.length - 1 || busy === `mv-${p.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-25" title="Mover adelante" aria-label="Mover foto adelante">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          {busy === `ph-${p.id}` && <Loader2 className="h-3 w-3 animate-spin text-green-600 ml-2" />}
                          <span className="ml-auto text-[10px] text-gray-300" title="Los cambios de texto se guardan al salir del campo (Enter / clic fuera)">
                            {busy === `ph-${p.id}` ? 'guardando…' : 'auto-guarda al salir'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── VISTA LISTA (categorías de la galería) ──
  return (
    <div className="max-w-6xl space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
          <span className="flex-1">⚠️ {error} — verifica que iniciaste sesión como administrador.</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">✕</button>
        </div>
      )}

      {/* Encabezado de la sección */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: 'linear-gradient(135deg, #FDF2F8 0%, #FAF5FF 55%, #FFF7ED 100%)',
          border: '2px solid #FBCFE8',
          boxShadow: '0 8px 24px -10px rgba(236,72,153,0.3)',
        }}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <span
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', boxShadow: '0 6px 16px -4px rgba(168,85,247,0.5)' }}
            aria-hidden
          >
            <Images className="h-6 w-6 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold" style={{ fontSize: '22px', color: '#2E1065', fontFamily: 'Georgia, serif' }}>
              Galería de Eventos
            </h2>
            <p className="text-sm text-gray-700 mt-1 leading-snug">
              Muestra tu trabajo con <strong>fotos reales</strong>: fiestas de 15, cumpleaños infantiles, cumpleaños de adultos, bodas…{' '}
              Cada categoría tiene su portada y su carrusel. Entra en una categoría para <strong>agregar, editar o eliminar fotos</strong> —
              los clientes las ven con vista ampliada y un botón de WhatsApp.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
            📸 {totalPhotos} fotos en {cats.length} categorías
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FCE7F3', color: '#BE185D' }}>
            ➕ Varias fotos de golpe
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#047857' }}>
            ✏️ Editar título y descripción
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFF7ED', color: '#C2410C' }}>
            👁 Ocultar sin borrar
          </span>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar categoría o foto…" className="pl-9 h-10 bg-white" aria-label="Buscar en la galería" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-gray-500">{filtered.length} {filtered.length === 1 ? 'categoría' : 'categorías'}</p>
          <Button onClick={addCategory} disabled={saving} style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} className="text-white hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Añadir categoría
          </Button>
        </div>
      </div>

      {/* Grid de categorías */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <Images className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{cats.length === 0 ? 'Sin categorías — crea la primera (15 Años, Cumpleaños…).' : 'Ninguna categoría coincide con la búsqueda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((c, idx) => (
            <div
              key={c.id}
              className="group rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer flex flex-col"
              onClick={() => openCategory(c)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openCategory(c); }}
              aria-label={`Editar categoría ${c.name}`}
            >
              {/* Portada */}
              <div className="relative" style={{ aspectRatio: '4 / 3', background: 'linear-gradient(160deg, #FAF5FF 0%, #FDF2F8 100%)' }}>
                {c.cover ? (
                  <img src={c.cover} alt={`Portada de ${c.name}`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">{c.icon || '🖼️'}</div>
                )}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white" style={{ background: 'rgba(46,16,101,0.65)' }}>
                  #{idx + 1}
                </span>
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                  📷 {c.photos.length}
                </span>
                {!c.active && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-black/60">🚫 Oculta</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                    ✏️ Gestionar fotos
                  </span>
                </div>
              </div>

              {/* Datos */}
              <div className="p-2.5 flex-1 flex flex-col">
                <p className="text-xs font-bold text-gray-900 truncate">{c.icon} {c.name || 'Sin nombre'}</p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5" title={c.description}>{c.description || '—'}</p>
                <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => moveCategory(c, -1)} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-25" title="Subir orden" aria-label="Subir orden">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveCategory(c, 1)} disabled={idx === filtered.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-25" title="Bajar orden" aria-label="Bajar orden">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeCategory(c)} className="w-7 h-7 ml-auto rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600" title="Eliminar categoría y sus fotos" aria-label={`Eliminar ${c.name}`}>
                    {busy === `del-${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ejemplos / inspiración */}
      <div className="rounded-xl p-4" style={{ background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
        <p className="text-xs font-bold mb-2" style={{ color: '#7E22CE' }}>💡 Ideas de categorías con fotos reales</p>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: <Crown className="h-3.5 w-3.5" />, label: 'Fiestas de 15 (quinceañeras)' },
            { icon: <PartyPopper className="h-3.5 w-3.5" />, label: 'Cumpleaños infantiles' },
            { icon: <Baby className="h-3.5 w-3.5" />, label: 'Baby showers' },
            { icon: <Heart className="h-3.5 w-3.5" />, label: 'Aniversarios' },
            { icon: <Images className="h-3.5 w-3.5" />, label: 'Graduaciones' },
          ].map((x) => (
            <span key={x.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white" style={{ color: '#7E22CE', border: '1px solid #E9D5FF' }}>
              {x.icon} {x.label}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Entra en una categoría → «Agregar fotos» → selecciona varias imágenes a la vez (se comprimen automáticamente, hasta 8MB cada una).</p>
      </div>
    </div>
  );
}
