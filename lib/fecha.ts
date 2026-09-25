// fecha_clase es una fecha local de Ecuador ("2026-09-24") y hora_local una
// hora ("19:00:00"). Se formatean sin convertir zonas horarias.
export function formatearClase(fecha: string, hora: string | null): string {
  const dia = new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
  return hora ? `${dia} · ${hora.slice(0, 5)} (hora Ecuador)` : dia;
}

// Fecha de hoy en Ecuador como "YYYY-MM-DD".
export function hoyEnEcuador(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date());
}

// Segundos Unix del inicio de la clase. Ecuador no tiene horario de verano:
// la hora local es siempre UTC-5.
export function instanteClase(fecha: string, hora: string): number {
  return Math.floor(new Date(`${fecha}T${hora.slice(0, 5)}:00-05:00`).getTime() / 1000);
}

// Suma días a una fecha "YYYY-MM-DD".
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Fecha y hora de Ecuador de un instante ISO, en corto ("24 sep, 19:05").
export function fechaHoraCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(new Date(iso));
}
