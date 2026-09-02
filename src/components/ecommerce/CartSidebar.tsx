'use client';

import { useCartStore, getCartKey } from '@/store/cart-store';
import { useAppStore } from '@/store/app-store';
import { useCurrencyStore, formatPrice } from '@/store/currency-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Parsea el JSON de variantes de un item y devuelve un string legible.
 */
function formatVariantInfo(variantInfo?: string): string {
  if (!variantInfo) return '';
  try {
    const arr = JSON.parse(variantInfo);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((v: { groupName?: string; optionName?: string; name?: string }) => v.optionName || v.name || '')
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

/**
 * Parsea el JSON de extras de un item y devuelve un string legible.
 */
function formatExtrasInfo(extrasInfo?: string, currency: 'CUP' | 'USD' = 'CUP'): string {
  if (!extrasInfo) return '';
  try {
    const arr = JSON.parse(extrasInfo);
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((e: { name?: string; price?: number }) => {
        const name = e.name || '';
        const price = Number(e.price) || 0;
        if (price > 0) return `${name} (+${formatPrice(price, currency)})`;
        return name;
      })
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

interface SiteConfigData {
  freeShippingMin: number;
  shippingCost: number;
  minOrderAmount: number;
}

export function CartSidebar() {
  const [open, setOpen] = useState(false);
  const [siteConfig, setSiteConfig] = useState<SiteConfigData | null>(null);
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s._hydrated);
  const currency = useCurrencyStore((s) => s.currency);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);
  const clearCart = useCartStore((s) => s.clearCart);
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener('toggleCart', handler);
    return () => window.removeEventListener('toggleCart', handler);
  }, []);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((res) => res.json())
      .then((data) => setSiteConfig(data))
      .catch(console.error);
  }, []);

  const total = getTotal();
  const itemCount = getItemCount();
  const freeShippingMin = siteConfig?.freeShippingMin ?? 100;
  const minOrderAmount = siteConfig?.minOrderAmount ?? 0;
  const freeShipping = total >= freeShippingMin;
  const meetsMinOrder = minOrderAmount <= 0 || total >= minOrderAmount;
  const remainingForMin = minOrderAmount > 0 ? minOrderAmount - total : 0;

  const handleCheckout = () => {
    if (!meetsMinOrder) return;
    setOpen(false);
    setView('checkout');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand" />
            Mi Carrito ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Tu carrito está vacío</h3>
            <p className="text-sm text-gray-500 mt-1">Agrega productos para comenzar</p>
            <Button
              className="mt-4 bg-brand hover:bg-brand-dark text-white"
              onClick={() => {
                setOpen(false);
                setView('home');
                setTimeout(() => {
                  const el = document.getElementById('catalogo-categorias');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 200);
              }}
            >
              Explorar Productos
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => {
                // Clave compuesta (productId + variantInfo + extrasInfo) para
                // permitir varias líneas del mismo producto con distintas
                // variantes o extras en el carrito.
                const cartKey = getCartKey(item);
                const variantText = formatVariantInfo(item.variantInfo);
                const extrasText = formatExtrasInfo(item.extrasInfo, currency);
                return (
                <div key={cartKey} className="flex gap-3 bg-gray-50 rounded-xl p-4">
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border border-gray-200">
                    <img
                      src={item.image || '/products/placeholder.svg'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                      {item.name}
                      {item.isReservation && (
                        <span className="ml-1 inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">📅 RESERVADO</span>
                      )}
                    </h4>
                    {/* Variantes y extras seleccionados (si los hay) */}
                    {variantText && (
                      <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">
                        <span className="text-gray-400">Variante:</span> {variantText}
                      </p>
                    )}
                    {extrasText && (
                      <p className="text-[11px] text-gray-600 line-clamp-1">
                        <span className="text-gray-400">Extras:</span> {extrasText}
                      </p>
                    )}
                    <p className="text-sm font-bold text-brand-dark mt-1">{formatPrice(item.price, currency)}</p>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex items-center border rounded-md bg-white">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(cartKey, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                          onClick={() => {
                            const result = updateQuantity(cartKey, item.quantity + 1);
                            if (!result.ok) {
                              alert(result.reason || 'No hay más stock disponible.');
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeItem(cartKey)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(total, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío</span>
                <span className="font-medium text-gray-400">
                  {freeShipping ? 'GRATIS' : 'Se calcula en el checkout'}
                </span>
              </div>
              {!freeShipping && (
                <div className="bg-brand-light text-brand-dark text-xs p-3 rounded-lg text-center leading-relaxed">
                  ¡Agrega {formatPrice(freeShippingMin - total, currency)} más para envío GRATIS!
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Subtotal</span>
                <span className="text-brand-dark">{formatPrice(total, currency)}</span>
              </div>
            </div>

            <SheetFooter className="flex flex-col gap-2 pt-4">
              {/* Aviso de monto mínimo no alcanzado */}
              {!meetsMinOrder && remainingForMin > 0 && (
                <div className="w-full rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                  <p className="text-sm font-semibold text-amber-800">
                    🛒 Falta {formatPrice(remainingForMin, currency)} para alcanzar el mínimo
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    El monto mínimo de pedido es {formatPrice(minOrderAmount, currency)}
                  </p>
                </div>
              )}
              <Button
                className="w-full bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white shadow-lg h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCheckout}
                disabled={!meetsMinOrder}
              >
                {meetsMinOrder ? 'Completar Pedido' : `Faltan ${formatPrice(remainingForMin, currency)}`}
                {meetsMinOrder && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={clearCart}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Vaciar Carrito
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
