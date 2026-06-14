import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { revalidatePath } from "next/cache";

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

type Attending = {
  id: string;
  full_name: string;
  specialty: string | null;
  active: boolean | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentMembership } = user
    ? await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", CURRENT_TEAM_ID)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isAdmin = currentMembership?.role === "admin";
  async function addTeamMember(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const role = String(formData.get("role") || "medico").trim();

    if (!email) {
      throw new Error("Escribe el correo del usuario.");
    }

    const allowedRoles = ["admin", "adscrito", "medico", "residente", "interno"];
    const finalRole = allowedRoles.includes(role) ? role : "medico";

    const supabase = await createClient();

    const { error } = await supabase.rpc("add_team_member_by_email", {
      target_email: email,
      target_role: finalRole,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/configuracion/equipo");
    revalidatePath("/");
  }

  async function updateTeamMemberRole(formData: FormData) {
    "use server";

    const userId = String(formData.get("user_id") || "").trim();
    const role = String(formData.get("role") || "medico").trim();

    if (!userId) {
      throw new Error("No se encontró el usuario a editar.");
    }

    const allowedRoles = ["admin", "adscrito", "medico", "residente", "interno"];
    const finalRole = allowedRoles.includes(role) ? role : "medico";

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_team_member_role", {
      target_user_id: userId,
      target_role: finalRole,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/configuracion/equipo");
    revalidatePath("/");
  }

  async function removeTeamMember(formData: FormData) {
    "use server";

    const userId = String(formData.get("user_id") || "").trim();

    if (!userId) {
      throw new Error("No se encontró el usuario a eliminar.");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_team_member", {
      target_user_id: userId,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/configuracion/equipo");
    revalidatePath("/");
  }

  async function addAttending(formData: FormData) {
    "use server";

    const fullName = String(formData.get("full_name") || "").trim();
    const specialty = String(formData.get("specialty") || "Medicina Interna").trim();

    if (!fullName) {
      throw new Error("Escribe el nombre del adscrito.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("attendings").insert({
      team_id: CURRENT_TEAM_ID,
      full_name: fullName,
      specialty: specialty || "Medicina Interna",
      active: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/configuracion/equipo");
    revalidatePath("/");
  }

  async function updateAttending(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "").trim();
    const fullName = String(formData.get("full_name") || "").trim();
    const specialty = String(formData.get("specialty") || "Medicina Interna").trim();
    const active = String(formData.get("active") || "false") === "true";

    if (!id || !fullName) {
      throw new Error("Faltan datos del adscrito.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("attendings")
      .update({
        full_name: fullName,
        specialty: specialty || "Medicina Interna",
        active,
      })
      .eq("team_id", CURRENT_TEAM_ID)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/configuracion/equipo");
    revalidatePath("/");
  }

  async function deactivateAttending(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "").trim();

    if (!id) {
      throw new Error("No se encontró el adscrito.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("attendings")
      .update({ active: false })
      .eq("team_id", CURRENT_TEAM_ID)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/configuracion/equipo");
    revalidatePath("/");
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#061325] p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/30 bg-red-500/10 p-8 shadow-2xl">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Volver al dashboard
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-red-100">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-red-100/90">
            Esta sección solo está disponible para administradores del equipo.
          </p>
        </div>
      </main>
    );
  }

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

  const { data: attendings } = await supabase
    .from("attendings")
    .select("id, full_name, specialty, active")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("specialty", { ascending: true })
    .order("full_name", { ascending: true });

  const attendingList = (attendings ?? []) as Attending[];

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

        <section className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Adscritos del servicio</h2>
            <p className="mt-1 text-sm text-slate-300">
              Catálogo de adscritos por especialidad. No necesitan cuenta de usuario para asignarse a pacientes.
            </p>
          </div>

          <form action={addAttending} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Nombre del adscrito
              </label>
              <input
                name="full_name"
                required
                placeholder="Dr. Nombre Apellido"
                className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Especialidad
              </label>
              <input
                name="specialty"
                defaultValue="Medicina Interna"
                className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300"
            >
              Agregar adscrito
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/10 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Especialidad</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {attendingList.map((attending) => (
                  <tr key={attending.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <form action={updateAttending} className="grid gap-3 md:grid-cols-[1fr_220px_140px_auto] md:items-center">
                        <input type="hidden" name="id" value={attending.id} />
                        <input
                          name="full_name"
                          defaultValue={attending.full_name}
                          className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-2 text-sm text-white outline-none focus:border-emerald-300/60"
                        />
                        <input
                          name="specialty"
                          defaultValue={attending.specialty || "Medicina Interna"}
                          className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-2 text-sm text-white outline-none focus:border-emerald-300/60"
                        />
                        <select
                          name="active"
                          defaultValue={attending.active === false ? "false" : "true"}
                          className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-2 text-sm text-white outline-none focus:border-emerald-300/60"
                        >
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
                        >
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{attending.specialty || "Medicina Interna"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${attending.active === false ? "bg-slate-400/10 text-slate-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                        {attending.active === false ? "Inactivo" : "Activo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form action={deactivateAttending}>
                        <input type="hidden" name="id" value={attending.id} />
                        <button
                          type="submit"
                          className="rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-400/20"
                        >
                          Desactivar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}

                {attendingList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No hay adscritos registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Agregar miembro</h2>
            <p className="mt-1 text-sm text-slate-300">
              El usuario debe tener una cuenta creada en SynapMed. Puedes asignarlo como adscrito, médico, residente, interno o administrador.
            </p>
          </div>

          <form action={addTeamMember} className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Correo del usuario
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="usuario@correo.com"
                className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Rol
              </label>
              <select
                name="role"
                defaultValue="medico"
                className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                <option value="adscrito">Adscrito</option>
                <option value="medico">Médico</option>
                <option value="residente">Residente</option>
                <option value="interno">Interno</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Agregar
            </button>
          </form>
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
                  <th className="px-4 py-3 font-semibold">Acciones</th>
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
                      <td className="px-4 py-3">
                        <div className="flex min-w-64 flex-col gap-3">
                          <form action={updateTeamMemberRole} className="flex flex-col gap-2">
                            <input type="hidden" name="user_id" value={member.user_id} />
                            <select
                              name="role"
                              defaultValue={member.role || profile?.role || "medico"}
                              className="w-full rounded-2xl border border-white/10 bg-[#061325] px-4 py-2 text-sm text-white outline-none focus:border-cyan-300/60"
                            >
                              <option value="adscrito">Adscrito</option>
                              <option value="medico">Médico</option>
                              <option value="residente">Residente</option>
                              <option value="interno">Interno</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
                            >
                              Guardar rol
                            </button>
                          </form>

                          <form action={removeTeamMember}>
                            <input type="hidden" name="user_id" value={member.user_id} />
                            <button
                              type="submit"
                              className="w-full rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-400/20"
                            >
                              Eliminar del equipo
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
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
            Esta pantalla permite agregar miembros sin entrar a Supabase. El usuario debe existir primero
            en Auth/perfiles de SynapMed. La inserción se realiza mediante una función segura RPC y solo
            los administradores del equipo pueden ejecutarla. Editar rol o eliminar usuario solo modifica su membresía del equipo; no borra su cuenta de Supabase Auth.
          </p>
        </section>
      </div>
    </main>
  );
}
