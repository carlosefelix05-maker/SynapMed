import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/app/components/LogoutButton";

export default async function SinAccesoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061325] p-8 text-white">
      <section className="w-full max-w-lg rounded-3xl bg-white/10 p-8">
        <p className="text-sm text-cyan-300">SynapMed</p>

        <h1 className="mt-2 text-3xl font-bold">Tu cuenta no tiene acceso</h1>

        <p className="mt-4 leading-7 text-slate-300">
          La cuenta{" "}
          <span className="font-semibold text-white">
            {user?.email || "con la que entraste"}
          </span>{" "}
          existe, pero no pertenece a ningún equipo, así que no puede ver el
          censo ni los expedientes.
        </p>

        <p className="mt-4 leading-7 text-slate-400">
          Pide al administrador del equipo que te dé de alta con este mismo
          correo desde Configuración → Equipo. En cuanto lo haga, vuelve a
          entrar.
        </p>

        <div className="mt-8">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
