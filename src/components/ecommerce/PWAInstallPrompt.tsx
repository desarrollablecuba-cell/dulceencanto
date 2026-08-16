'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt — muestra un banner en el admin para instalar
 * la aplicación como acceso directo en el móvil (Add to Home Screen).
 *
 * Solo aparece si:
 *  - El navegador soporta PWA (beforeinstallprompt event)
 *  - El usuario no lo ha descartado antes (localStorage)
 *  - Estamos en la página /admin
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Solo mostrar en /admin
    if (!window.location.pathname.startsWith('/admin')) return;

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar si el usuario descartó el banner
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Registrar service worker SOLO en producción (no en dev, para evitar cache stale)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (isInstalled || !showBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[200] rounded-2xl shadow-2xl p-4 flex items-center gap-3"
      style={{ background: 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }}>
        <Smartphone className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm" style={{ fontFamily: 'Georgia, serif' }}>
          Instalar app de administración
        </p>
        <p className="text-xs" style={{ color: '#E9D5FF' }}>
          Accede más rápido desde tu móvil
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shrink-0 transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }}
      >
        <Download className="h-3.5 w-3.5" /> Instalar
      </button>
      <button
        onClick={handleDismiss}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 hover:bg-white/20 transition-colors"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
