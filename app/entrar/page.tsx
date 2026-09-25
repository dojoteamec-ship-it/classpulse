import { redirect } from "next/navigation";
import { FormularioCuenta } from "@/components/formulario-cuenta";
import { PantallaAcceso } from "@/components/pantalla-acceso";
import { obtenerSesion } from "@/lib/auth";
import { entrar } from "../sesion/acciones";

export default async function EntrarPage() {
  const { mentor } = await obtenerSesion();
  if (mentor) redirect("/panel");

  return (
    <PantallaAcceso
      titulo="Bienvenido de vuelta"
      descripcion="Entra con la misma cuenta que usas en ClassVote."
    >
      <FormularioCuenta
        accion={entrar}
        boton="Entrar"
        campos={[
          { name: "email", label: "Correo", type: "email", autoComplete: "email" },
          { name: "password", label: "Contraseña", type: "password", autoComplete: "current-password" },
        ]}
      />
    </PantallaAcceso>
  );
}
