'use client';

import { useEffect } from 'react';

/**
 * Limpieza de Service Workers heredados.
 *
 * Reemplaza al <script dangerouslySetInnerHTML> que estaba en layout.tsx:
 * React NO ejecuta etiquetas <script> renderizadas dentro de componentes
 * en el cliente (y dispara un Console Error en Next 16). La lógica vive
 * ahora en un efecto de cliente real.
 *
 * Qué hace:
 *  1. Desregistra CUALQUIER service worker previo (las versiones viejas
 *     cacheaban páginas de admin obsoletas).
 *  2. Borra todos los Cache Storage entries asociados.
 *
 * La PWA actual no registra ningún SW nuevo (el manifest sigue activo para
 * "Añadir a pantalla de inicio"), así que este componente solo limpia
 * instalaciones antiguas una vez por carga de página.
 */
export function ServiceWorkerCleaner() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) {
        // Desregistrar cualquier SW que apunte a sw.js (versiones viejas)
        if (reg.active && reg.active.scriptURL.indexOf('sw.js') !== -1) {
          reg.unregister();
        }
      });
      // También limpiar todos los caches del navegador
      if (window.caches) {
        caches.keys().then(function (names) {
          names.forEach(function (n) { caches.delete(n); });
        });
      }
    }).catch(() => { /* ignore */ });
  }, []);

  return null;
}
