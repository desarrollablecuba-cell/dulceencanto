'use client';

/**
 * Skeleton de carga para la página de inicio.
 *
 * Muestra una representación visual de las secciones del home mientras
 * se cargan los datos reales. Mejora la percepción de velocidad al
 * dar feedback inmediato al usuario.
 */

export function HomeSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 animate-pulse">
      {/* Hero skeleton */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-200 h-[260px] sm:h-[400px] md:h-[500px] mb-4" />

      {/* Benefits skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Category carousel skeleton */}
      <div className="space-y-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-200" />
              <div className="h-5 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-16 ml-auto" />
            </div>
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 shrink-0 space-y-2">
                  <div className="aspect-square bg-gray-200 rounded-xl" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                  <div className="h-7 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para carruseles individuales mientras cargan productos.
 */
export function CarouselSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, j) => (
        <div key={j} className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 shrink-0 space-y-2 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-2 bg-gray-100 rounded w-1/2" />
          <div className="h-7 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
