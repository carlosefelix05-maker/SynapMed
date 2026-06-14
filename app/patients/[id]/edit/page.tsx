import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  const patientSubspecialty = patient?.subspecialty || "Medicina Interna";

  const { data: attendings } = await supabase
    .from("attendings")
    .select("id, full_name, specialty")
    .eq("team_id", CURRENT_TEAM_ID)
    .eq("active", true)
    .eq("specialty", patientSubspecialty)
    .order("full_name", { ascending: true });

  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("team_id", CURRENT_TEAM_ID)
    .in("role", ["admin", "medico", "residente", "interno"]);

  const memberIds = (teamMembers ?? []).map((member) => member.user_id);

  const { data: profiles } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", memberIds)
        .order("full_name", { ascending: true })
    : { data: [] };

  const roleByUserId = new Map(
    (teamMembers ?? []).map((member) => [member.user_id, member.role])
  );

  function getClinicalRole(profile: { id: string; role: string | null }) {
    if (profile.role === "residente" || profile.role === "interno") {
      return profile.role;
    }

    return roleByUserId.get(profile.id) || profile.role || "";
  }

  const residents = (profiles ?? []).filter((profile) => {
    const role = getClinicalRole(profile);
    return role === "residente";
  });

  async function updatePatient(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const full_name = String(formData.get("full_name") ?? "").trim();
    const bed = String(formData.get("bed") ?? "").trim();
    const ageValue = String(formData.get("age") ?? "").trim();
    const sex = String(formData.get("sex") ?? "").trim();
    const subspecialty = String(formData.get("subspecialty") ?? "").trim();
    const diagnosis = String(formData.get("diagnosis") ?? "").trim();
    const attending_id =
      String(formData.get("attending_id") ?? "").trim() || null;
    const assigned_resident_id =
      String(formData.get("assigned_resident_id") ?? "").trim() || null;

    if (!full_name) return;

    await supabase
      .from("patients")
      .update({
        full_name,
        bed: bed || null,
        age: ageValue ? Number(ageValue) : null,
        sex: sex || null,
        subspecialty: subspecialty || null,
        diagnosis: diagnosis || null,
        attending_id,
        assigned_resident_id,
      })
      .eq("id", id);

    revalidatePath("/");
    revalidatePath(`/patients/${id}`);
    redirect(`/patients/${id}`);
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#061325] p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm text-cyan-300">
            ← Volver a Rounds
          </Link>
          <p className="mt-8 text-red-300">Paciente no encontrado.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href={`/patients/${id}`} className="mb-8 inline-block text-sm text-cyan-300">
          ← Volver al expediente
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8">
            <p className="text-sm text-cyan-300">Editar paciente</p>
            <h1 className="mt-2 text-4xl font-bold">{patient.full_name}</h1>
            <p className="mt-3 text-slate-400">Actualiza los datos principales del expediente.</p>
          </div>

          <form action={updatePatient} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Nombre completo</label>
              <input
                name="full_name"
                defaultValue={patient.full_name || ""}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Cama</label>
                <input
                  name="bed"
                  defaultValue={patient.bed || ""}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Edad</label>
                <input
                  name="age"
                  type="number"
                  defaultValue={patient.age || ""}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Sexo</label>
                <select
                  name="sex"
                  defaultValue={patient.sex || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="">No especificado</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Subespecialidad</label>
              <select
                name="subspecialty"
                defaultValue={patient.subspecialty || "Medicina Interna"}
                className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
              >
                <option value="Medicina Interna">Medicina Interna</option>
                <option value="Cardiología">Cardiología</option>
                <option value="Nefrología">Nefrología</option>
                <option value="Neumología">Neumología</option>
                <option value="Gastroenterología">Gastroenterología</option>
                <option value="Endocrinología">Endocrinología</option>
                <option value="Hematología">Hematología</option>
                <option value="Terapia Intensiva">Terapia Intensiva</option>
                <option value="Neurología">Neurología</option>
                <option value="Infectología">Infectología</option>
                <option value="Geriatría">Geriatría</option>
                <option value="Reumatología">Reumatología</option>
                <option value="Oncología">Oncología</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Adscrito responsable</label>
                <select
                  name="attending_id"
                  defaultValue={patient.attending_id || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="">Sin asignar · {patientSubspecialty}</option>
                  {(attendings ?? []).map((attending) => (
                    <option key={attending.id} value={attending.id}>
                      {attending.full_name} · {attending.specialty || "Medicina Interna"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Residente responsable</label>
                <select
                  name="assigned_resident_id"
                  defaultValue={patient.assigned_resident_id || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="">Sin asignar</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.full_name || resident.email || "Usuario"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Diagnósticos</label>
              <textarea
                name="diagnosis"
                rows={6}
                defaultValue={patient.diagnosis || ""}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Guardar cambios
              </button>

              <Link
                href={`/patients/${id}`}
                className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-slate-200 hover:bg-white/20"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
