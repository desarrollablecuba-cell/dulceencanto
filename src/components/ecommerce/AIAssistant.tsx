'use client';

import { useState, useEffect } from 'react';

/**
 * Botón flotante de WhatsApp.
 * Reemplaza al chatbot anterior (Diaz IA) por un enlace directo a WhatsApp.
 * El número se carga dinámicamente desde /api/siteconfig.
 */
export function AIAssistant() {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('+5350782825');
  const [storeName, setStoreName] = useState<string>('Dulce Encanto');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/siteconfig')
      .then((r) => r.json())
      .then((data) => {
        if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
        if (data.storeName) setStoreName(data.storeName);
      })
      .catch(() => {});
  }, []);

  const phone = whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${storeName}, tengo una duda sobre un producto.`)}`;

  // Mostrar tooltip después de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    const hideTimer = setTimeout(() => setShowTooltip(false), 8000);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, []);

  return (
    <>
      {/* Tooltip */}
      {showTooltip && (
        <div className="fixed bottom-36 sm:bottom-24 right-4 sm:right-5 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 max-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            type="button"
            onClick={() => setShowTooltip(false)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center text-white text-xs"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <p className="text-xs text-gray-700 font-medium">
            💬 ¿Tienes dudas? Escríbenos por WhatsApp
          </p>
        </div>
      )}

      {/* Botón flotante de WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribir por WhatsApp"
        className="fixed bottom-20 sm:bottom-5 right-4 sm:right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/30 transition-transform hover:scale-110 active:scale-95"
      >
        {/* Icono de WhatsApp SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.944-11.892a11.821 11.821 0 00-3.495-8.413z"/>
        </svg>
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
        </span>
      </a>
    </>
  );
}
