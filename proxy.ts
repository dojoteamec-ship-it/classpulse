import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

// Solo las rutas con sesión; las encuestas del alumno no la necesitan.
export const config = {
  matcher: ["/entrar", "/panel/:path*", "/coach/:path*", "/kaizen/:path*", "/admin/:path*"],
};
