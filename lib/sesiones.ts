import type { GrupoTipo, TipoSesion } from "@/types/database";

// Nombres de los tipos de sesión tal como los ve el equipo y el alumno.
export const TIPO_SESION: Record<TipoSesion, string> = {
  kata: "Kata",
  mondo: "Mondo",
  randori: "Randori",
  shinsa: "Shinsa",
  practica_cliente: "Práctica con clientes",
};

// Los Cinturones evalúan Kata, Mondo, Randori y Shinsa; los Grupos de
// clientes, solo la práctica con clientes (lo mismo valida cp_abrir_sesion).
export const tiposDeGrupo = (tipo: GrupoTipo): TipoSesion[] =>
  tipo === "cliente" ? ["practica_cliente"] : ["mondo", "randori", "kata", "shinsa"];

export const segundosUnix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
