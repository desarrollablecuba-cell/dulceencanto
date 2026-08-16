'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Truck, Check, ChevronDown, Search, MapPin, X } from 'lucide-react';

export interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  active: boolean;
  order: number;
  allowsPriorityDelivery?: boolean;
}

interface ZoneSelectorProps {
  zones: DeliveryZone[];
  value: string;
  onChange: (zoneId: string) => void;
  /** Si true, las zonas se muestran con badge "GRATIS" en vez del precio. */
  showFreeLabel?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Selector moderno de zonas de delivery con buscador integrado.
 *
 * - Las zonas se ordenan alfabéticamente por nombre (case-insensitive).
 * - Buscador en tiempo real (filtra por nombre, descripción o tiempo estimado).
 * - Lista con scroll limitado (max-h-72) para soportar 20+ zonas sin ocupar toda la pantalla.
 * - Muestra precio + tiempo estimado en cada opción.
 * - Trigger compacto que muestra la zona seleccionada o el placeholder.
 */
export function ZoneSelector({
  zones,
  value,
  onChange,
  showFreeLabel = false,
  disabled = false,
  placeholder = 'Selecciona tu zona de delivery…',
}: ZoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);

  // Medir el ancho del trigger para que el popover coincida y no se vea desproporcionado.
  useEffect(() => {
    if (!open) return;
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // Ordenar zonas alfabéticamente por nombre (case-insensitive, sin acentos).
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      const an = a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bn = b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return an.localeCompare(bn);
    });
  }, [zones]);

  // Filtrar por query (busca en nombre, descripción y tiempo estimado).
  const filteredZones = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return sortedZones;
    return sortedZones.filter((z) => {
      const haystack = `${z.name} ${z.description} ${z.estimatedTime}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return haystack.includes(q);
    });
  }, [sortedZones, query]);

  const selectedZone = zones.find((z) => z.id === value) ?? null;

  const handleSelect = (zoneId: string) => {
    onChange(zoneId);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={`group flex w-full items-center gap-2.5 rounded-xl border-2 bg-white px-3.5 py-3 text-left text-sm transition-all
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-brand-light'}
            ${selectedZone ? 'border-brand bg-brand-light/40' : 'border-gray-200'}
            focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
            ${selectedZone ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-brand-light group-hover:text-brand-dark'}`}>
            <Truck className="h-4.5 w-4.5" />
          </span>

          <span className="flex-1 min-w-0">
            {selectedZone ? (
              <>
                <span className="block font-semibold text-gray-900 truncate">
                  {selectedZone.name}
                </span>
                <span className="block text-xs text-gray-500 truncate">
                  Entrega: {selectedZone.estimatedTime}
                  {' · '}
                  <span className="font-medium text-brand-dark">
                    {showFreeLabel ? 'GRATIS' : `$${Number(selectedZone.price).toFixed(2)}`}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="block font-medium text-gray-700">{placeholder}</span>
                <span className="block text-xs text-gray-400">
                  Busca y elige tu zona de entrega
                </span>
              </>
            )}
          </span>

          {selectedZone && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 max-h-[420px]"
        style={triggerWidth ? { width: triggerWidth, minWidth: 'min(28rem, 100vw)' } : { minWidth: 'min(28rem, 100vw)' }}
      >
        <Command shouldFilter={false} className="rounded-xl">
          <CommandInput
            placeholder="Buscar por nombre, municipio o tiempo…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            {filteredZones.length === 0 ? (
              <CommandEmpty>
                No se encontraron zonas para “{query}”.
              </CommandEmpty>
            ) : (
              <CommandGroup heading={`${filteredZones.length} zona${filteredZones.length === 1 ? '' : 's'} disponible${filteredZones.length === 1 ? '' : 's'}`}>
                {filteredZones.map((zone) => {
                  const isSelected = zone.id === value;
                  return (
                    <CommandItem
                      key={zone.id}
                      value={zone.id}
                      onSelect={() => handleSelect(zone.id)}
                      className="!items-start gap-2.5 py-2.5"
                      aria-selected={isSelected}
                    >
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md
                        ${isSelected ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <MapPin className="h-3.5 w-3.5" />
                      </span>

                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm leading-tight">
                            {zone.name}
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold
                            ${isSelected ? 'bg-brand text-white' : 'bg-brand-light text-brand-dark'}`}>
                            {showFreeLabel ? 'GRATIS' : `$${Number(zone.price).toFixed(2)}`}
                          </span>
                        </span>
                        {zone.description && (
                          <span className="block text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                            {zone.description}
                          </span>
                        )}
                        <span className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            ⏱ Entrega estimada: <span className="font-medium">{zone.estimatedTime}</span>
                          </span>
                          {zone.allowsPriorityDelivery && (
                            <span className="inline-flex items-center gap-0.5 text-brand-dark font-medium" title="Esta zona permite entrega prioritaria">
                              ⚡ Prioritaria
                            </span>
                          )}
                        </span>
                      </span>

                      {isSelected && (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        {/* Footer informativo */}
        <div className="border-t bg-gray-50/60 px-3 py-2 flex items-center gap-1.5 text-[11px] text-gray-500 rounded-b-xl">
          <Search className="h-3 w-3" />
          <span>Ordenadas alfabéticamente · Elige la zona donde se realizará la entrega</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
