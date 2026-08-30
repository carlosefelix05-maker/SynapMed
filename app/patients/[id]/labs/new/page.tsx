import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { LAB_FIELD_NAMES } from "@/lib/labs-fields";
import { roundsToday, dateToTimestamp } from "@/lib/date";
import LabsForm from "@/app/components/LabsForm";

export default async function NewLabsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed, diagnosis, age, sex")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  async function createLabs(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const row: Record<string, string | null> = {
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
    };

    for (const name of LAB_FIELD_NAMES) {
      row[name] = String(formData.get(name) ?? "").trim() || null;
    }

    row.gaso_tipo = String(formData.get("gaso_tipo") ?? "").trim() || null;
    row.otros = String(formData.get("otros") ?? "").trim() || null;
    row.sampled_at =
      dateToTimestamp(String(formData.get("sampled_on") ?? "")) ??
      new Date().toISOString();

    const { error } = await supabase.from("labs").insert(row);

    if (error) {
      console.error("No se pudieron guardar los laboratorios:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return;
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
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/patients/${id}`}
          className="mb-8 inline-block text-sm text-cyan-300"
        >
          ← Volver al expediente
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8">
            <p className="text-sm text-cyan-300">Cama {patient.bed}</p>
            <h1 className="mt-2 text-4xl font-bold">Capturar laboratorios</h1>
            <p className="mt-3 text-slate-300">
              {patient.full_name} · {patient.diagnosis || "Sin diagnóstico registrado"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Captura solo lo que tengas: los campos vacíos se omiten, igual que en
              tu formato de nota.
            </p>
          </div>

          <LabsForm
            createLabs={createLabs}
            patient={{ age: patient.age, sex: patient.sex }}
            cancelHref={`/patients/${id}`}
            defaultDate={roundsToday()}
          />
        </section>
      </div>
    </main>
  );
}
