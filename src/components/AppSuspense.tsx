'use client';

import { Suspense } from 'react';

export function AppSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mb-4" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
