import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { roundsToday, formatRoundsDate } from "@/lib/date";
import PresentationEditor, {
  type PresentationFormState,
} from "@/app/components/PresentationEditor";

export default async function PresentationEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(query?.date || "")
    ? (query!.date as string)
    : roundsToday();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  const { data: existing } = await supabase
    .from("presentations")
    .select("content, presented_on")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .eq("presented_on", requestedDate)
    .maybeSingle();

  async function savePresentation(
    _state: PresentationFormState,
    formData: FormData
  ): Promise<PresentationFormState> {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const content = String(formData.get("content") ?? "").trim();
    const rawDate = String(formData.get("presented_on") ?? "").trim();
    const presentedOn = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : roundsToday();

    if (!content) {
      return { message: "Escribe la presentación antes de guardar." };
    }

    const { error } = await supabase.from("presentations").upsert(
      {
        patient_id: id,
        team_id: CURRENT_TEAM_ID,
        presented_on: presentedOn,
        content,
        created_by: user?.id ?? null,
      },
      { onConflict: "patient_id,presented_on" }
    );

    if (error) {
      console.error("No se pudo guardar la presentación:", error);

      // Caso típico mientras la tabla no exista todavía en Supabase.
      const missingTable =
        error.code === "42P01" ||
        String(error.message || "").includes("presentations");

      return {
        message: missingTable
          ? `No se pudo guardar: ${error.message}. Revisa que la tabla presentations exista en Supabase (supabase/migrations/20260830_presentations.sql).`
          : `No se pudo guardar: ${error.message}`,
      };
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

            <h1 className="mt-2 text-4xl font-bold">
              {existing ? "Editar presentación" : "Nueva presentación"}
            </h1>

            <p className="mt-3 text-slate-300">
              {patient.full_name} · {patient.diagnosis || "Sin diagnóstico registrado"}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Pase del {formatRoundsDate(requestedDate)}
            </p>
          </div>

          <PresentationEditor
            patientId={id}
            savePresentation={savePresentation}
            defaultContent={existing?.content || ""}
            defaultDate={requestedDate}
            cancelHref={`/patients/${id}`}
          />
        </section>
      </div>
    </main>
  );
}
