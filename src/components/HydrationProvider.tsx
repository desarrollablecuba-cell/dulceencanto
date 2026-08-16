'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';

/**
 * Rehydrates the cart store from localStorage after mount.
 * Currently unused (page.tsx handles rehydration inline), but kept
 * as a utility component for future use.
 */
export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const setHydrated = useCartStore((s) => s.setHydrated);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('diaz-premium-cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.state?.items) {
          useCartStore.setState({ items: parsed.state.items });
        }
      }
    } catch {
      // ignore parse errors
    }
    setHydrated();
  }, [setHydrated]);

  return <>{children}</>;
}
