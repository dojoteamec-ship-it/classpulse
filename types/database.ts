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
