'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Star, ShoppingCart, Minus, Plus, Check, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
}

interface ProductTag {
  name: string;
  color: string;
}

interface VariantOption {
  id: string;
  groupId: string;
  name: string;
  priceMod: number;
  image: string;
  stock: number;
  available: boolean;
  sortOrder: number;
}

interface VariantGroup {
  id: string;
  productId: string;
  name: string;
  required: boolean;
  maxSelect: number;
  isImageGroup: boolean;
  /** Grupo dominante: cuando hay 2+ grupos, sólo uno puede ser dominante.
   *  Sus opciones son las únicas que aparecen como miniaturas laterales. */
  isDominant?: boolean;
  sortOrder: number;
  options?: VariantOption[];
}

interface ProductCombination {
  id: string;
  productId: string;
  optionIds: string;
  sku: string;
  stock: number;
  price: number | null;
  image: string;
  available: boolean;
  sortOrder: number;
}

interface ProductExtra {
  id: string;
  productId: string;
  name: string;
  description: string;
  priceMod: number;
  required: boolean;
  sortOrder: number;
}

interface WholesaleTier {
  id: string;
  productId: string;
  name: string;
  minQty: number;
  maxQty: number;
  price: number;
  sortOrder: number;
}

interface Product {
  id: string;
  name: string;
  shortName?: string;
  sku?: string;
  description: string;
  price: number;
  image: string;
  images?: string;
  tags?: string;
  offerEnabled?: boolean;
  offerPrice?: number;
  offerType?: string;
  offerStart?: string | null;
  offerEnd?: string | null;
  wholesaleEnabled?: boolean;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  reservationEnabled?: boolean;
  maxReservations?: number;
  reservationDays?: number;
  reservationDeposit?: number;
  promoEnabled?: boolean;
  promoType?: string;
  promoValue?: number;
  promoBuyQty?: number;
  promoGetQty?: number;
  promoStart?: string | null;
  promoEnd?: string | null;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  category: Category;
  variantGroups?: VariantGroup[];
  combinations?: ProductCombination[];
  productExtras?: ProductExtra[];
  wholesaleTiers?: WholesaleTier[];
}

async function fetchProduct(productId: string): Promise<Product | null> {
  const res = await fetch(`/api/products/${productId}`);
  if (!res.ok) return null;
  return res.json();
}

function parseTags(tags?: string): ProductTag[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((t) => t && typeof t === 'object' && t.name)
        .map((t) => ({ name: String(t.name), color: String(t.color || '#6B7280') }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

function parseStringArray(json?: string): string[] {
  if (!json) return [];
  try {
    const p = JSON.parse(json);
    if (Array.isArray(p)) return p.filter((x) => typeof x === 'string');
  } catch {
    /* ignore */
  }
  return [];
}

function isOfferActive(product: Product): boolean {
  if (!product.offerEnabled) return false;
  if (!product.offerPrice || product.offerPrice <= 0) return false;
  if (product.offerPrice >= product.price) return false;
  const now = new Date();
  if (product.offerStart) {
    const start = new Date(product.offerStart);
    if (!isNaN(start.getTime()) && now < start) return false;
  }
  if (product.offerEnd) {
    // Fin de día (23:59:59) para que la oferta se mantenga activa
    // durante TODO el día de fin, no solo hasta medianoche UTC.
    const end = new Date(product.offerEnd);
    end.setHours(23, 59, 59, 999);
    if (!isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

/**
 * Busca la combinación que coincide con las opciones seleccionadas.
 * Requiere que TODOS los grupos tengan una selección; si alguno falta,
 * devuelve null (no hay combinación matching parcial).
 */
function findMatchingCombination(
  product: Product | null | undefined,
  selOpts: Record<string, string>
): ProductCombination | null {
  if (!product?.combinations || product.combinations.length === 0) return null;
  const groups = product.variantGroups || [];
  if (groups.length === 0 || !groups.every((g) => selOpts[g.id])) return null;
  const selectedIds = groups.map((g) => selOpts[g.id]).sort();
  return (
    product.combinations.find((c) => {
      let ids: string[] = [];
      try {
        const p = JSON.parse(c.optionIds || '[]');
        if (Array.isArray(p)) ids = p.filter((x) => typeof x === 'string');
      } catch {
        /* ignore */
      }
      return (
        ids.length === selectedIds.length &&
        [...ids].sort().every((id, i) => id === selectedIds[i])
      );
    }) || null
  );
}

/**
 * Lupa de zoom para la imagen principal del producto.
 *
 * - Sólo escritorio (no táctil): se desactiva si el dispositivo no tiene hover
 *   fino (pointer: fine).
 * - Lente circular de 200px, 4x zoom.
 * - Sigue al cursor; el fondo se calcula correctamente para imágenes
 *   `object-cover` (calcula el recorte y el desplazamiento real de la imagen
 *   dentro del contenedor).
 * - Se oculta al salir el mouse de la imagen.
 */
function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [enabled, setEnabled] = useState(false);
  const [showLens, setShowLens] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });
  const [bgSize, setBgSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const ZOOM = 4;
  const LENS_SIZE = 200;

  // Detectar si es un dispositivo con puntero fino (escritorio). En móvil/táctil
  // se desactiva la lupa para no interferir con el scroll.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    // Posición del lens centrada en el cursor, clampeada a los bordes del contenedor
    const lensX = Math.max(0, Math.min(x - LENS_SIZE / 2, rect.width - LENS_SIZE));
    const lensY = Math.max(0, Math.min(y - LENS_SIZE / 2, rect.height - LENS_SIZE));
    setLensPos({ x: lensX, y: lensY });

    // Para object-cover: la imagen natural se escala para cubrir el contenedor,
    // y luego se recorta. Necesitamos las dimensiones naturales para calcular
    // qué porción de la imagen se está mostrando.
    const naturalW = imgRef.current.naturalWidth || rect.width;
    const naturalH = imgRef.current.naturalHeight || rect.height;
    const coverScale = Math.max(rect.width / naturalW, rect.height / naturalH);
    const displayedW = naturalW * coverScale;
    const displayedH = naturalH * coverScale;
    // Cuánto se recorta a cada lado (la imagen cubre el contenedor y sobresale)
    const cropX = (displayedW - rect.width) / 2;
    const cropY = (displayedH - rect.height) / 2;
    // Punto de la imagen mostrada (sin recortar) que está bajo el cursor:
    const imgX = cropX + x;
    const imgY = cropY + y;

    setBgSize({ w: displayedW * ZOOM, h: displayedH * ZOOM });
    setBgPos({
      x: -(imgX * ZOOM - LENS_SIZE / 2),
      y: -(imgY * ZOOM - LENS_SIZE / 2),
    });
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => enabled && setShowLens(true)}
      onMouseLeave={() => setShowLens(false)}
      onMouseMove={enabled ? handleMouseMove : undefined}
      style={{ cursor: enabled ? 'zoom-in' : 'default' }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover select-none"
        draggable={false}
      />
      {enabled && showLens && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white shadow-2xl"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: lensPos.x,
            top: lensPos.y,
            backgroundImage: `url(${src})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${bgSize.w}px ${bgSize.h}px`,
            backgroundPosition: `${bgPos.x}px ${bgPos.y}px`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.2), 0 4px 20px rgba(0,0,0,0.3)',
          }}
        />
      )}
    </div>
  );
}

export function ProductDetail() {
  const { selectedProductId, setView, selectCategory, goBack } = useAppStore();
  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Gallery
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Variant selection (groupId -> optionId)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  // Extra selection (set of extraIds)
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());

  const { data: product, isLoading: loading } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: () => fetchProduct(selectedProductId!),
    enabled: !!selectedProductId,
  });

  // Reset selections y galería cuando cambia el producto (patrón "setState during render" recomendado por React).
  const [prevProductId, setPrevProductId] = useState<string | null>(selectedProductId ?? null);
  if ((selectedProductId ?? null) !== prevProductId) {
    setPrevProductId(selectedProductId ?? null);
    setSelectedImage(null);
    setSelectedOptions({});
    setSelectedExtras(new Set());
    setQuantity(1);
  }

  // Pre-seleccionar primera opción de cada grupo (también durante render cuando cambia product)
  const productGroupsKey = product?.variantGroups?.map((g) => `${g.id}:${g.options?.map((o) => o.id).join(',')}`).join('|') || '';
  const [prevGroupsKey, setPrevGroupsKey] = useState<string>('');
  if (productGroupsKey !== prevGroupsKey && product?.variantGroups && product.variantGroups.length > 0) {
    setPrevGroupsKey(productGroupsKey);
    setSelectedOptions((cur) => {
      const next = { ...cur };
      for (const g of product.variantGroups!) {
        if (!next[g.id]) {
          const firstAvail = (g.options || []).find((o) => o.available);
          if (firstAvail) next[g.id] = firstAvail.id;
        }
      }
      return next;
    });
  }

  const tags = useMemo(() => parseTags(product?.tags), [product?.tags]);
  const galleryImages = useMemo(() => parseStringArray(product?.images), [product?.images]);

  // Lista de imágenes de las opciones de variantes (para la columna de miniaturas).
  // Cada entrada referencia al grupo y la opción para poder seleccionarlos al hacer click.
  // Si hay un grupo marcado como dominante (isDominant), SÓLO se incluyen las opciones
  // de ese grupo. Si no hay grupo dominante, se incluyen las opciones de todos los grupos.
  const variantImages = useMemo<
    Array<{ src: string; alt: string; groupId: string; optionId: string; optionName: string; available: boolean }>
  >(() => {
    const list: Array<{ src: string; alt: string; groupId: string; optionId: string; optionName: string; available: boolean }> = [];
    if (product?.variantGroups) {
      const dominantGroup = product.variantGroups.find((g) => g.isDominant);
      const targetGroups = dominantGroup ? [dominantGroup] : product.variantGroups;
      for (const g of targetGroups) {
        for (const o of g.options || []) {
          if (o.image) {
            list.push({
              src: o.image,
              alt: o.name,
              groupId: g.id,
              optionId: o.id,
              optionName: o.name,
              available: o.available,
            });
          }
        }
      }
    }
    return list;
  }, [product]);

  // Imagen a mostrar en el cuadro principal:
  // 1. Si el cliente tocó un thumbnail (o un botón de variante) → esa imagen
  // 2. Sino → imagen principal del producto (por defecto)
  const currentImage = selectedImage || product?.image || '';

  const offerActive = product ? isOfferActive(product) : false;
  const basePrice = product ? (offerActive ? (product.offerPrice as number) : product.price) : 0;

  // Suma de priceMods de opciones seleccionadas
  const optionsPriceMod = useMemo(() => {
    if (!product?.variantGroups) return 0;
    let sum = 0;
    for (const g of product.variantGroups) {
      const optId = selectedOptions[g.id];
      if (!optId) continue;
      const opt = (g.options || []).find((o) => o.id === optId);
      if (opt) sum += Number(opt.priceMod) || 0;
    }
    return sum;
  }, [product, selectedOptions]);

  // Suma de priceMods de extras seleccionados
  const extrasPriceMod = useMemo(() => {
    if (!product?.productExtras) return 0;
    let sum = 0;
    for (const e of product.productExtras) {
      if (selectedExtras.has(e.id)) sum += Number(e.priceMod) || 0;
    }
    return sum;
  }, [product, selectedExtras]);

  const dynamicPrice = basePrice + optionsPriceMod + extrasPriceMod;

  // ── Precio al por mayor (wholesale) ──
  // Si el producto tiene wholesale habilitado y la cantidad seleccionada
  // califica para un tier, se usa el precio del tier en vez del minorista.
  // Prioridad: wholesaleTiers (rangos) > wholesalePrice legacy (precio único).
  const effectivePrice = useMemo(() => {
    if (!product?.wholesaleEnabled) return dynamicPrice;

    // 1. Buscar en wholesaleTiers (rangos con minQty/maxQty)
    if (product.wholesaleTiers && product.wholesaleTiers.length > 0) {
      const tiers = [...product.wholesaleTiers].sort((a, b) => a.minQty - b.minQty);
      let bestTier: WholesaleTier | null = null;
      for (const t of tiers) {
        if (quantity >= t.minQty && (t.maxQty === 0 || quantity <= t.maxQty)) {
          bestTier = t;
        }
      }
      if (bestTier && bestTier.price > 0) {
        // El precio del tier reemplaza el precio base, pero mantiene modificadores de variantes/extras
        return Number(bestTier.price) + optionsPriceMod + extrasPriceMod;
      }
    }

    // 2. Legacy: wholesalePrice único con wholesaleMinQty
    if ((product.wholesalePrice ?? 0) > 0 && quantity >= (product.wholesaleMinQty ?? 1)) {
      return Number(product.wholesalePrice) + optionsPriceMod + extrasPriceMod;
    }

    return dynamicPrice;
  }, [product, quantity, dynamicPrice, optionsPriceMod, extrasPriceMod]);

  // Stock efectivo: determina cuántas unidades se pueden comprar.
  // Prioridad:
  // 1. Si hay combinaciones y todas las opciones requeridas están seleccionadas → stock de la combinación
  // 2. Si hay variantes pero no combinaciones → stock de la opción seleccionada (mínimo entre grupos)
  // 3. Si no hay variantes → stock del producto
  const effectiveStock = useMemo(() => {
    if (!product) return 0;
    const groups = product.variantGroups || [];
    const hasCombis = !!(product.combinations && product.combinations.length > 0);
    const requiredGroups = groups.filter((g) => g.required);
    const allRequiredSelected = requiredGroups.every((g) => selectedOptions[g.id]);

    // 1. Combinaciones
    if (hasCombis && allRequiredSelected) {
      const match = findMatchingCombination(product, selectedOptions);
      if (match) return match.stock;
    }

    // 2. Variantes sin combinaciones: usar stock de la opción seleccionada
    if (groups.length > 0 && !hasCombis && allRequiredSelected) {
      // Tomar el mínimo stock entre las opciones seleccionadas de cada grupo
      const selectedStocks = groups.map((g) => {
        const optId = selectedOptions[g.id];
        const opt = (g.options || []).find((o) => o.id === optId);
        return Number(opt?.stock || 0);
      });
      if (selectedStocks.length > 0) {
        return Math.min(...selectedStocks);
      }
    }

    // 3. Sin variantes o sin selección completa → stock del producto
    return product.stock;
  }, [product, selectedOptions]);

  // ── Stock disponible para agregar al carrito ──
  // Es el stock efectivo MENOS lo que ya está en el carrito para este producto
  // con las mismas variantes. Si es 0 o negativo, el botón "+" se deshabilita
  // y el botón "Agregar al Carrito" también (excepto si es reservable).
  // IMPORTANTE: nos suscribimos a `cartItems` reactivamente para que
  // existingInCart se recalcule cuando el carrito cambia.
  const cartItems = useCartStore((s) => s.items);
  const existingInCart = useMemo(() => {
    if (!product) return 0;
    const variantInfoStr = JSON.stringify(
      (product.variantGroups || []).map((g) => {
        const optId = selectedOptions[g.id];
        const opt = (g.options || []).find((o) => o.id === optId);
        return { groupName: g.name, optionName: opt?.name || '' };
      })
    );
    return cartItems
      .filter((i) => i.productId === product.id && i.variantInfo === variantInfoStr)
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [product, selectedOptions, cartItems]);

  // Stock que todavía se puede agregar: effectiveStock - existingInCart
  const availableStock = Math.max(0, effectiveStock - existingInCart);

  // Reserva: si el producto tiene reservationEnabled y stock=0, el cliente
  // puede reservarlo. El botón cambia a "Reservar" y se mantiene habilitado.
  // Para productos con variantes, isReservable se calcula dinámicamente según
  // la opción seleccionada: si la opción tiene stock=0 Y el producto tiene
  // reservationEnabled, esa opción es reservable.
  // IMPORTANTE: este useMemo debe ir ANTES de los early returns (if loading / if !product)
  // para respetar las Rules of Hooks de React.
  const hasVariantGroups = !!(product?.variantGroups && product.variantGroups.length > 0);
  const isReservable = useMemo(() => {
    if (!product?.reservationEnabled) return false;
    // Sin variantes: reservable si stock del producto = 0
    if (!hasVariantGroups) return product.stock === 0;
    // Con variantes: reservable si la opción seleccionada tiene stock=0
    // (solo se puede evaluar si todas las opciones requeridas están seleccionadas)
    const groups = product.variantGroups || [];
    const requiredGroups = groups.filter((g) => g.required);
    if (requiredGroups.some((g) => !selectedOptions[g.id])) return false;
    // Si hay combinaciones, usar el stock de la combinación matching
    const match = findMatchingCombination(product, selectedOptions);
    if (match) return match.stock === 0;
    // Si no hay combinaciones, buscar si alguna opción seleccionada tiene stock=0
    const selectedOptionsData = groups.map((g) => {
      const optId = selectedOptions[g.id];
      return (g.options || []).find((o) => o.id === optId);
    }).filter(Boolean);
    if (selectedOptionsData.length === 0) return false;
    return selectedOptionsData.some((o) => Number(o?.stock || 0) === 0);
  }, [product, hasVariantGroups, selectedOptions]);

  const handleAddToCart = (forceReservation?: boolean) => {
    if (!product) return;

    // ── Validar compatibilidad de reservables en el carrito ──
    // Si el carrito ya tiene items reservables (isReservation=true) y el cliente
    // intenta agregar un item normal (forceReservation=false), o viceversa,
    // no permitirlo porque generaría un pedido con dos fechas de entrega.
    // Las mercancías SÍ pueden mezclarse con reservables.
    const willBeReservation = forceReservation ?? isReservable;
    const existingItems = useCartStore.getState().items;
    const hasReservationsInCart = existingItems.some((i) => i.isReservation);
    const hasNormalInCart = existingItems.some((i) => !i.isReservation);

    if (willBeReservation && hasNormalInCart) {
      toast({
        title: '⚠️ No puedes mezclar reservas con entregas normales',
        description: 'Tu carrito tiene productos para entrega hoy/mañana. Vacía el carrito para agregar reservas.',
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }
    if (!willBeReservation && hasReservationsInCart) {
      toast({
        title: '⚠️ No puedes mezclar entregas normales con reservas',
        description: 'Tu carrito tiene reservas con fecha futura. Vacía el carrito para agregar productos normales.',
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }

    // Validar grupos requeridos
    const requiredGroups = (product.variantGroups || []).filter((g) => g.required);
    const missing = requiredGroups.find((g) => !selectedOptions[g.id]);
    if (missing) {
      toast({
        title: 'Selecciona una opción',
        description: `Por favor selecciona una opción en "${missing.name}".`,
        variant: 'destructive',
      });
      return;
    }

    // Validar que ninguna opción seleccionada tenga stock=0 si NO es reservable.
    // Si una opción tiene stock=0 y el producto tiene reservationEnabled,
    // entonces es una reserva (isReservable=true) y se permite.
    // Si una opción tiene stock=0 y el producto NO tiene reservationEnabled,
    // no se puede agregar (debería estar deshabilitada en la UI, pero validamos
    // también aquí por seguridad).
    if (!isReservable) {
      const groups = product.variantGroups || [];
      const outOfStockOption = groups.find((g) => {
        const optId = selectedOptions[g.id];
        const opt = (g.options || []).find((o) => o.id === optId);
        return opt && Number(opt.stock || 0) === 0;
      });
      if (outOfStockOption) {
        const optId = selectedOptions[outOfStockOption.id];
        const opt = (outOfStockOption.options || []).find((o) => o.id === optId);
        toast({
          title: 'Opción sin stock',
          description: `La opción "${opt?.name || ''}" de "${outOfStockOption.name}" no tiene stock disponible.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar stock total antes de agregar (excepto si es reservable)
    // Si el producto es reservable (reservationEnabled && stock=0), se permite
    // agregar al carrito sin validación de stock.
    if (!isReservable) {
      // Usar el existingInCart ya calculado (reactivo a cartItems)
      if (existingInCart + quantity > effectiveStock) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${effectiveStock} unidad(es) disponible(s). Ya tienes ${existingInCart} en el carrito.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Construir el snapshot de variantes seleccionadas como JSON string.
    // Formato: [{ groupName, optionName, optionId }]
    // optionId se incluye para que el API de orders pueda decrementar el
    // stock individual de cada VariantOption al crear un pedido.
    const variantArr: { groupName: string; optionName: string; optionId?: string }[] = [];
    for (const g of (product.variantGroups || [])) {
      const optId = selectedOptions[g.id];
      if (!optId) continue;
      const opt = (g.options || []).find((o) => o.id === optId);
      if (opt) {
        variantArr.push({ groupName: g.name || '', optionName: opt.name || '', optionId: opt.id });
      }
    }
    // Construir el snapshot de extras seleccionados como JSON string.
    // Formato: [{ name, price }]
    const extrasArr: { name: string; price: number }[] = [];
    for (const e of (product.productExtras || [])) {
      if (selectedExtras.has(e.id)) {
        extrasArr.push({ name: e.name || '', price: Number(e.priceMod) || 0 });
      }
    }
    const variantInfoStr = JSON.stringify(variantArr);
    const extrasInfoStr = JSON.stringify(extrasArr);
    // Guardar info wholesale en el carrito para recalcular precio al cambiar cantidad
    const wholesaleTiers = (product.wholesaleTiers || []).map(t => ({
      minQty: Number(t.minQty) || 0,
      maxQty: Number(t.maxQty) || 0,
      price: Number(t.price) || 0,
    }));
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        basePrice: product.price,
        image: currentImage || product.image,
        variantInfo: variantInfoStr,
        extrasInfo: extrasInfoStr,
        // Si es reservable, no pasar stock para que el cart-store no bloquee
        // Si forceReservation viene del botón "Reservar" (producto con stock>0),
        // el item se marca como reserva. Si viene del botón "Agregar al Carrito",
        // NO es reserva (se descontará stock si no hay otros reservables).
        stock: (forceReservation ?? isReservable) ? undefined : effectiveStock,
        wholesaleEnabled: !!product.wholesaleEnabled,
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : 0,
        wholesaleMinQty: product.wholesaleMinQty ? Number(product.wholesaleMinQty) : 0,
        wholesaleTiers: wholesaleTiers.length > 0 ? wholesaleTiers : undefined,
        optionsPriceMod,
        extrasPriceMod,
        // Reserva: si el item es reservable, guardar flag y días de antelación
        isReservation: forceReservation ?? isReservable,
        reservationDays: (forceReservation ?? isReservable) ? Number(product.reservationDays || 0) : 0,
      });
    }
    setAdded(true);
    toast({
      title: 'Agregado al carrito',
      description: `${quantity}x ${product.name} se agregó a tu carrito.`,
    });
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Producto no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => goBack()}>
          Volver
        </Button>
      </div>
    );
  }

  // Destacado = solo etiqueta visual (estrella), NO inventa descuento.
  // El precio destacado es el mismo precio del producto, sin tachado ni cálculo.
  // Si se quiere un precio rebajado, se configura como Oferta (offerEnabled).
  const title = product.shortName?.trim() || product.name;

  // Wholesale activo si está habilitado Y hay al menos un mecanismo de precio
  // mayorista definido: rangos (wholesaleTiers) o precio legacy (wholesalePrice > 0).
  // Antes sólo se consideraba `wholesalePrice > 0`, lo que ocultaba la tabla de
  // rangos si el admin sólo configuraba tiers y dejaba el precio legacy en 0.
  const wholesaleActive = !!product.wholesaleEnabled && (
    (product.wholesaleTiers && product.wholesaleTiers.length > 0) ||
    (product.wholesalePrice ?? 0) > 0
  );

  // (isReservable ya está calculado arriba, antes de los early returns)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm min-w-0 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-brand-dark -ml-2"
          onClick={() => goBack()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <span className="text-gray-400">/</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-brand-dark -ml-2"
          onClick={() => selectCategory(product.category.slug)}
        >
          {product.category.image ? (
            <img
              src={product.category.image}
              alt=""
              className="h-4 w-4 rounded-full object-cover mr-1"
            />
          ) : null}
          {!product.category.image && product.category.icon ? `${product.category.icon} ` : ''}
          {product.category.name}
        </Button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{title}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image + Gallery + Zoom */}
        <div className="relative flex flex-col md:flex-row gap-3 min-w-0">
          {/* Columna de miniaturas a la izquierda del cuadro ampliado (vertical en escritorio):
              sólo imagen principal + imágenes de las opciones de variantes.
              En móvil se vuelve una tira horizontal arriba del cuadro ampliado. */}
          {(product.image || variantImages.length > 0) && (
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto w-full md:w-20 md:max-h-[600px] md:shrink-0 pb-1 md:pb-0 min-w-0">
              {/* Miniatura de la imagen principal del producto (siempre arriba) */}
              {product.image && (
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className={`relative h-16 w-16 md:w-full md:aspect-square rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                    currentImage === product.image ? 'border-brand' : 'border-gray-200 hover:border-brand-light'
                  }`}
                  aria-label="Imagen principal"
                  title="Imagen principal"
                >
                  <img src={product.image || '/products/placeholder.svg'} alt="Imagen principal" className="w-full h-full object-cover" />
                </button>
              )}
              {/* Miniaturas de las opciones de variantes (debajo de la imagen principal) */}
              {variantImages.map((v) => {
                const isCurrent = currentImage === v.src;
                return (
                  <button
                    key={`${v.groupId}-${v.optionId}`}
                    type="button"
                    disabled={!v.available}
                    onClick={() => {
                      // Al hacer click en la miniatura de la variante: selecciona la variante
                      // y lleva su imagen al cuadro ampliado.
                      setSelectedOptions({ ...selectedOptions, [v.groupId]: v.optionId });
                      setSelectedImage(v.src);
                    }}
                    className={`relative h-16 w-16 md:w-full md:aspect-square rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                      isCurrent ? 'border-brand' : 'border-gray-200 hover:border-brand-light'
                    } ${!v.available ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={v.optionName}
                    title={v.optionName}
                  >
                    <img src={v.src} alt={v.optionName} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Cuadro de vista ampliada + tira de galería debajo */}
          <div className="relative flex-1 min-w-0">
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-lg">
              {currentImage && (
                <ImageZoom src={currentImage} alt={product.name} />
              )}
              {product.featured && (
                <Badge className="absolute top-4 left-4 bg-brand text-white text-sm font-bold z-10">
                  ⭐ DESTACADO
                </Badge>
              )}
              {offerActive && (
                <Badge className="absolute top-4 right-4 bg-brand-dark text-white text-sm font-bold animate-pulse z-10">
                  OFERTA
                </Badge>
              )}
              {wholesaleActive && (
                <Badge className="absolute bottom-4 left-4 bg-emerald-500 text-white text-xs font-bold z-10 shadow-md">
                  💰 Por mayor
                </Badge>
              )}
              {product.stock === 0 && !isReservable && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <Badge className="bg-red-600 text-white text-base font-bold">SIN STOCK</Badge>
                </div>
              )}
              {product.stock === 0 && isReservable && (
                <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center z-20">
                  <Badge className="bg-amber-500 text-white text-base font-bold shadow-lg">📅 RESERVABLE</Badge>
                </div>
              )}
            </div>
            {/* Tira horizontal de miniaturas de la galería debajo del cuadro ampliado */}
            {galleryImages.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((src, i) => (
                  <button
                    key={`g-${i}`}
                    type="button"
                    onClick={() => setSelectedImage(src)}
                    className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                      currentImage === src ? 'border-brand' : 'border-gray-200 hover:border-brand-light'
                    }`}
                    aria-label={`Ver imagen ${i + 1}`}
                  >
                    <img src={src} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5 min-w-0">
          <div>
            <p className="text-sm text-brand-dark font-medium mb-1 flex items-center gap-1.5">
              {product.category.image ? (
                <img
                  src={product.category.image}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : null}
              {!product.category.image && product.category.icon ? `${product.category.icon} ` : ''}
              {product.category.name}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
            {product.sku && (
              <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>
            )}
            {/* Tags badges */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t.name}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.floor(product.rating) ? 'text-brand fill-brand' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            {product.reviewCount > 0 ? (
              <>
                <span className="text-sm text-gray-600">{product.rating}</span>
                <span className="text-sm text-gray-400">({product.reviewCount} reseña{product.reviewCount === 1 ? '' : 's'})</span>
              </>
            ) : (
              <span className="text-sm text-gray-400">Sin reseñas aún</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 flex-wrap">
            {offerActive ? (
              <>
                <span className="text-3xl font-bold text-brand-dark">${(product.offerPrice as number).toFixed(2)}</span>
                <span className="text-lg text-gray-400 line-through">${product.price.toFixed(2)}</span>
                <Badge className="bg-brand-light text-brand-dark text-xs">
                  Ahorras ${(product.price - (product.offerPrice as number)).toFixed(2)}
                </Badge>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
              </>
            )}
          </div>

          {/* Precio dinámico cuando hay variantes/extras seleccionados */}
          {(optionsPriceMod > 0 || extrasPriceMod > 0) && (
            <div className="p-3 bg-brand-light border border-brand-light rounded-lg">
              <p className="text-sm text-brand-dark">
                Precio total con variantes/extras: <strong>${effectivePrice.toFixed(2)}</strong>
              </p>
            </div>
          )}

          {/* Precio al por mayor */}
          {wholesaleActive && (() => {
            const tiers = (product.wholesaleTiers || []).slice().sort((a, b) => a.minQty - b.minQty);
            // Helpers para armar el rango legible
            const fmtQty = (t: WholesaleTier): string => {
              const max = Number(t.maxQty ?? 0);
              const min = Number(t.minQty ?? 0);
              if (max === 0) return `${min}+`;
              return `${min} - ${max}`;
            };
            return (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>💰</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 mb-2">Precios al por mayor</p>
                    {tiers.length > 0 ? (
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="text-left text-emerald-700">
                              <th className="font-semibold py-1.5 pr-3">Rango</th>
                              <th className="font-semibold py-1.5 pr-3">Cantidad</th>
                              <th className="font-semibold py-1.5 pr-3 text-right">Precio por unidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tiers.map((t) => (
                              <tr key={t.id} className="border-t border-emerald-200/70">
                                <td className="py-1.5 pr-3 font-medium text-emerald-900">{t.name || '—'}</td>
                                <td className="py-1.5 pr-3 text-emerald-800">{fmtQty(t)}</td>
                                <td className="py-1.5 pr-3 text-right font-bold text-emerald-900">
                                  ${Number(t.price ?? 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700">
                        Precio al por mayor: ${(product.wholesalePrice ?? 0).toFixed(2)} · Mínimo {product.wholesaleMinQty ?? 1} unidades
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <Separator />

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {/* Variant groups */}
          {product.variantGroups && product.variantGroups.length > 0 && (
            <div className="space-y-4">
              {product.variantGroups.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-semibold text-gray-800">{g.name}</Label>
                    {g.required && (
                      <span className="text-xs text-red-500 font-medium">* Obligatorio</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(g.options || []).map((o) => {
                      const isSelected = selectedOptions[g.id] === o.id;
                      // Una opción se deshabilita si:
                      // 1. Está marcada como no disponible (available=false), O
                      // 2. Tiene stock=0 Y el producto NO tiene reserva habilitada
                      //    (si tiene reserva habilitada, se puede reservar la opción con stock=0)
                      const optionStock = Number(o.stock || 0);
                      const optionOutOfStock = optionStock === 0;
                      const optionIsReservable = optionOutOfStock && !!product.reservationEnabled;
                      const disabled = !o.available || (optionOutOfStock && !product.reservationEnabled);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            const newSelectedOptions = { ...selectedOptions, [g.id]: o.id };
                            setSelectedOptions(newSelectedOptions);
                            // Reset cantidad a 1 al cambiar de opción de variante
                            setQuantity(1);
                            // Decidir qué imagen mostrar en el cuadro ampliado:
                            // 1. Si la opción tiene imagen propia (grupo dominante) → esa imagen.
                            // 2. Si no, buscar la combinación que coincide con la nueva selección
                            //    y mostrar su imagen (que por defecto viene del grupo dominante).
                            // 3. Si no hay combinación matching → mantener la imagen actual (no
                            //    revertir a la imagen principal del producto).
                            if (o.image) {
                              setSelectedImage(o.image);
                            } else {
                              const match = findMatchingCombination(product, newSelectedOptions);
                              if (match?.image) {
                                setSelectedImage(match.image);
                              }
                              // else: no hacer nada, se mantiene el selectedImage actual
                            }
                          }}
                          className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            isSelected
                              ? optionIsReservable
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-brand bg-brand-light text-brand-dark'
                              : 'border-gray-200 hover:border-brand-light bg-white text-gray-700'
                          } ${disabled ? 'opacity-40 cursor-not-allowed line-through' : 'cursor-pointer'}`}
                        >
                          {o.image && (
                            <img src={o.image} alt={o.name} className="h-6 w-6 rounded object-cover" />
                          )}
                          <span className="font-medium">{o.name}</span>
                          {o.priceMod > 0 && (
                            <span className="text-xs text-gray-500">+${o.priceMod.toFixed(2)}</span>
                          )}
                          {o.priceMod < 0 && (
                            <span className="text-xs text-green-600">${o.priceMod.toFixed(2)}</span>
                          )}
                          {/* Etiqueta de stock por opción */}
                          {optionOutOfStock && optionIsReservable && (
                            <span className="text-[10px] font-semibold text-amber-600 ml-1">📅 Reservable</span>
                          )}
                          {optionOutOfStock && !optionIsReservable && (
                            <span className="text-[10px] font-semibold text-red-500 ml-1">Sin stock</span>
                          )}
                          {optionStock > 0 && optionStock <= 5 && (
                            <span className="text-[10px] font-semibold text-orange-500 ml-1">¡Solo {optionStock}!</span>
                          )}
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand-dark" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extras */}
          {product.productExtras && product.productExtras.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-2 block">Extras</Label>
              <div className="space-y-2">
                {product.productExtras.map((e) => {
                  const checked = selectedExtras.has(e.id);
                  return (
                    <label
                      key={e.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked ? 'border-brand-light bg-brand-light' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          setSelectedExtras((cur) => {
                            const next = new Set(cur);
                            if (ev.target.checked) next.add(e.id);
                            else next.delete(e.id);
                            return next;
                          });
                        }}
                        className="mt-0.5 h-4 w-4 accent-brand"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">{e.name}</span>
                          <span className="text-sm font-semibold text-brand-dark whitespace-nowrap">
                            +${e.priceMod.toFixed(2)}
                          </span>
                        </div>
                        {e.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2">
            {effectiveStock > 5 ? (
              <Badge className="bg-green-100 text-green-700">✓ En Stock</Badge>
            ) : effectiveStock > 0 ? (
              <Badge className="bg-brand-light text-brand-dark">¡Solo {effectiveStock} disponibles!</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700">Agotado</Badge>
            )}
          </div>

          {/* Quantity */}
          {effectiveStock > 0 && !isReservable && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Cantidad:</span>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  disabled={availableStock <= 0 || quantity >= effectiveStock}
                  onClick={() => {
                    if (availableStock <= 0 || quantity >= effectiveStock) {
                      toast({
                        title: 'Stock insuficiente',
                        description: `Solo hay ${effectiveStock} unidad(es) disponible(s). Ya tienes ${existingInCart} en el carrito.`,
                        variant: 'destructive',
                      });
                      return;
                    }
                    setQuantity(quantity + 1);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {existingInCart > 0 && (
                <span className="text-xs text-gray-500">
                  (ya tienes {existingInCart} en el carrito)
                </span>
              )}
            </div>
          )}
          {isReservable && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Cantidad a reservar:</span>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Add to cart / Reservar */}
          {/* Caso 1: Producto reservable con stock=0 → solo botón Reservar */}
          {/* Caso 2: Producto reservable con stock>0 → dos botones: Reservar + Agregar */}
          {/* Caso 3: Producto normal → solo botón Agregar al Carrito */}
          {product.reservationEnabled && effectiveStock > 0 && !isReservable ? (
            // Caso 2: dos botones
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg h-12 text-base shadow-amber/25"
                onClick={() => handleAddToCart(true)}
              >
                {added ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Reserva Agregada
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Reservar — ${(effectivePrice * quantity).toFixed(2)}
                  </>
                )}
              </Button>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark text-white shadow-lg h-12 text-base shadow-brand/25"
                disabled={availableStock === 0}
                onClick={() => handleAddToCart(false)}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Agregar al Carrito — ${(effectivePrice * quantity).toFixed(2)}
              </Button>
            </div>
          ) : (
            // Caso 1 y 3: un solo botón
            <Button
              size="lg"
              className={`w-full text-white shadow-lg h-12 text-base ${
                isReservable
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber/25'
                  : 'bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark shadow-brand/25'
              }`}
              disabled={availableStock === 0 && !isReservable}
              onClick={() => handleAddToCart(isReservable)}
            >
              {added ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {isReservable ? 'Reserva Agregada' : 'Agregado al Carrito'}
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isReservable
                    ? `Reservar — ${(effectivePrice * quantity).toFixed(2)}`
                    : `Agregar al Carrito — ${(effectivePrice * quantity).toFixed(2)}`}
                </>
              )}
            </Button>
          )}

        </div>
      </div>

      {/* Sección de Reseñas */}
      <ProductReviews productId={product.id} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN DE RESEÑAS DEL PRODUCTO
// ════════════════════════════════════════════════════════════════════════════

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  adminReply: string;
  createdAt: string;
}

function ProductReviews({ productId }: { productId: string }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '', authorName: '' });

  const fetchReviews = () => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReviews(); /* eslint-disable-next-line */ }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comment.trim()) {
      toast({ title: 'Comentario requerido', description: 'Escribe tu reseña.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('diaz-customer-token') : null;
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId,
          rating: form.rating,
          comment: form.comment,
          authorName: form.authorName || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Reseña enviada', description: 'Tu reseña será revisada por un administrador antes de publicarse.' });
        setForm({ rating: 5, comment: '', authorName: '' });
        setShowForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: err.error || 'No se pudo enviar.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8">
      <Separator className="mb-6" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand" />
          Reseñas ({reviews.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="border-brand-light text-brand-dark hover:bg-brand-light"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : 'Escribir reseña'}
        </Button>
      </div>

      {/* Formulario de reseña */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Tu valoración</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, rating: n })}
                  >
                    <Star className={`h-7 w-7 transition-colors ${n <= form.rating ? 'text-brand fill-brand' : 'text-gray-300 hover:text-brand'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-name">Tu nombre (opcional)</Label>
              <Input
                id="review-name"
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                placeholder="Anónimo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comment">Tu reseña *</Label>
              <Textarea
                id="review-comment"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Comparte tu experiencia con este producto…"
                rows={3}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting} className="bg-brand hover:bg-brand-dark text-white">
                {submitting ? 'Enviando…' : 'Enviar reseña'}
              </Button>
              <p className="text-xs text-gray-500">Tu reseña será revisada antes de publicarse.</p>
            </div>
          </form>
        </div>
      )}

      {/* Lista de reseñas aprobadas */}
      {loading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Star className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">{r.authorName}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-brand fill-brand' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(r.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
              <p className="text-sm text-gray-700">{r.comment}</p>
              {r.adminReply && (
                <div className="mt-2 bg-brand-light border border-brand-light rounded-lg p-2.5">
                  <p className="text-xs text-brand-dark"><strong>Respuesta de la tienda:</strong> {r.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
