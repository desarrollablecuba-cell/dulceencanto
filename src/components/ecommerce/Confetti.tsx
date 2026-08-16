'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Confetti
 *
 * Animación de confeti que cae desde la parte superior de la pantalla.
 * Se usa para celebrar eventos importantes (pedido completado, reserva
 * confirmada, etc.).
 *
 *  - `pieces`: número de piezas de confeti (default 80).
 *  - `duration`: duración en ms antes de que las piezas desaparezcan (default 4000).
 *  - `active`: si es true, el confeti se muestra; si es false, se desmonta.
 *
 * Cada pieza tiene un color, tamaño, posición horizontal, delay y duración
 * aleatorios. Las piezas caen con rotación y oscilación horizontal para un
 * efecto más natural.
 *
 * Colores: paleta de la marca (morado, rosa, naranja, verde, amarillo, cian).
 */

const COLORS = [
  '#A855F7', // morado
  '#EC4899', // rosa
  '#F472B6', // rosa claro
  '#F59E0B', // naranja
  '#22C55E', // verde
  '#FBBF24', // amarillo
  '#06B6D4', // cian
  '#C084FC', // lila
];

interface Piece {
  id: number;
  left: number;        // % de posición horizontal inicial
  size: number;        // px
  color: string;
  delay: number;       // s
  duration: number;    // s
  rotation: number;   // grados finales
  drift: number;       // px de oscilación horizontal
  shape: 'square' | 'circle' | 'rect';
}

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.8,
    duration: 2.5 + Math.random() * 2,
    rotation: Math.random() * 720 - 360,
    drift: (Math.random() - 0.5) * 100,
    shape: ['square', 'circle', 'rect'][Math.floor(Math.random() * 3)] as Piece['shape'],
  }));
}

export function Confetti({
  active,
  pieces = 80,
  duration = 4000,
}: {
  active: boolean;
  pieces?: number;
  duration?: number;
}) {
  // `show` se inicializa con `active` para que el confeti aparezca inmediatamente
  // al montar el componente (sin necesidad de un setState sincrónico en el effect).
  // El useEffect solo arranca el timer de auto-ocultamiento: el setState
  // ocurre dentro del callback del setTimeout (sistema externo), no en el
  // cuerpo del effect, evitando así la regla `set-state-in-effect`.
  const [show, setShow] = useState(active);
  const pieceData = useMemo(() => generatePieces(pieces), [pieces]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
      aria-hidden
    >
      {pieceData.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            position: 'absolute',
            top: -20,
            left: `${p.left}%`,
            width: p.shape === 'rect' ? p.size * 0.6 : p.size,
            height: p.shape === 'rect' ? p.size * 1.4 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '2px',
            opacity: 1,
            rotate: 0,
            x: 0,
          }}
          animate={{
            top: '110vh',
            opacity: [1, 1, 0.8, 0],
            rotate: p.rotation,
            x: [0, p.drift / 2, p.drift, p.drift / 2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
            opacity: { duration: p.duration, times: [0, 0.7, 0.9, 1] },
            x: { duration: p.duration, repeat: 0, ease: 'easeInOut' },
          }}
          style={{
            boxShadow: `0 0 4px ${p.color}40`,
          }}
        />
      ))}
    </div>
  );
}
