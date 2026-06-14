import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import NewPatientForm from "./NewPatientForm";

export default async function NewPatientPage() {
  const supabase = await createClient();

  const { data: attendings } = await supabase
    .from("attendings")
    .select("id, full_name, specialty")
    .eq("team_id", CURRENT_TEAM_ID)
    .eq("active", true)
    .order("specialty", { ascending: true })
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

  async function createPatient(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const full_name = String(formData.get("full_name") ?? "").trim();
    const bed = String(formData.get("bed") ?? "").trim();
    const ageValue = String(formData.get("age") ?? "").trim();
    const sex = String(formData.get("sex") ?? "").trim();
    const diagnosis = String(formData.get("diagnosis") ?? "").trim();
    const subspecialty = String(formData.get("subspecialty") ?? "").trim();
    const priority = String(formData.get("priority") ?? "").trim();
    const attending_id = String(formData.get("attending_id") ?? "").trim() || null;
    const assigned_resident_id =
      String(formData.get("assigned_resident_id") ?? "").trim() || null;

    if (!full_name || !bed) return;

    await supabase.from("patients").insert({
      team_id: CURRENT_TEAM_ID,
      full_name,
      bed,
      age: ageValue ? Number(ageValue) : null,
      sex: sex || null,
      diagnosis: diagnosis || null,
      subspecialty: subspecialty || null,
      priority: priority || "Estable",
      attending_id,
      assigned_resident_id,
    });

    revalidatePath("/");
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-8 inline-block text-sm text-cyan-300">
          ← Volver a Rounds
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8">
            <p className="text-sm text-cyan-300">SynapMed · Patients</p>
            <h1 className="mt-2 text-4xl font-bold">+ Nuevo paciente</h1>
            <p className="mt-3 text-slate-300">
              Captura inicial para agregar el paciente al pase de visita.
            </p>
          </div>

          <NewPatientForm
            createPatient={createPatient}
            attendings={attendings ?? []}
            residents={residents ?? []}
          />
        </section>
      </div>
    </main>
  );
}