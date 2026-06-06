import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export default async function NewNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  const { data: latestLabs } = await supabase
    .from("labs")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const today = new Date().toLocaleDateString("es-MX");

  const labsResumen = latestLabs
    ? [
        latestLabs.glu ? `Glu ${latestLabs.glu}` : null,
        latestLabs.cr ? `Cr ${latestLabs.cr}` : null,
        latestLabs.na ? `Na ${latestLabs.na}` : null,
        latestLabs.k ? `K ${latestLabs.k}` : null,
        latestLabs.hb ? `Hb ${latestLabs.hb}` : null,
        latestLabs.leu ? `Leu ${latestLabs.leu}` : null,
        latestLabs.pct ? `PCT ${latestLabs.pct}` : null,
        latestLabs.bnp ? `BNP ${latestLabs.bnp}` : null,
        latestLabs.pcr ? `PCR ${latestLabs.pcr}` : null,
        latestLabs.otros ? `Otros: ${latestLabs.otros}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "Pendientes de captura";

  const defaultContent = `AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE Y RESPONDIENDO AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO: CONSCIENTE, ORIENTADO, SIN DATOS DE FOCALIZACIÓN NEUROLÓGICA.
CARDIOVASCULAR: RUIDOS CARDIACOS RÍTMICOS, DE BUEN TONO E INTENSIDAD.
RESPIRATORIO: ADECUADA EXPANSIÓN TORÁCICA, MURMULLO VESICULAR PRESENTE.
ABDOMEN: BLANDO, DEPRESIBLE, NO DOLOROSO.
EXTREMIDADES: SIN EDEMA, LLENADO CAPILAR CONSERVADO.

PARACLÍNICOS:
${labsResumen}

ANÁLISIS:
Paciente con diagnóstico principal de ${patient?.diagnosis || "patología en estudio"}, actualmente en seguimiento por Medicina Interna. Se sugiere correlacionar evolución clínica, exploración física, paraclínicos y respuesta al tratamiento.

PLAN:
Continuar vigilancia clínica; actualizar laboratorios según evolución; revalorar plan terapéutico durante pase de visita.`;

  async function createNote(formData: FormData) {
    "use server";

    const type = String(formData.get("type") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) {
      return;
    }

    await supabase.from("notes").insert({
      patient_id: id,
      type: type || "Progress Note",
      title,
      content,
    });

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
        <Link href={`/patients/${id}`} className="mb-8 inline-block text-sm text-cyan-300">
          ← Volver al expediente
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8">
            <p className="text-sm text-cyan-300">Cama {patient.bed}</p>
            <h1 className="mt-2 text-4xl font-bold">Nueva nota médica</h1>
            <p className="mt-3 text-slate-300">
              {patient.full_name} · {patient.diagnosis || "Sin diagnóstico registrado"}
            </p>
          </div>

          <form action={createNote} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Tipo de nota</label>
                <select
                  name="type"
                  defaultValue="Progress Note"
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="Progress Note">Evolución</option>
                  <option value="Admission Note">Ingreso</option>
                  <option value="Comment Note">Comentario</option>
                  <option value="Preoperative Evaluation">VPO</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Título</label>
                <input
                  name="title"
                  defaultValue={`Evolución ${today}`}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Contenido</label>
              <textarea
                name="content"
                defaultValue={defaultContent}
                rows={24}
                className="w-full rounded-2xl border border-white/10 bg-[#071A2F] p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Guardar nota
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
