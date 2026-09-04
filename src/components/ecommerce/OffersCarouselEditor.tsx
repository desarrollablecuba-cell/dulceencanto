'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X, Check } from 'lucide-react';

interface OffersCarouselConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  productIds: string[];
  backgroundColor: string;
  textColor: string;
}

interface Product {
  id: string;
  name: string;
  shortName?: string;
  price: number;
  image: string;
  offerEnabled?: boolean;
  offerPrice?: number;
  category?: { name: string };
}

interface OffersCarouselEditorProps {
  value: string;
  onChange: (v: string) => void;
}

const DEFAULT_CONFIG: OffersCarouselConfig = {
  enabled: true,
  title: '🔥 Ofertas Destacadas',
  subtitle: 'Aprovecha los mejores precios por tiempo limitado',
  productIds: [],
  backgroundColor: '',
  textColor: '',
};

function parseConfig(json: string): OffersCarouselConfig {
  if (!json || !json.trim()) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(json) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Editor del carrusel de Ofertas Destacadas.
 *
 * Permite:
 *  - Activar/desactivar el carrusel.
 *  - Personalizar título y subtítulo.
 *  - Seleccionar productos manuales (buscador con multi-select).
 *    Si no se selecciona ninguno, se auto-detectan productos con oferta activa.
 *  - Personalizar colores del header (opcional, defaults del tema si vacío).
 */
export function OffersCarouselEditor({ value, onChange }: OffersCarouselEditorProps) {
  const config = parseConfig(value);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        const prods = Array.isArray(data) ? data : (data.products || []);
        setProducts(prods);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateConfig = (patch: Partial<OffersCarouselConfig>) => {
    const next = { ...config, ...patch };
    onChange(JSON.stringify(next));
  };

  const toggleProduct = (productId: string) => {
    const current = config.productIds || [];
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    updateConfig({ productIds: next });
  };

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.shortName || '').toLowerCase().includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q)
    );
  });

  const selectedProducts = products.filter((p) => (config.productIds || []).includes(p.id));

  return (
    <div className="space-y-4">
      {/* Toggle activar/desactivar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">Mostrar carrusel de ofertas</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Aparece al inicio del catálogo, antes de las categorías.
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => updateConfig({ enabled: checked })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Título y subtítulo */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs font-medium">Título</Label>
              <Input
                value={config.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
                placeholder="🔥 Ofertas Destacadas"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Subtítulo</Label>
              <Input
                value={config.subtitle}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                placeholder="Aprovecha los mejores precios por tiempo limitado"
                className="mt-1"
              />
            </div>
          </div>

          {/* Colores opcionales */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Color de fondo (opcional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={config.backgroundColor || '#0E3446'}
                  onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                  className="h-8 w-10 rounded border border-gray-200 cursor-pointer p-0.5"
                />
                <Input
                  value={config.backgroundColor}
                  onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                  placeholder="Vacío = tema"
                  className="flex-1 h-8 text-xs font-mono"
                />
                {config.backgroundColor && (
                  <button
                    type="button"
                    onClick={() => updateConfig({ backgroundColor: '' })}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Color de texto (opcional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={config.textColor || '#FFFFFF'}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="h-8 w-10 rounded border border-gray-200 cursor-pointer p-0.5"
                />
                <Input
                  value={config.textColor}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  placeholder="Vacío = blanco"
                  className="flex-1 h-8 text-xs font-mono"
                />
                {config.textColor && (
                  <button
                    type="button"
                    onClick={() => updateConfig({ textColor: '' })}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Selección de productos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Productos del carrusel ({selectedProducts.length} seleccionados)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductPicker(!showProductPicker)}
              >
                {showProductPicker ? 'Cerrar' : 'Seleccionar productos'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Si no seleccionas ninguno, se auto-detectan productos con oferta activa.
            </p>

            {/* Lista de productos seleccionados */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 bg-brand-light text-brand-dark text-xs px-2 py-1 rounded-full"
                  >
                    {p.name.slice(0, 30)}{p.name.length > 30 ? '…' : ''}
                    <button
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className="hover:bg-brand/20 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Buscador de productos */}
            {showProductPicker && (
              <div className="border border-gray-200 rounded-lg p-2 space-y-2 max-h-80 overflow-y-auto nice-scroll">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto…"
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredProducts.slice(0, 50).map((p) => {
                      const isSelected = (config.productIds || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProduct(p.id)}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors ${
                            isSelected ? 'bg-brand-light' : 'hover:bg-gray-50'
                          }`}
                        >
                          <img
                            src={p.image || '/products/placeholder.svg'}
                            alt=""
                            className="w-8 h-8 rounded object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              ${p.price.toFixed(2)}
                              {p.category ? ` · ${p.category.name}` : ''}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-brand shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {filteredProducts.length > 50 && (
                      <p className="text-[10px] text-gray-400 text-center py-1">
                        Mostrando 50 de {filteredProducts.length}. Usa el buscador para filtrar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
