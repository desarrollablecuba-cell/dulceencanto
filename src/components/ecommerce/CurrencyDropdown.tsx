'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CurrencyDropdownProps {
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Dropdown de moneda reutilizable.
 * Permite al cliente alternar entre CUP (Peso Cubano) y USD (Zelle).
 * La selección se guarda en localStorage y se emite un evento global
 * para que todas las secciones actualicen los precios mostrados.
 */
export function CurrencyDropdown({ variant = 'light', className = '' }: CurrencyDropdownProps) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<'CUP' | 'USD'>(() => {
    if (typeof window === 'undefined') return 'CUP';
    return (localStorage.getItem('de-currency') as 'CUP' | 'USD') || 'CUP';
  });

  const toggle = () => setOpen(!open);

  const select = (c: 'CUP' | 'USD') => {
    setCurrency(c);
    localStorage.setItem('de-currency', c);
    window.dispatchEvent(new CustomEvent('de:currency-change', { detail: c }));
    setOpen(false);
  };

  const isDark = variant === 'dark';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
        style={{
          background: isDark ? 'rgba(255,255,255,0.1)' : '#F3E8FF',
          color: isDark ? '#FFF' : '#7E22CE',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#DDD6FE'}`,
        }}
        aria-label="Cambiar moneda"
      >
        <span>{currency === 'CUP' ? '₱' : '$'}</span>
        <span>{currency}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ background: '#FFF', border: '1px solid #FBCFE8', minWidth: '140px' }}
          >
            <button
              onClick={() => select('CUP')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-pink-50 transition-colors text-left"
              style={{ color: currency === 'CUP' ? '#A855F7' : '#2E1065' }}
            >
              <span className="text-base">₱</span>
              <div>
                <p className="font-semibold">CUP</p>
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Peso Cubano</p>
              </div>
              {currency === 'CUP' && <span className="ml-auto text-xs">✓</span>}
            </button>
            <button
              onClick={() => select('USD')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-pink-50 transition-colors text-left"
              style={{ color: currency === 'USD' ? '#EC4899' : '#2E1065' }}
            >
              <span className="text-base">$</span>
              <div>
                <p className="font-semibold">USD</p>
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Zelle (exterior)</p>
              </div>
              {currency === 'USD' && <span className="ml-auto text-xs">✓</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
