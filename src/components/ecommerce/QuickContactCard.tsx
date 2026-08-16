'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Clock, MapPin, Instagram, Facebook } from 'lucide-react';

interface SiteConfig {
  storeName: string;
  phone: string;
  whatsappNumber: string;
  instagram: string;
  facebook: string;
  scheduleLunes: string;
  scheduleMartes: string;
  scheduleMiercoles: string;
  scheduleJueves: string;
  scheduleViernes: string;
  scheduleSabado: string;
  scheduleDomingo: string;
}

const DEFAULT_CONFIG: Partial<SiteConfig> = {
  storeName: 'Dulce Encanto',
  phone: '+5351111111',
  whatsappNumber: '5351111111',
  instagram: 'https://instagram.com',
  facebook: 'https://facebook.com',
};

/**
 * QuickContactCard
 *
 * Tarjeta de contacto rápido que se muestra cerca del final del home.
 * Combina:
 *  - Botón grande de WhatsApp (CTA principal).
 *  - Botón secundario de llamada telefónica.
 *  - Horario resumido (hoy).
 *  - Ubicación (Ciego de Ávila, Cuba).
 *  - Enlaces a redes sociales (Instagram, Facebook).
 *
 * Está pensada para móvil y desktop. El WhatsApp abre wa.me con mensaje
 * pre-escrito. La llamada usa tel:.
 */
export function QuickContactCard() {
  const [config, setConfig] = useState<Partial<SiteConfig>>(DEFAULT_CONFIG);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          storeName: data.storeName || DEFAULT_CONFIG.storeName,
          phone: data.phone || DEFAULT_CONFIG.phone,
          whatsappNumber: data.whatsappNumber || DEFAULT_CONFIG.whatsappNumber,
          instagram: data.instagram || DEFAULT_CONFIG.instagram,
          facebook: data.facebook || DEFAULT_CONFIG.facebook,
          scheduleLunes: data.scheduleLunes || '',
          scheduleMartes: data.scheduleMartes || '',
          scheduleMiercoles: data.scheduleMiercoles || '',
          scheduleJueves: data.scheduleJueves || '',
          scheduleViernes: data.scheduleViernes || '',
          scheduleSabado: data.scheduleSabado || '',
          scheduleDomingo: data.scheduleDomingo || '',
        });
      })
      .catch(() => {});
  }, []);

  // Calcular horario de hoy (memoizado para evitar recálculos innecesarios).
  // Derivado directamente de `config`, no requiere useEffect.
  const todayHours = useMemo(() => {
    const dayMap: Record<number, keyof SiteConfig> = {
      0: 'scheduleDomingo',
      1: 'scheduleLunes',
      2: 'scheduleMartes',
      3: 'scheduleMiercoles',
      4: 'scheduleJueves',
      5: 'scheduleViernes',
      6: 'scheduleSabado',
    };
    const today = new Date().getDay();
    const field = dayMap[today];
    return (config as Record<string, string | undefined>)[field] || '';
  }, [config]);

  const whatsappUrl = `https://wa.me/${(config.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent('¡Hola! 👋 Quiero hacer una consulta sobre sus productos.')}`;
  const phoneUrl = `tel:${(config.phone || '').replace(/\s/g, '')}`;
  const isOpenNow = todayHours && !todayHours.toLowerCase().includes('cerrado');

  return (
    <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, #2E1065 0%, #4C1D95 50%, #2E1065 100%)' }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #F9A8D4 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden
          />
          {/* Glow accent */}
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)' }}
            aria-hidden
          />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-6 sm:p-8 md:p-12">
            {/* Lado izquierdo: texto + WhatsApp + Call */}
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-3 px-3 py-1 rounded-full" style={{ background: 'rgba(249,168,212,0.18)', color: '#F9A8D4', border: '1px solid rgba(249,168,212,0.3)' }}>
                💬 Estamos para ayudarte
              </span>
              <h2 className="font-bold text-white mb-3" style={{ fontSize: '28px', fontFamily: 'Georgia, serif' }}>
                ¿Tienes dudas o quieres pedir algo especial?
              </h2>
              <p className="text-sm mb-6 max-w-md mx-auto md:mx-0" style={{ color: '#E9D5FF' }}>
                Escríbenos por WhatsApp y te respondemos al instante. También puedes llamarnos o visitarnos en Ciego de Ávila.
              </p>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', boxShadow: '0 8px 24px -4px rgba(34,197,94,0.5)' }}
                  aria-label="Escribir por WhatsApp"
                >
                  <MessageCircle className="h-5 w-5 fill-white" /> WhatsApp
                </a>
                <a
                  href={phoneUrl}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', boxShadow: '0 8px 24px -4px rgba(168,85,247,0.5)' }}
                  aria-label={`Llamar al ${config.phone}`}
                >
                  <Phone className="h-5 w-5" /> Llamar
                </a>
              </div>

              {/* Redes sociales */}
              <div className="mt-6 flex items-center justify-center md:justify-start gap-2">
                <span className="text-xs mr-1" style={{ color: '#E9D5FF' }}>Síguenos:</span>
                {config.instagram && (
                  <a
                    href={config.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110"
                    style={{ background: 'linear-gradient(135deg, #E1306C 0%, #C13584 100%)' }}
                    aria-label="Síguenos en Instagram"
                    title="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {config.facebook && (
                  <a
                    href={config.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110"
                    style={{ background: 'linear-gradient(135deg, #1877F2 0%, #0B5FCC 100%)' }}
                    aria-label="Síguenos en Facebook"
                    title="Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Lado derecho: info cards */}
            <div className="grid grid-cols-1 gap-3">
              {/* Horario de hoy */}
              <div
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,168,212,0.2)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)' }}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#F9A8D4' }}>Horario de hoy</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {todayHours || 'Consulta por WhatsApp'}
                  </p>
                  <div className="inline-flex items-center gap-1 mt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: isOpenNow ? '#22C55E' : '#9CA3AF' }}
                    />
                    <span className="text-[10px] font-medium" style={{ color: isOpenNow ? '#86EFAC' : '#E9D5FF' }}>
                      {isOpenNow ? 'Abierto ahora' : 'Cerrado ahora'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,168,212,0.2)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)' }}>
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#F9A8D4' }}>Ubicación</p>
                  <p className="text-sm font-bold text-white mt-0.5">Ciego de Ávila, Cuba</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#E9D5FF' }}>Entregas a domicilio en la ciudad y alrededores</p>
                </div>
              </div>

              {/* Teléfono */}
              <div
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,168,212,0.2)', backdropFilter: 'blur(8px)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}>
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#F9A8D4' }}>Teléfono</p>
                  <a href={phoneUrl} className="text-sm font-bold text-white mt-0.5 hover:underline">
                    {config.phone}
                  </a>
                  <p className="text-[11px] mt-0.5" style={{ color: '#E9D5FF' }}>Lun-Sáb 9:00-18:00</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
