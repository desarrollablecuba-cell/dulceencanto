import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/orders/asap-slots?zoneId=xxx&date=2026-07-25
 *
 * Calcula los horarios disponibles para entrega "Entrega Prioritaria" (ASAP)
 * basándose en:
 * 1. Hora actual de Cuba + tiempo mínimo de antelación (asapMinLeadTime)
 * 2. Horario ASAP configurado (asapStartHour - asapEndHour)
 * 3. Capacidad por hora (asapMaxPerHour) — cuenta pedidos existentes
 * 4. Excluir horario normal de entrega si asapExcludeNormalHours = true
 * 5. Hora máxima de pedidos del día (maxOrderHour) para same-day
 *
 * Response: { slots: [{ time: "10:00", available: true, reason: "" }, ...] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const dateStr = searchParams.get('date');

    if (!zoneId) {
      return NextResponse.json({ error: 'zoneId requerido' }, { status: 400 });
    }

    const config = await db.siteConfig.findUnique({ where: { id: 'site' } });
    if (!config) {
      return NextResponse.json({ slots: [] });
    }

    const zone = await db.deliveryZone.findUnique({ where: { id: zoneId } });
    if (!zone || !zone.allowsPriorityDelivery) {
      return NextResponse.json({ slots: [] });
    }

    // Configuración (con overrides por zona si existen)
    const asapStart = (config.asapStartHour || '06:00').trim();
    const asapEnd = (config.asapEndHour || '22:00').trim();
    const minLeadTime = zone.asapMinLeadTimeOverride ?? (config.asapMinLeadTime || 60);
    const maxPerHour = zone.asapMaxPerHourOverride ?? (config.asapMaxPerHour || 5);
    const excludeNormal = zone.asapExcludeNormalHoursOverride || config.asapExcludeNormalHours || false;
    const normalSchedule = config.normalSchedule || '15:00 - 18:00';

    // Hora actual en Cuba
    const now = new Date();
    const cubaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Havana' }));
    const currentHour = cubaTime.getHours();
    const currentMinute = cubaTime.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;

    // Fecha de hoy en Cuba (formato YYYY-MM-DD).
    // IMPORTANTE: NO usar toISOString() porque convierte a UTC y puede dar
    // una fecha diferente (ej: 23:30 Cuba = 04:30 UTC del día siguiente).
    // En su lugar, construimos la fecha manualmente con los componentes de Cuba.
    const todayStr = `${cubaTime.getFullYear()}-${String(cubaTime.getMonth() + 1).padStart(2, '0')}-${String(cubaTime.getDate()).padStart(2, '0')}`;

    // Parsear horarios
    const parseHHMM = (s: string): number => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
      if (!m) return 0;
      return parseInt(m[1]) * 60 + parseInt(m[2]);
    };

    const startMin = parseHHMM(asapStart);
    const endMin = parseHHMM(asapEnd);

    // Normal schedule range (para exclusión opcional)
    const normalParts = normalSchedule.split(/\s*-\s*/);
    const normalStart = normalParts[0] ? parseHHMM(normalParts[0]) : -1;
    const normalEnd = normalParts[1] ? parseHHMM(normalParts[1]) : -1;

    // Tiempo mínimo disponible = ahora + minLeadTime
    const earliestMin = currentMinutes + minLeadTime;

    // Determinar si es hoy o mañana (todayStr ya calculado arriba con zona Cuba)
    const isToday = !dateStr || dateStr === todayStr;

    // Generar slots cada hora desde earliestMin hasta asapEnd
    const slots: { time: string; available: boolean; reason: string }[] = [];

    // Si no es hoy, empezar desde asapStart
    const startSlot = isToday ? earliestMin : startMin;

    for (let slot = startSlot; slot < endMin; slot += 60) {
      // Redondear al inicio de la próxima hora si no es exacto
      const slotHour = Math.ceil(slot / 60) * 60;
      if (slotHour >= endMin) break;

      const hh = Math.floor(slotHour / 60);
      const mm = slotHour % 60;
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

      let available = true;
      let reason = '';

      // Verificar si está dentro del horario ASAP
      if (slotHour < startMin) {
        available = false;
        reason = 'Antes del horario de apertura';
      }

      // Verificar exclusión de horario normal
      if (available && excludeNormal && normalStart >= 0 && normalEnd >= 0) {
        if (slotHour >= normalStart && slotHour < normalEnd) {
          available = false;
          reason = 'Dentro del horario de entrega normal';
        }
      }

      // Si es hoy, verificar capacidad de pedidos existentes PARA ESTE SLOT
      if (available && isToday) {
        // Contar pedidos ASAP con asapTimeSlot = timeStr (capacidad por slot individual)
        const existingCount = await db.order.count({
          where: {
            deliveryTimeSlot: 'asap',
            asapTimeSlot: timeStr,
            status: { notIn: ['cancelled'] },
          },
        });

        if (existingCount >= maxPerHour) {
          available = false;
          reason = `Capacidad máxima (${maxPerHour}) alcanzada para las ${timeStr}`;
        }
      }

      slots.push({ time: timeStr, available, reason });
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error calculating ASAP slots:', error);
    return NextResponse.json({ slots: [] });
  }
}
