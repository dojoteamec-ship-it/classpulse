import { Buzon } from "@/components/buzon";
import { MarcoAlumno } from "@/components/marco-alumno";

export const metadata = { title: "Buzón abierto · ClassPulse" };

// Enlace fijo, siempre disponible. ?prueba=1 marca el mensaje como dato de prueba.
export default async function BuzonPage({ searchParams }: PageProps<"/buzon">) {
  const { prueba } = await searchParams;
  return (
    <MarcoAlumno>
      <Buzon prueba={prueba === "1"} />
    </MarcoAlumno>
  );
}
