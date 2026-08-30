import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import VentilationForm from "@/app/components/VentilationForm";

export default async function NewVentilationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed, diagnosis, sex, height_cm, on_vmi")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  async function createVentilation(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const recordedAt = String(formData.get("recorded_at") ?? "").trim();

    const value = (name: string) =>
      String(formData.get(name) ?? "").trim() || null;

    const { error } = await supabase.from("ventilation").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
      recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
      modo: value("modo"),
      vt: value("vt"),
      fr: value("fr"),
      peep: value("peep"),
      fio2: value("fio2"),
      pplat: value("pplat"),
      ppico: value("ppico"),
      pao2: value("pao2"),
      notes: value("notes"),
      created_by: user?.id ?? null,
    });

    if (error) {
      console.error("No se pudieron guardar los parámetros de VMI:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    // Capturar parámetros implica que el paciente está ventilado.
    if (!patient?.on_vmi) {
      await supabase.from("patients").update({ on_vmi: true }).eq("id", id);
    }

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
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
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/patients/${id}`}
          className="mb-8 inline-block text-sm text-cyan-300"
        >
          ← Volver al expediente
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8">
            <p className="text-sm text-cyan-300">Cama {patient.bed}</p>
            <h1 className="mt-2 text-4xl font-bold">Parámetros del ventilador</h1>
            <p className="mt-3 text-slate-300">
              {patient.full_name} · {patient.diagnosis || "Sin diagnóstico registrado"}
            </p>
          </div>

          <VentilationForm
            createVentilation={createVentilation}
            sex={patient.sex}
            heightCm={patient.height_cm ?? null}
            cancelHref={`/patients/${id}`}
            editHref={`/patients/${id}/edit`}
          />
        </section>
      </div>
    </main>
  );
}
