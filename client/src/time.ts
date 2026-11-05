// all times are shown in Bangkok time (NFR-07), whatever the computer time zone is
const TZ = "Asia/Bangkok";

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export const bangkokToIso = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();

export function bangkokDate(daysFromToday: number) {
  return new Date(Date.now() + 7 * 3600 * 1000 + daysFromToday * 86400000).toISOString().slice(0, 10);
}

// 08:00, 08:30 ... 19:30
export const START_TIMES = Array.from({ length: 24 }, (_, i) => {
  const h = String(8 + Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});
