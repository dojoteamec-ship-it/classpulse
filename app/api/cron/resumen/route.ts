import { NextResponse, type NextRequest } from "next/server";
import { enviarResumenDiario } from "@/lib/resumen-diario";

// Resumen diario de las 08:00 de Ecuador. Lo llama Vercel Cron (vercel.json) con
// Authorization: Bearer <CRON_SECRET>. Cualquier otra llamada recibe 401.
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  try {
    const r = await enviarResumenDiario();
    return NextResponse.json({ ok: true, lineas: r.lineas, enviados: r.enviados.length });
  } catch (e) {
    console.error("resumen diario", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
