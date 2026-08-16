'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HOME_SECTIONS, type HomeSectionId } from '@/components/ecommerce/HomeSections';

interface SectionOrderEditorProps {
  /** Orden actual separado por comas: 'hero,benefits,catalog,...' */
  value: string;
  /** Estado de activación: JSON string { sectionId: boolean } */
  enabledValue: string;
  /** Callback cuando cambia el orden. */
  onChange: (next: string) => void;
  /** Callback cuando cambia el estado de activación. */
  onEnabledChange: (next: string) => void;
}

interface SortableItemProps {
  sectionId: HomeSectionId;
  index: number;
  total: number;
  enabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}

function SortableItem({ sectionId, index, total, enabled, onMoveUp, onMoveDown, onToggleEnabled }: SortableItemProps) {
  const section = HOME_SECTIONS.find((s) => s.id === sectionId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionId, disabled: !enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : enabled ? 1 : 0.75,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-white border rounded-lg p-2.5 transition-opacity ${
        isDragging ? 'border-amber-500 shadow-lg' : enabled ? 'border-gray-200' : 'border-gray-100'
      }`}
    >
      {/* Drag handle — reducido para dar más espacio al nombre. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none p-0.5 -mx-0.5 shrink-0"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icono + nombre — el contenedor es flex-1 para ocupar todo el
          espacio disponible y que el nombre se muestre completo cuando
          sea posible (solo truncar si es estrictamente necesario). */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-sm shrink-0 ${enabled ? 'bg-amber-100' : 'bg-gray-100'}`}>
          {section?.icon || '📄'}
        </span>
        <p className={`text-sm font-medium truncate ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>
          {section?.label || sectionId}
        </p>
        <span className="text-[10px] text-gray-400 shrink-0 font-mono">
          #{index + 1}
        </span>
      </div>

      {/* Toggle activar/desactivar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[10px] font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
          {enabled ? 'Activa' : 'Inactiva'}
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={onToggleEnabled}
          aria-label={`Activar sección ${section?.label}`}
        />
      </div>

      {/* Botones subir/bajar */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Subir sección"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Bajar sección"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function parseEnabled(json: string): Record<string, boolean> {
  if (!json || !json.trim()) return {};
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function SectionOrderEditor({ value, enabledValue, onChange, onEnabledChange }: SectionOrderEditorProps) {
  const parseIds = (str: string): HomeSectionId[] => {
    const validIds = new Set(HOME_SECTIONS.map((s) => s.id));
    // Migrar IDs legacy antes de filtrar:
    //  - `socialProof` → `socialStats`
    //  - `testimonials` (v48) → `storeReviews` (v49: unificados para no duplicar)
    const rawIds = str.split(',').map((s) => s.trim()).filter(Boolean);
    const migrated: string[] = [];
    for (const id of rawIds) {
      if (id === 'socialProof') {
        if (!migrated.includes('socialStats')) migrated.push('socialStats');
      } else if (id === 'testimonials') {
        if (!migrated.includes('storeReviews')) migrated.push('storeReviews');
      } else {
        migrated.push(id);
      }
    }
    const ids = migrated as HomeSectionId[];
    const valid = ids.filter((id) => validIds.has(id));
    for (const s of HOME_SECTIONS) {
      if (!valid.includes(s.id)) valid.push(s.id);
    }
    return valid;
  };

  const [items, setItems] = useState<HomeSectionId[]>(parseIds(value));
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(parseEnabled(enabledValue));
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Al montar, si hay secciones faltantes en el orden guardado,
  // sincronizar el orden para que incluya todas las secciones disponibles.
  useEffect(() => {
    const parsed = parseIds(value);
    const savedIds = value.split(',').map(s => s.trim()).filter(Boolean);
    if (parsed.length > savedIds.length) {
      onChange(parsed.join(','));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isSectionEnabled = (id: HomeSectionId): boolean => {
    // Default: true si no está en el mapa.
    return enabledMap[id] !== false;
  };

  const applyOrderToIframe = useCallback((order: HomeSectionId[], enabled: Record<string, boolean>) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      type: 'DPE_HOME_SECTIONS_ORDER',
      order,
      enabled,
    }, '*');
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.indexOf(active.id as HomeSectionId);
      const newIndex = prev.indexOf(over.id as HomeSectionId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      onChange(next.join(','));
      applyOrderToIframe(next, enabledMap);
      return next;
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = arrayMove(prev, index, newIndex);
      onChange(next.join(','));
      applyOrderToIframe(next, enabledMap);
      return next;
    });
  };

  const toggleEnabled = (id: HomeSectionId, enabled: boolean) => {
    const nextMap = { ...enabledMap, [id]: enabled };
    setEnabledMap(nextMap);
    onEnabledChange(JSON.stringify(nextMap));
    applyOrderToIframe(items, nextMap);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.8fr)] gap-4">
      {/* Columna izquierda: lista ordenable con toggles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
          <span>☰</span> Secciones (arrastra para reordenar · toggle para activar/desactivar)
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((id, index) => (
              <SortableItem
                key={id}
                sectionId={id}
                index={index}
                total={items.length}
                enabled={isSectionEnabled(id)}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
                onToggleEnabled={(en) => toggleEnabled(id, en)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Columna derecha: vista previa REAL de la tienda */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
          <span>👁️</span> Vista previa en vivo de la tienda
        </p>
        <div className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
          <div className="bg-gray-100 px-3 py-2 flex items-center gap-1.5 border-b border-gray-200">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div className="ml-2 flex-1 h-4 bg-white rounded text-[9px] text-gray-400 flex items-center px-2 truncate">
              mi-tienda.com
            </div>
          </div>
          <iframe
            ref={iframeRef}
            src="/"
            title="Vista previa de la tienda"
            className="w-full"
            style={{ height: '600px', border: 'none' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <p className="text-[10px] text-gray-500 text-center">
          Vista real de la tienda. Los cambios se aplican en tiempo real.
        </p>
      </div>
    </div>
  );
}
