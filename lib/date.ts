// La fecha del pase se calcula siempre en horario de la Ciudad de México.
// En producción el servidor corre en UTC, y de madrugada eso adelantaría el día
// del pase: una presentación escrita a las 11 de la noche caería en la fecha
// siguiente.
export const ROUNDS_TIME_ZONE = "America/Mexico_City";

// Devuelve la fecha de hoy como "YYYY-MM-DD" (el formato que guarda Postgres).
export function roundsToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: ROUNDS_TIME_ZONE });
}

// Formatea un "YYYY-MM-DD" para mostrarlo, sin pasar por UTC:
// new Date("2026-08-30") se interpreta como medianoche UTC y puede correrse un día.
export function formatRoundsDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }
): string {
  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) return String(value);

  return new Date(year, month - 1, day).toLocaleDateString("es-MX", options);
}
