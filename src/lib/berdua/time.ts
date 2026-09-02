export const MINUTE_MS = 60_000;

/** Menit dari tengah malam (0-1439) di zona waktu lokal user. */
export function localMinuteOfDay(at: Date, tzOffsetMinutes: number): number {
  const shifted = Math.floor((at.getTime() + tzOffsetMinutes * MINUTE_MS) / MINUTE_MS);
  return ((shifted % 1440) + 1440) % 1440;
}

export interface QuietHours {
  quietStartMinute: number;
  quietEndMinute: number;
  tzOffsetMinutes: number;
}

/**
 * Jam tenang boleh melewati tengah malam (mis. 23:00 -> 07:00).
 * Kalau start dan end sama, artinya jam tenang dimatikan.
 */
export function isQuietAt(at: Date, q: QuietHours): boolean {
  const { quietStartMinute: start, quietEndMinute: end } = q;
  if (start === end) return false;
  const m = localMinuteOfDay(at, q.tzOffsetMinutes);
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/** Berapa menit lagi jam tenang berakhir. 0 kalau sekarang bukan jam tenang. */
export function minutesUntilQuietEnds(at: Date, q: QuietHours): number {
  if (!isQuietAt(at, q)) return 0;
  const m = localMinuteOfDay(at, q.tzOffsetMinutes);
  const end = q.quietEndMinute;
  return m < end ? end - m : 1440 - m + end;
}

/** Geser sebuah waktu ke luar jam tenang, biar gak ada notif jam 3 pagi. */
export function shiftOutOfQuietHours(at: Date, q: QuietHours): Date {
  const delta = minutesUntilQuietEnds(at, q);
  return delta === 0 ? at : new Date(at.getTime() + delta * MINUTE_MS);
}

/** "3 jam 20 menit", "2 hari", "45 menit" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / MINUTE_MS));
  if (totalMinutes < 1) return "barusan";
  if (totalMinutes < 60) return `${totalMinutes} menit`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${totalHours} jam` : `${totalHours} jam ${minutes} menit`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours === 0 ? `${days} hari` : `${days} hari ${hours} jam`;
}

/** 570 -> "09:30" */
export function formatMinuteOfDay(minute: number): string {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "09:30" -> 570 */
export function parseMinuteOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
