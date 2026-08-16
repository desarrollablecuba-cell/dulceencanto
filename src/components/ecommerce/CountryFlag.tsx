'use client';

/**
 * Catálogo de países con abreviatura ISO y nombre en español.
 * Centralizado para reutilizar en AdminPanel, CustomerView, CheckoutForm, etc.
 */
export const COUNTRY_INFO: Record<string, { abbr: string; name: string; dial?: string }> = {
  US: { abbr: 'US', name: 'Estados Unidos', dial: '+1' },
  CU: { abbr: 'CU', name: 'Cuba', dial: '+53' },
  ES: { abbr: 'ES', name: 'España', dial: '+34' },
  MX: { abbr: 'MX', name: 'México', dial: '+52' },
  CA: { abbr: 'CA', name: 'Canadá', dial: '+1' },
  CO: { abbr: 'CO', name: 'Colombia', dial: '+57' },
  AR: { abbr: 'AR', name: 'Argentina', dial: '+54' },
  CL: { abbr: 'CL', name: 'Chile', dial: '+56' },
  PE: { abbr: 'PE', name: 'Perú', dial: '+51' },
  EC: { abbr: 'EC', name: 'Ecuador', dial: '+593' },
  DO: { abbr: 'DO', name: 'Rep. Dominicana', dial: '+1' },
  PA: { abbr: 'PA', name: 'Panamá', dial: '+507' },
  CR: { abbr: 'CR', name: 'Costa Rica', dial: '+506' },
  GT: { abbr: 'GT', name: 'Guatemala', dial: '+502' },
  HN: { abbr: 'HN', name: 'Honduras', dial: '+504' },
  NI: { abbr: 'NI', name: 'Nicaragua', dial: '+505' },
  SV: { abbr: 'SV', name: 'El Salvador', dial: '+503' },
  BO: { abbr: 'BO', name: 'Bolivia', dial: '+591' },
  PY: { abbr: 'PY', name: 'Paraguay', dial: '+595' },
  UY: { abbr: 'UY', name: 'Uruguay', dial: '+598' },
  VE: { abbr: 'VE', name: 'Venezuela', dial: '+58' },
};

/**
 * Renderiza una banderita (imagen PNG de flagcdn.com) + la abreviatura
 * internacional del país.
 *
 * Usamos imágenes en vez de emojis porque los emojis de bandera NO
 * renderizan en Windows (se ven como las dos letras del código ISO,
 * ej. "CU" en vez de 🇨🇺), lo que provocaba que se viera "CU CU".
 *
 * @param code  Código ISO 3166-1 alpha-2 del país (ej. "CU", "US").
 * @param showAbbr  Si true (default), muestra la abreviatura al lado de la bandera.
 * @param showName  Si true, muestra también el nombre completo del país.
 * @param size  Tamaño de la bandera: 'sm' (12px, default) o 'md' (16px).
 */
export function CountryFlag({
  code,
  showAbbr = true,
  showName = false,
  size = 'sm',
  className = '',
}: {
  code?: string | null;
  showAbbr?: boolean;
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  // Si no hay código, mostrar un guion (cliente sin país definido).
  if (!code) {
    return <span className={`text-gray-400 ${className}`}>—</span>;
  }
  const safeCode = code.toUpperCase();
  const info = COUNTRY_INFO[safeCode];
  const abbr = info?.abbr || safeCode;
  const name = info?.name || safeCode;
  const lower = safeCode.toLowerCase();
  const imgSize = size === 'md' ? 'h-4 w-5' : 'h-3 w-4';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <img
        src={`https://flagcdn.com/w20/${lower}.webp`}
        srcSet={`https://flagcdn.com/w40/${lower}.png 2x`}
        alt={abbr}
        className={`${imgSize} object-cover rounded-[2px] shadow-sm`}
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      {showAbbr && <span className="font-semibold">{abbr}</span>}
      {showName && <span className="text-gray-500 font-normal">— {name}</span>}
    </span>
  );
}

/**
 * Helper para obtener el nombre de un país a partir de su código.
 * Útil para selects nativos que no pueden renderizar imágenes.
 */
export function getCountryName(code?: string | null): string {
  if (!code) return '';
  return COUNTRY_INFO[code.toUpperCase()]?.name || code.toUpperCase();
}
