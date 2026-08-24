/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FECHAS ESPECIALES — tipos + lista por defecto (compartida)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Las fechas son año-agnósticas (mes/día): el countdown calcula siempre la
 *  próxima ocurrencia (año actual o siguiente). El admin puede editarlas,
 *  eliminarlas o agregar nuevas desde Ajustes → Inicio → Fechas Especiales.
 *
 *  `theme` coincide con los ids de SPECIAL_GRADIENTS del AdminPanel;
 *  `gradient`/`accent` son los valores resueltos que consume el countdown.
 *  `image` (opcional): imagen de fondo de la tarjeta (subida desde el admin).
 */
export interface SpecialDate {
  month: number;  // 0-11 (Jan=0)
  day: number;    // 1-31
  name: string;
  emoji: string;
  description: string;
  theme: string;
  gradient: string;
  accent: string;
  image?: string;
}

export const DEFAULT_SPECIAL_DATES: SpecialDate[] = [
  {
    month: 1, day: 14, name: 'Día de San Valentín', emoji: '💖',
    description: 'Sorprende a tu persona especial con una tarta romántica, cupcakes de corazones y detalles dulces.',
    theme: 'rosa', gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', accent: '#F472B6',
  },
  {
    month: 4, day: 11, name: 'Día de las Madres', emoji: '👩‍👧',
    description: 'Celebra a mamá con la tarta favorita, un combo de dulces finos y un detalle personalizado.',
    theme: 'morado', gradient: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', accent: '#C084FC',
  },
  {
    month: 6, day: 15, name: 'Día de los Niños', emoji: '🧒',
    description: 'Tartas temáticas de personajes, máquina de burbujas, decoración colorida. Diversión asegurada.',
    theme: 'ambar', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', accent: '#FBBF24',
  },
  {
    month: 8, day: 8, name: 'Día de los Padres', emoji: '👨',
    description: 'Tartas temáticas de fútbol, sublimación de pullovers y detalles para papá.',
    theme: 'azul', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', accent: '#60A5FA',
  },
  {
    month: 9, day: 10, name: 'Día de la Mujer Cubana', emoji: '🌹',
    description: 'Honra a las mujeres de tu vida con postres elegantes, tartas florales y detalles únicos.',
    theme: 'rosa', gradient: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)', accent: '#F9A8D4',
  },
  {
    month: 11, day: 24, name: 'Nochebuena', emoji: '🎄',
    description: 'Tartas navideñas, panetelas, galleticas temáticas y combos para celebrar en familia.',
    theme: 'rojo', gradient: 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)', accent: '#F87171',
  },
  {
    month: 11, day: 31, name: 'Fin de Año', emoji: '🎉',
    description: 'Despide el año con estilo: tartas de gala, mesa de dulces completa y promociones especiales.',
    theme: 'morado', gradient: 'linear-gradient(135deg, #7E22CE 0%, #2E1065 100%)', accent: '#C084FC',
  },
  {
    month: 0, day: 1, name: 'Año Nuevo', emoji: '🥂',
    description: 'Recibe el año con postres frescos y tartas personalizadas para empezar con dulzura.',
    theme: 'cian', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)', accent: '#67E8F9',
  },
];
