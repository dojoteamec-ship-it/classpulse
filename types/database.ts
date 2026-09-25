// Tipos de las tablas, escritos a mano (como en ClassVote). Si cambias el
// esquema en migrations/, actualízalos aquí.

export type Rol = "mentor" | "coach" | "super_admin";
export type GrupoTipo = "cinturon" | "cliente";
export type TipoSesion = "kata" | "mondo" | "randori" | "shinsa" | "practica_cliente";

// Tabla de ClassVote (solo lectura). ClassPulse lee la fila propia.
export type Mentor = {
  id: string;
  nombre: string;
  email: string;
  auth_user_id: string | null;
  estado: "pendiente" | "activo" | "inactivo";
  rol: "mentor" | "admin";
  creado_en: string;
};

export type Acceso = {
  mentor_id: string;
  rol: Rol;
  activo: boolean;
  es_prueba: boolean;
  creado_en: string;
  actualizado_en: string;
};

export type Grupo = {
  id: string;
  slug: string;
  nombre: string;
  tipo: GrupoTipo;
  cinturon_id: string | null;
  nivel: number | null;
  tag_ghl: string | null;
  orden: number;
  activo: boolean;
  enviar_correo: boolean;
};

export type Horario = {
  id: string;
  grupo_id: string;
  dia_semana: number;
  hora_local: string;
  semana: "todas" | "A" | "B";
  tipo_sesion: TipoSesion | null;
  activo: boolean;
};

export type PersonaDirectorio = {
  mentor_id: string;
  nombre: string;
  email: string | null;
  rol: Rol;
  activo: boolean;
};

export type SesionEstado = "abierta" | "cerrada";

export type Sesion = {
  id: string;
  grupo_id: string;
  tipo_sesion: TipoSesion;
  fecha_clase: string;
  rango: string | null;
  abierta_por: string;
  abierta_en: string;
  cierra_en: string;
  estado: SesionEstado;
  cerrada_en: string | null;
  correos_enviados: number;
  es_prueba: boolean;
};

export type SesionMentor = { sesion_id: string; mentor_id: string; principal: boolean };

export type AlertaEstado = "nueva" | "en_contacto" | "resuelta" | "descartada";
export type Gravedad = "alta" | "media" | "operativa" | "kaizen";

export type Alerta = {
  id: string;
  regla: string;
  gravedad: Gravedad;
  estado: AlertaEstado;
  grupo_id: string | null;
  sesion_id: string | null;
  mentor_id: string | null;
  fecha_clase: string | null;
  hora_local: string | null;
  resumen: string | null;
  clave_unica: string | null;
  creado_en: string;
  vence_en: string | null;
  primer_contacto_en: string | null;
  resuelta_en: string | null;
  es_prueba: boolean;
};

// Lo que devuelve cp_sesiones_abiertas (enlace general, público).
export type SesionPublica = {
  id: string;
  grupo_nombre: string;
  grupo_slug: string;
  tipo_sesion: TipoSesion;
  fecha_clase: string;
  cierra_en: string;
  mentores: string | null;
  es_prueba: boolean;
};

// Fila de cp_bandeja (sin identidades).
export type AlertaBandeja = {
  id: string;
  regla: string;
  gravedad: Gravedad;
  estado: AlertaEstado;
  creado_en: string;
  vence_en: string | null;
  primer_contacto_en: string | null;
  resuelta_en: string | null;
  resumen: string | null;
  contacto_posible: boolean;
  respuesta_id: string | null;
  encuesta: "clase" | "cinturon" | "buzon" | null;
  grupo: string | null;
  grupo_slug: string | null;
  tipo_sesion: TipoSesion | null;
  fecha_clase: string | null;
  csat: number | null;
  nps: number | null;
  nivel: number | null;
  texto_mantener: string | null;
  texto_cambiar: string | null;
  texto_cambio_nivel: string | null;
  texto_buzon: string | null;
  mentor: string | null;
  notas: { autor: string | null; texto: string; en: string }[];
  hora_local: string | null;
};

export type Accion = {
  id: string;
  grupo_id: string | null;
  mentor_id: string | null;
  tipo_sesion: TipoSesion | null;
  problema: string;
  enlace_datos: string | null;
  porques: string[];
  accion: string;
  responsable: string | null;
  fecha_compromiso: string | null;
  estado: "planificar" | "hacer" | "verificar" | "estandarizar" | "descartar";
  metrica: "csat_medio" | "top2" | "bottom2" | "distintiva_roja" | "nps";
  fecha_inicio: string;
  ventana_dias: number;
  metrica_antes: { valor: number | null; n: number; desde: string; hasta: string } | null;
  metrica_despues: { valor: number | null; n: number; desde: string; hasta: string } | null;
  publicar: boolean;
  alerta_id: string | null;
  es_prueba: boolean;
  creado_en: string;
  actualizado_en: string;
};
