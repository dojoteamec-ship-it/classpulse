// Identificador anónimo del dispositivo: un UUID guardado en localStorage.
// No identifica a la persona; solo evita que el mismo navegador responda dos
// veces la misma sesión desde el enlace general (riesgo aceptado, plan 7.4).
const KEY = "classpulse:fp";
let cache: string | null = null;

export function obtenerFingerprint(): string {
  cache ??= leer();
  return cache;
}

function leer(): string {
  try {
    let fp = localStorage.getItem(KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(KEY, fp);
    }
    return fp;
  } catch {
    // Navegación privada o iframe sin acceso a storage.
    return crypto.randomUUID();
  }
}
