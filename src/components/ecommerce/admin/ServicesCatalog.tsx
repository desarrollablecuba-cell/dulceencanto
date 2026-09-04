'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile } from '@/lib/compress-image';
import { SERVICE_USD_RATE, serviceFromUsd, type ServiceVariant } from '@/lib/service-variants';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Search, Eye, EyeOff,
  ImagePlus, Info as InfoIcon, Sparkles, CheckCircle2, Store, Layers, Camera,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
//  V52.9 — ServicesCatalog: editor de Servicios para Eventos renovado.
//
//  Dos vistas (como el editor de Productos):
//   · LISTA: grid de cards con la FOTO real + detalles principales
//     (nombre, categoría, precio USD, variantes, estado). Clic → detalle.
//   · DETALLE: overlay a pantalla completa con pestañas verticales
//     (Información · Variantes · Vista en tienda) y barra superior con
//     Volver / Guardar — igual que el editor de productos.
//
//  API: /api/admin/services (GET/POST/PUT/DELETE) + /upload (comprimida).
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
  variants: ServiceVariant[];
}

const SERVICE_CATEGORIES = [
  { value: 'decoracion', label: '🎨 Decoración' },
  { value: 'entretenimiento', label: '🎪 Entretenimiento' },
  { value: 'personalizado', label: '✨ Personalizado' },
  { value: 'suenos_sorpresa', label: '🙀 Sueños Sorpresa' },
];

const catLabel = (v: string) => SERVICE_CATEGORIES.find((c) => c.value === v)?.label ?? v;
const cupOf = (usd: number) => Math.round((Number(usd) || 0) * SERVICE_USD_RATE);
const newVariantId = () => `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

/** Sube la imagen de un servicio (o variante) comprimida EN EL CLIENTE. */
async function uploadServiceImage(file: File): Promise<string> {
  const compressed = await compressImageFile(file, { maxEdge: 1600, targetBytes: 800 * 1024 });
  const fd = new FormData();
  fd.append('file', compressed);
  const res = await fetch('/api/admin/services/upload', { method: 'POST', headers: adminAuthHeaders(), body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error al subir (${res.status})`);
  return data.path as string;
}

export function ServicesCatalog() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ── Vista detalle ──
  const [editId, setEditId] = useState<string | null>(null); // null = lista
  const [editTab, setEditTab] = useState<'info' | 'variants' | 'preview'>('info');
  const [draft, setDraft] = useState<ServiceRow | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/services', { headers: adminAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data.map((s: any) => ({
            ...s,
            variants: typeof s.variants === 'string' ? safeParseVariants(s.variants) : (Array.isArray(s.variants) ? s.variants : []),
          })));
          setError(null);
        } else setError(data?.error || 'Respuesta inválida');
      })
      .catch(() => setError('No se pudieron cargar los servicios'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...services].sort((a, b) => a.order - b.order), [services]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((s) => {
      if (catFilter !== 'all' && s.category !== catFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.variants.some((v) => v.name.toLowerCase().includes(q))
      );
    });
  }, [sorted, search, catFilter]);

  // ── Acciones de lista ──
  const openDetail = (s: ServiceRow) => {
    setDraft({ ...s, variants: s.variants.map((v) => ({ ...v })) });
    setEditId(s.id);
    setEditTab('info');
    setSavedFeedback(null);
    window.scrollTo({ top: 0 });
  };

  const addService = async () => {
    setSaving(true);
    setError(null);
    try {
      const draftNew: ServiceRow = {
        id: '',
        name: 'Nuevo servicio',
        description: 'Describe el servicio para eventos…',
        icon: '✨',
        image: '',
        price: 0,
        priceUsd: 2,
        category: 'decoracion',
        active: true,
        order: sorted.length ? Math.max(...sorted.map((s) => s.order)) + 1 : 0,
        variants: [],
      };
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: adminAuthHeaders(true),
        // `price` (CUP) se omite a propósito → la API lo deriva de priceUsd × 700
        body: JSON.stringify({ ...draftNew, price: undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const created: ServiceRow = { ...draftNew, ...data, variants: safeParseVariants(data.variants) };
      setServices((list) => [...list, created]);
      openDetail(created);
      toast({ title: '✨ Servicio creado', description: 'Completa su información y guarda los cambios.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al crear el servicio');
    } finally {
      setSaving(false);
    }
  };

  const removeService = (s: ServiceRow) => {
    if (!confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer.`)) return;
    setBusy(`del-${s.id}`);
    fetch(`/api/admin/services?id=${encodeURIComponent(s.id)}`, { method: 'DELETE', headers: adminAuthHeaders() })
      .then((r) => { if (!r.ok) throw new Error(`Error ${r.status}`); setServices((l) => l.filter((x) => x.id !== s.id)); })
      .catch((e) => setError(e?.message || 'Error al eliminar'))
      .finally(() => setBusy(null));
  };

  const toggleActive = (s: ServiceRow) => {
    const next = { ...s, active: !s.active };
    setServices((l) => l.map((x) => (x.id === s.id ? next : x)));
    fetch('/api/admin/services', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify(next) })
      .then((r) => { if (!r.ok) throw new Error(`Error ${r.status}`); })
      .catch(() => { setServices((l) => l.map((x) => (x.id === s.id ? s : x))); load(); });
  };

  const move = async (s: ServiceRow, dir: -1 | 1) => {
    const idx = sorted.findIndex((x) => x.id === s.id);
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[j];
    setServices((l) => l.map((x) => (x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x)));
    await Promise.all([
      fetch('/api/admin/services', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify({ ...a, order: b.order }) }),
      fetch('/api/admin/services', { method: 'PUT', headers: adminAuthHeaders(true), body: JSON.stringify({ ...b, order: a.order }) }),
    ]);
    load();
  };

  // ── Guardar detalle ──
  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setError('El nombre del servicio es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: adminAuthHeaders(true),
        // `price` (CUP) se omite a propósito → la API lo deriva de priceUsd × 700
        // (así el CUP de la BD siempre queda consistente con el USD editado)
        body: JSON.stringify({ ...draft, price: undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const saved: ServiceRow = { ...draft, ...data, variants: safeParseVariants(data.variants) };
      setServices((l) => l.map((x) => (x.id === saved.id ? saved : x)));
      setDraft(saved);
      setSavedFeedback(`✓ "${saved.name}" guardado — ya visible en la tienda.`);
      setTimeout(() => setSavedFeedback(null), 4000);
      toast({ title: '✓ Servicio guardado', description: saved.name, duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const closeDetail = () => { setEditId(null); setDraft(null); setSavedFeedback(null); load(); };

  // ── Subida de imágenes del detalle ──
  const uploadMain = async (file: File) => {
    if (!draft) return;
    setUploadingField('main');
    try {
      const path = await uploadServiceImage(file);
      setDraft((d) => (d ? { ...d, image: path } : d));
      toast({ title: '🖼️ Foto principal lista', description: 'Pulsa Guardar para aplicarla en la tienda.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al subir la imagen');
    } finally {
      setUploadingField(null);
    }
  };

  const uploadVariant = async (varId: string, file: File) => {
    if (!draft) return;
    setUploadingField(varId);
    try {
      const path = await uploadServiceImage(file);
      setDraft((d) => (d ? { ...d, variants: d.variants.map((v) => (v.id === varId ? { ...v, image: path } : v)) } : d));
      toast({ title: '🖼️ Foto de la variante lista', description: 'Pulsa Guardar para aplicarla.', duration: 2500 });
    } catch (e: any) {
      setError(e?.message || 'Error al subir la imagen de la variante');
    } finally {
      setUploadingField(null);
    }
  };

  // ── Variantes (edición en draft) ──
  const patchDraft = (fields: Partial<ServiceRow>) => setDraft((d) => (d ? { ...d, ...fields } : d));

  const toggleVariantsMode = () => {
    if (!draft) return;
    if (draft.variants.length > 0) {
      if (!confirm('¿Quitar TODAS las variantes de este servicio? Volverá a mostrarse como un servicio simple.')) return;
      patchDraft({ variants: [] });
      return;
    }
    patchDraft({ variants: [{ id: newVariantId(), name: '', image: '', priceUsd: 0, active: true, order: 0 }] });
  };

  const addVariant = () => {
    if (!draft) return;
    patchDraft({ variants: [...draft.variants, { id: newVariantId(), name: '', image: '', priceUsd: 0, active: true, order: draft.variants.length }] });
  };

  const patchVariant = (varId: string, fields: Partial<ServiceVariant>) => {
    setDraft((d) => (d ? { ...d, variants: d.variants.map((v) => (v.id === varId ? { ...v, ...fields } : v)) } : d));
  };

  const removeVariant = (varId: string) => {
    setDraft((d) => (d ? { ...d, variants: d.variants.filter((v) => v.id !== varId).map((v, i) => ({ ...v, order: i })) } : d));
  };

  const moveVariant = (varId: string, dir: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.variants].sort((a, b) => a.order - b.order);
      const idx = arr.findIndex((v) => v.id === varId);
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...d, variants: arr.map((v, i) => ({ ...v, order: i })) };
    });
  };

  // ════════════════════════════ RENDER ════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando servicios…
      </div>
    );
  }

  // ── VISTA DETALLE (overlay a pantalla completa, como el editor de productos) ──
  if (editId && draft) {
    const activeVariants = draft.variants.filter((v) => v.active);
    const fromUsd = activeVariants.length ? serviceFromUsd(draft.priceUsd, activeVariants) : draft.priceUsd;
    const TABS: { value: typeof editTab; label: string; icon: React.ReactNode }[] = [
      { value: 'info', label: 'Información', icon: <InfoIcon className="h-4 w-4" /> },
      { value: 'variants', label: `Variantes${draft.variants.length ? ` (${draft.variants.length})` : ''}`, icon: <Layers className="h-4 w-4" /> },
      { value: 'preview', label: 'Vista en tienda', icon: <Store className="h-4 w-4" /> },
    ];
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
        {/* Barra superior */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center gap-2 shadow-sm shrink-0">
          <Button variant="ghost" onClick={closeDetail} className="text-gray-700 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-600 shrink-0" />
              Editar Servicio
            </h1>
            <p className="text-xs text-gray-500 truncate hidden md:block">
              {draft.name} · {catLabel(draft.category)} · ${draft.priceUsd.toFixed(2)} USD (≈ ₡{cupOf(draft.priceUsd).toLocaleString('es-CU')} CUP)
            </p>
          </div>
          <Badge variant="outline" className={draft.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:inline-flex' : 'bg-gray-100 text-gray-500 border-gray-200 hidden sm:inline-flex'}>
            {draft.active ? '👁 Visible' : '🚫 Oculto'}
          </Badge>
          <Button variant="outline" onClick={closeDetail} className="hidden sm:inline-flex">Cancelar</Button>
          <Button onClick={saveDraft} disabled={saving} style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} className="text-white hover:opacity-90">
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

        {/* Cuerpo: pestañas verticales + contenido */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <aside className="bg-[var(--footer-bg,#111827)] text-gray-100 md:w-60 md:shrink-0 overflow-x-auto md:overflow-y-auto">
            <nav className="flex md:flex-col gap-1 p-2 md:p-3 min-w-max md:min-w-0">
              {TABS.map((t) => {
                const active = editTab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEditTab(t.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active ? 'text-white' : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                    style={active ? { background: 'linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(236,72,153,0.35) 100%)' } : undefined}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto bg-gray-50 nice-scroll">
            <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">

              {/* ── INFO ── */}
              {editTab === 'info' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Información general</h2>
                  <p className="text-sm text-gray-500 mb-6">Datos principales del servicio. El precio se edita en USD; el CUP se calcula solo (1 USD = {SERVICE_USD_RATE} CUP).</p>
                  <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                    {/* Columna izquierda: foto protagonista */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-700 font-semibold">Foto protagonista</Label>
                        <p className="text-[11px] text-gray-400 mb-2">Vertical 3:4 recomendada — es la imagen de la card en la tienda.</p>
                        <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-pink-200 bg-white" style={{ aspectRatio: '3 / 4' }}>
                          {draft.image ? (
                            <img src={draft.image} alt={draft.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
                              <Camera className="h-10 w-10" />
                              <span className="text-xs">Sin foto todavía</span>
                            </div>
                          )}
                          {uploadingField === 'main' && (
                            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                              <span className="text-xs font-semibold text-gray-600">Comprimiendo y subiendo…</span>
                            </div>
                          )}
                          {draft.variants.length > 0 && (
                            <span className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white text-center" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                              🎭 {draft.variants.length} {draft.variants.length === 1 ? 'variante' : 'variantes'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <label className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer text-center transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                            <ImagePlus className="h-3.5 w-3.5 inline mr-1" />
                            {draft.image ? 'Cambiar foto' : 'Subir foto'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadMain(f);
                              e.target.value = '';
                            }} />
                          </label>
                          {draft.image && (
                            <button type="button" onClick={() => patchDraft({ image: '' })} className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100">
                              Quitar
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-2">Las fotos se comprimen automáticamente (hasta 8MB sin error 502).</p>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <Label className="text-gray-700 font-semibold">Estado y orden</Label>
                        <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                          <span className="text-sm text-gray-600">{draft.active ? '👁 Visible en la tienda' : '🚫 Oculto para clientes'}</span>
                          <input type="checkbox" checked={draft.active} onChange={(e) => patchDraft({ active: e.target.checked })} className="accent-green-600 h-4 w-4" aria-label="Servicio visible" />
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 shrink-0">Orden</span>
                          <Input type="number" value={draft.order} onChange={(e) => patchDraft({ order: Number(e.target.value) || 0 })} className="h-9 w-24" aria-label="Orden" />
                          <span className="text-[11px] text-gray-400">(posición en la lista pública)</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha: campos */}
                    <div className="space-y-5">
                      <div className="flex gap-3">
                        <div className="w-16 shrink-0">
                          <Label>Icono</Label>
                          <Input value={draft.icon} onChange={(e) => patchDraft({ icon: e.target.value.slice(0, 4) })} className="text-center h-10 text-lg" aria-label="Emoji del servicio" />
                        </div>
                        <div className="flex-1">
                          <Label>Nombre del servicio</Label>
                          <Input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} className="h-10 font-semibold" placeholder="Ej: Decoración del Evento" />
                        </div>
                      </div>

                      <div>
                        <Label>Categoría</Label>
                        <select value={draft.category} onChange={(e) => patchDraft({ category: e.target.value })} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm" aria-label="Categoría del servicio">
                          {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>

                      <div>
                        <Label>Descripción</Label>
                        <Textarea value={draft.description} onChange={(e) => patchDraft({ description: e.target.value })} rows={5} className="text-sm" placeholder="Describe qué incluye, para cuántos invitados, cómo se entrega…" />
                        <p className="text-[11px] text-gray-400 mt-1">{draft.description.length} caracteres — la descripción completa se ve en el detalle del servicio.</p>
                      </div>

                      <div className="rounded-xl p-4 space-y-2" style={{ background: 'linear-gradient(135deg, #FDF2F8 0%, #FAF5FF 100%)', border: '2px solid #FBCFE8' }}>
                        <Label className="text-gray-700 font-semibold">💵 Precio (USD)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-700">$</span>
                          <Input type="number" min={0} step="0.01" value={draft.priceUsd} onChange={(e) => patchDraft({ priceUsd: Number(e.target.value) || 0 })} className="h-10 w-32 font-bold text-base" aria-label="Precio USD" />
                          <span className="text-sm text-gray-500">USD</span>
                        </div>
                        <p className="text-xs text-gray-600" title="El precio en pesos se calcula automáticamente con la tasa 1 USD = 700 CUP">
                          ≈ ₡{cupOf(draft.priceUsd).toLocaleString('es-CU')} CUP (automático, tasa {SERVICE_USD_RATE})
                        </p>
                        {activeVariants.length > 0 && (
                          <p className="text-[11px] px-2 py-1.5 rounded-lg bg-white/70" style={{ color: '#BE185D' }}>
                            🎭 En la tienda se muestra «Desde ${serviceFromUsd(draft.priceUsd, activeVariants).toFixed(2)}» (mínimo entre variantes activas).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── VARIANTES ── */}
              {editTab === 'variants' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Variantes del servicio</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Cada variante tiene <strong>nombre + foto propia</strong> y precio USD opcional (vacío usa el precio del servicio). El cliente la elige al reservar.
                  </p>

                  <div className="rounded-xl border p-4 mb-6" style={{ background: draft.variants.length ? '#FDF2F8' : '#FAFAFA', borderColor: draft.variants.length ? '#FBCFE8' : '#E5E7EB' }}>
                    <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                      <span className="text-sm font-semibold flex items-center gap-2" style={{ color: draft.variants.length ? '#BE185D' : '#6B7280' }}>
                        <span aria-hidden>🎭</span>
                        {draft.variants.length ? `Servicio CON variantes (${draft.variants.length})` : 'Activar variantes'}
                        <span className="font-normal text-[11px] text-gray-400">(ej: Muñeco Sorpresa → Payasita, Conejo Chispa, Coneja Maricusa)</span>
                      </span>
                      <input type="checkbox" checked={draft.variants.length > 0} onChange={toggleVariantsMode} className="accent-pink-600 h-4 w-4" aria-label="Servicio con variantes" />
                    </label>
                  </div>

                  {draft.variants.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                      <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Sin variantes — se muestra como un servicio simple con su foto.</p>
                      <button type="button" onClick={toggleVariantsMode} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                        + Agregar la primera variante
                      </button>
                    </div>
                  )}

                  {draft.variants.length > 0 && (
                    <div className="space-y-3">
                      {draft.variants.map((v, i) => (
                        <div key={v.id} className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row gap-4">
                          {/* Foto de la variante */}
                          <div className="shrink-0 space-y-2">
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100" style={{ width: '120px', aspectRatio: '3 / 4' }}>
                              {v.image ? (
                                <img src={v.image} alt={v.name || 'Variante'} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">sin foto</div>
                              )}
                              {uploadingField === v.id && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                  <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
                                </div>
                              )}
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-black/50">#{i + 1}</span>
                            </div>
                            <label className="block px-2 py-1.5 rounded-lg text-[11px] font-bold text-white cursor-pointer text-center" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                              {v.image ? 'Cambiar foto' : 'Subir foto'}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadVariant(v.id, f);
                                e.target.value = '';
                              }} />
                            </label>
                          </div>

                          {/* Campos */}
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex flex-wrap gap-3 items-end">
                              <div className="flex-1 min-w-[180px]">
                                <Label className="text-xs">Nombre de la variante</Label>
                                <Input value={v.name} onChange={(e) => patchVariant(v.id, { name: e.target.value })} placeholder="Ej: Payasita" className="h-9" aria-label={`Nombre variante ${i + 1}`} />
                              </div>
                              <div className="w-36">
                                <Label className="text-xs">Precio USD (opcional)</Label>
                                <Input type="number" min={0} step="0.01" value={v.priceUsd || ''} onChange={(e) => patchVariant(v.id, { priceUsd: Number(e.target.value) || 0 })} placeholder="auto" className="h-9" aria-label={`Precio USD variante ${i + 1}`} />
                              </div>
                              <div className="text-xs text-gray-500 pb-2" title="CUP derivado con la tasa 700">
                                {v.priceUsd > 0 ? `≈ ₡${cupOf(v.priceUsd).toLocaleString('es-CU')} CUP` : 'usa el precio del servicio'}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                <input type="checkbox" checked={v.active} onChange={(e) => patchVariant(v.id, { active: e.target.checked })} className="accent-green-600 h-3.5 w-3.5" aria-label={`Variante ${v.name || i + 1} visible`} />
                                {v.active ? '👁 Visible' : '🚫 Oculta'}
                              </label>
                              <div className="flex gap-1 ml-auto">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveVariant(v.id, -1)} disabled={i === 0} aria-label="Subir variante"><ChevronUp className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveVariant(v.id, 1)} disabled={i === draft.variants.length - 1} aria-label="Bajar variante"><ChevronDown className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => removeVariant(v.id)} aria-label="Eliminar variante"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addVariant} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold border-2 border-dashed border-pink-300 text-pink-600 hover:bg-pink-50">
                        <Plus className="h-4 w-4" /> Agregar variante
                      </button>
                      <p className="text-[11px] text-gray-400">
                        Recuerda pulsar <strong>Guardar</strong> para aplicar los cambios de variantes.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── VISTA EN TIENDA (preview) ── */}
              {editTab === 'preview' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Vista en tienda</h2>
                  <p className="text-sm text-gray-500 mb-6">Así verá el cliente este servicio en la sección «Servicios para Eventos» (cambios sin guardar).</p>
                  <div className="flex justify-center p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)' }}>
                    <div className="w-64 rounded-2xl overflow-hidden bg-white shadow-lg ring-1 ring-gray-100">
                      <div className="relative" style={{ aspectRatio: '3 / 4', background: 'linear-gradient(160deg, #FDF2F8 0%, #FAF5FF 100%)' }}>
                        {draft.image ? (
                          <img src={draft.image} alt={draft.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">{draft.icon || '✨'}</div>
                        )}
                        {activeVariants.length > 0 && (
                          <span className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white text-center" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                            🎭 {activeVariants.length} {activeVariants.length === 1 ? 'variante' : 'variantes'}
                          </span>
                        )}
                        {!draft.active && (
                          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-black/60">🚫 Oculto</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#7E22CE' }}>{catLabel(draft.category).replace(/^[^\s]+\s/, '')}</p>
                        <h3 className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{draft.name}</h3>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5" style={{ minHeight: '2.2em' }}>{draft.description || 'Sin descripción'}</p>
                        <div className="flex items-end justify-between mt-2">
                          <div>
                            <span className="block text-[10px] uppercase tracking-widest font-bold" style={{ color: '#7E22CE' }}>
                              {activeVariants.length ? 'Desde' : 'Precio'}
                            </span>
                            <span className="text-lg font-bold" style={{ color: '#BE185D' }}>${fromUsd.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 ml-1">USD</span>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)' }}>Reservar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">La foto de la card usa la imagen principal (o la foto de la variante si aplica). Precio «Desde» = mínimo entre variantes activas.</p>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VISTA LISTA (cards con preview de imagen + detalles principales) ──
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
          <span className="flex-1">⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">✕</button>
        </div>
      )}

      {/* Barra de herramientas: buscar + filtro por categoría + agregar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar servicio o variante…" className="pl-9 h-10 bg-white" aria-label="Buscar servicio" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-gray-500">
            {filtered.length} de {sorted.length} {sorted.length === 1 ? 'servicio' : 'servicios'} · precios en <strong>USD</strong>
          </p>
          <Button onClick={addService} disabled={saving} style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} className="text-white hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Agregar servicio
          </Button>
        </div>
      </div>

      {/* Chips de filtro por categoría */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-white border border-gray-200 shadow-sm">
        {([['all', '✨ Todos', sorted.length]] as const).concat(
          SERVICE_CATEGORIES.map((c) => [c.value, c.label, sorted.filter((s) => s.category === c.value).length] as const)
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setCatFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              catFilter === id ? 'text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={catFilter === id ? { background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' } : undefined}
          >
            {label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${catFilter === id ? 'bg-white/25' : 'bg-gray-100'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Grid de servicios */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {sorted.length === 0 ? 'Sin servicios — agrega el primero.' : 'Ningún servicio coincide con el filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((s, idx) => (
            <div
              key={s.id}
              className="group rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-pink-300 hover:shadow-lg transition-all cursor-pointer flex flex-col"
              onClick={() => openDetail(s)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetail(s); }}
              aria-label={`Editar ${s.name}`}
            >
              {/* Preview de imagen */}
              <div className="relative" style={{ aspectRatio: '3 / 4', background: 'linear-gradient(160deg, #FDF2F8 0%, #FAF5FF 100%)' }}>
                {s.image ? (
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">{s.icon || '✨'}</div>
                )}
                {/* Badges */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white" style={{ background: 'rgba(46,16,101,0.65)' }}>
                  #{idx + 1}
                </span>
                {s.variants.length > 0 && (
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)' }}>
                    🎭 {s.variants.length}
                  </span>
                )}
                {!s.active && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-black/60">🚫 Oculto</span>
                )}
                {/* Overlay hover: editar */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
                    ✏️ Editar
                  </span>
                </div>
              </div>

              {/* Detalles principales */}
              <div className="p-2.5 flex-1 flex flex-col">
                <p className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: '#7E22CE' }}>
                  {catLabel(s.category).replace(/^[^\s]+\s/, '')}
                </p>
                <p className="text-xs font-bold text-gray-900 truncate" title={s.name}>{s.name}</p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5" title={s.description}>{s.description || '—'}</p>
                <p className="mt-1.5 text-sm font-bold" style={{ color: '#BE185D' }}>
                  ${s.variants.filter((v) => v.active).length ? serviceFromUsd(s.priceUsd, s.variants.filter((v) => v.active)).toFixed(2) : s.priceUsd.toFixed(2)}
                  <span className="text-[9px] text-gray-400 font-normal ml-1">USD</span>
                </p>

                {/* Acciones rápidas */}
                <div className="flex items-center gap-0.5 mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => toggleActive(s)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400" title={s.active ? 'Ocultar de la tienda' : 'Mostrar en la tienda'} aria-label={s.active ? `Ocultar ${s.name}` : `Mostrar ${s.name}`}>
                    {s.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => move(s, -1)} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 disabled:opacity-25" title="Subir orden" aria-label="Subir orden">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(s, 1)} disabled={idx === filtered.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 disabled:opacity-25" title="Bajar orden" aria-label="Bajar orden">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeService(s)} className="w-7 h-7 ml-auto rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600" title="Eliminar servicio" aria-label={`Eliminar ${s.name}`}>
                    {busy === `del-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400 text-center">
        ⓘ Toca una card para abrir el <strong>editor detallado</strong> (información, variantes con foto y vista previa). El ojo oculta/muestra sin borrar; las flechas reordenan.
      </p>
    </div>
  );
}

/** Parsea variants (string JSON de la BD) de forma defensiva. */
function safeParseVariants(raw: unknown): ServiceVariant[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((v: any, i) => ({
      id: String(v?.id || `var-${Date.now().toString(36)}-${i}`),
      name: String(v?.name || ''),
      image: String(v?.image || ''),
      priceUsd: Number(v?.priceUsd) || 0,
      active: v?.active !== false,
      order: Number.isFinite(Number(v?.order)) ? Number(v.order) : i,
    }));
  } catch {
    return [];
  }
}
