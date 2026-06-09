import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";

type Membership = {
  user_id: string;
  role: string | null;
  team_id: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamSettingsPage() {
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", CURRENT_TEAM_ID)
    .maybeSingle();

  const { data: memberships, error: membershipsError } = await supabase
    .from("team_members")
    .select("user_id, role, team_id")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("role", { ascending: true });

  const members = (memberships ?? []) as Membership[];
  const userIds = members.map((member) => member.user_id);

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", userIds)
    : { data: [] as Profile[] };

  const profileMap = new Map(
    ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile])
  );

  return (
    <main className="min-h-screen bg-[#061325] p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
              ← Volver al dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Configuración del equipo</h1>
            <p className="mt-2 text-sm text-slate-300">
              Administración básica de miembros con acceso a SynapMed.
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Equipo activo</p>
          <h2 className="mt-2 text-2xl font-bold">{team?.name || "SynapMed HGZ 49"}</h2>
          <p className="mt-2 text-sm text-slate-400">
            ID: <span className="font-mono text-slate-300">{CURRENT_TEAM_ID}</span>
          </p>
        </section>

        {membershipsError && (
          <section className="mt-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">
            <h2 className="text-lg font-semibold">Error cargando miembros</h2>
            <p className="mt-2 text-sm">{membershipsError.message}</p>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Miembros</h2>
              <p className="mt-1 text-sm text-slate-400">
                {members.length} usuario{members.length === 1 ? "" : "s"} con acceso al equipo.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/10 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Correo</th>
                  <th className="px-4 py-3 font-semibold">Rol en equipo</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const profile = profileMap.get(member.user_id);

                  return (
                    <tr key={member.user_id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {profile?.full_name || "Sin nombre"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {profile?.email || "Sin correo en perfil"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                          {member.role || profile?.role || "medico"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500">
                          {member.user_id}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No hay miembros registrados en este equipo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-6 text-amber-100">
          <h2 className="text-lg font-semibold">Nota de seguridad</h2>
          <p className="mt-2 text-sm leading-6">
            Por ahora esta pantalla es de solo lectura. Para agregar usuarios, primero deben existir en
            Supabase Auth y luego agregarse a <span className="font-mono">team_members</span>.
            El siguiente paso será agregar acciones seguras para cambiar roles o agregar miembros desde aquí.
          </p>
        </section>
      </div>
    </main>
  );
}
