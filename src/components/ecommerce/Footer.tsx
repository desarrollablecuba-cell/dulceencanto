'use client';

import { useState, useEffect } from 'react';
import { Phone, MapPin } from 'lucide-react';
import { SocialIcon } from '@/components/ecommerce/SocialIcons';

export function Footer() {
  const [config, setConfig] = useState<{
    phone: string; whatsappNumber: string; storeName: string; address: string;
    tagline: string; logo: string;
    socialLinks: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          phone: data.phone || '+5350782825',
          whatsappNumber: data.whatsappNumber || '+5350782825',
          storeName: data.storeName || 'Dulce Encanto',
          address: data.address || 'Ciego de Ávila, Cuba',
          tagline: data.tagline || 'Calidad y confianza en cada envío.',
          logo: data.logo || '/logo-real.webp',
          socialLinks: data.socialLinks || '[]',
        });
      })
      .catch(() => {});
  }, []);

  const phone = config?.phone || '+5351111111';
  const whatsapp = config?.whatsappNumber || '+5351111111';
  const whatsappUrl = `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`;
  const logo = config?.logo || '';
  const storeName = config?.storeName || 'Dulce Encanto';
  const tagline = config?.tagline || 'Sabor y elegancia para tus momentos especiales';
  const address = config?.address || 'Calle Maceo 54, Ciego de Ávila, Cuba';

  const socialLinks = (() => {
    try {
      const p = JSON.parse(config?.socialLinks || '[]');
      return Array.isArray(p) ? p.filter((s: { visible: boolean }) => s.visible) : [];
    } catch { return []; }
  })();

  return (
    <footer className="bg-footer-bg text-footer-text mt-auto">
      <div className="max-w-[1600px] mx-auto px-4 py-8 md:py-10">
        {/* Layout: 2 columnas en desktop (brand + contacto | redes),
            1 columna en móvil (apiladas, centradas). */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">

          {/* ═══ COLUMNA IZQUIERDA: Brand + Contacto ═══ */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 text-center md:text-left">
            {logo ? (
              <img
                src={logo}
                alt={storeName}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }} aria-hidden>
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <h3 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{storeName}</h3>
                <span className="text-[10px] text-footer-accent font-semibold tracking-wider uppercase">
                  Repostería
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3 leading-relaxed max-w-md">
                {tagline}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1.5 text-sm">
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-footer-accent transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {phone}
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-400 hover:text-footer-accent transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.944-11.892a11.821 11.821 0 00-3.495-8.413z"/>
                  </svg>
                  {whatsapp}
                </a>
                <p className="flex items-center gap-1.5 text-gray-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {address}
                </p>
              </div>
            </div>
          </div>

          {/* ═══ COLUMNA DERECHA: Redes sociales ═══ */}
          {socialLinks.length > 0 && (
            <div className="flex flex-col items-center md:items-end gap-2">
              <p className="text-xs text-gray-500 font-medium tracking-wider uppercase">
                Síguenos
              </p>
              <div className="flex gap-2.5 flex-wrap justify-center md:justify-end">
                {socialLinks.map((social: { platform: string; url: string; icon?: string }, i: number) => {
                  const iconName = (social.icon || social.platform || '').toLowerCase();
                  return (
                    <a
                      key={i}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-footer-accent flex items-center justify-center transition-all hover:-translate-y-0.5 hover:scale-110"
                      title={social.platform}
                      aria-label={social.platform}
                    >
                      <SocialIcon platform={iconName} className="h-5 w-5" brandColor />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Parte inferior: copyright */}
        <div className="border-t border-white/10 mt-6 pt-4 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
