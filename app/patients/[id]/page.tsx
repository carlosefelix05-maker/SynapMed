import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export default async function PatientPage({
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

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  async function createNote(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) {
      return;
    }

    await supabase.from("notes").insert({
      patient_id: id,
      type: "progress",
      title,
      content,
    });

    revalidatePath(`/patients/${id}`);
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#061325] p-10 text-white">
        <h1>Paciente no encontrado</h1>
      </main>
    );
  }

  const today = new Date().toLocaleDateString("es-MX");

  const plantillaMI = `AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE, ORIENTADO Y RESPONDIENDO ADECUADAMENTE AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO: CONSCIENTE, ORIENTADO, SIN DATOS DE FOCALIZACIÓN NEUROLÓGICA.
CARDIOVASCULAR: RUIDOS CARDIACOS RÍTMICOS, DE BUEN TONO E INTENSIDAD.
RESPIRATORIO: ADECUADA EXPANSIÓN TORÁCICA, MURMULLO VESICULAR PRESENTE.
ABDOMEN: BLANDO, DEPRESIBLE, NO DOLOROSO.
EXTREMIDADES: SIN EDEMA, LLENADO CAPILAR CONSERVADO.

ANÁLISIS:

PLAN:`;

  const plantillaIngreso = `FICHA DE IDENTIFICACIÓN:
NOMBRE:
EDAD:
SEXO:
CAMA:

PADECIMIENTO ACTUAL:

ANTECEDENTES HEREDOFAMILIARES:

ANTECEDENTES PERSONALES NO PATOLÓGICOS:

ANTECEDENTES PERSONALES PATOLÓGICOS:

EXPLORACIÓN FÍSICA:
NEUROLÓGICO:
CARDIOVASCULAR:
RESPIRATORIO:
ABDOMEN:
EXTREMIDADES:

PARACLÍNICOS:

ANÁLISIS:

PLAN:`;

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-8 inline-block text-sm text-cyan-300">
          ← Volver a Rounds
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <p className="text-slate-400">Cama {patient.bed}</p>

          <h1 className="mt-2 text-5xl font-bold">{patient.full_name}</h1>

          <p className="mt-4 text-xl text-slate-300">{patient.diagnosis}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Edad</p>
              <p className="text-2xl font-bold">{patient.age}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Sexo</p>
              <p className="text-2xl font-bold">{patient.sex}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Prioridad</p>
              <p className="text-2xl font-bold">{patient.priority}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Problemas activos
            </h2>

            <div className="flex flex-wrap gap-2">
              {(patient.diagnosis ?? "")
                .split("/")
                .map((problem: string) => problem.trim())
                .map((problem: string) => (
                  <span
                    key={problem}
                    className="rounded-full bg-white/10 px-3 py-1 text-sm"
                  >
                    {problem}
                  </span>
                ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Labs relevantes
            </h2>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
                Pendiente captura
              </span>
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Pendientes
            </h2>

            <ul className="space-y-2 text-slate-300">
              <li>☐ Revisión por pase de visita</li>
              <li>☐ Actualizar laboratorios</li>
              <li>☐ Definir plan del día</li>
            </ul>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Plan del día
            </h2>

            <ul className="space-y-2 text-slate-300">
              <li>• Continuar vigilancia clínica</li>
              <li>• Revalorar según evolución</li>
              <li>• Documentar Progress Note</li>
            </ul>
          </section>
          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-cyan-300">
                Notas clínicas
              </h2>

              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                + Nueva evolución
              </span>
            </div>

            <form action={createNote} className="mb-6 rounded-2xl bg-[#071A2F] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Título
                  </label>
                  <input
                    name="title"
                    defaultValue={`Evolución ${today}`}
                    placeholder="Evolución 06/06/2026"
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Tipo
                  </label>
                  <input
                    value="Progress Note"
                    readOnly
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-slate-400">
                  Contenido
                </label>
                <textarea
                  name="content"
                  rows={14}
                  defaultValue={plantillaMI}
                  placeholder="Paciente al pase de visita..."
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
              >
                Guardar evolución
              </button>
            </form>

            <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="mb-2 font-semibold text-cyan-300">Plantilla MI rápida</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
{`AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE, ORIENTADO Y RESPONDIENDO ADECUADAMENTE AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO: CONSCIENTE, ORIENTADO, SIN DATOS DE FOCALIZACIÓN NEUROLÓGICA.
CARDIOVASCULAR: RUIDOS CARDIACOS RÍTMICOS, DE BUEN TONO E INTENSIDAD.
RESPIRATORIO: ADECUADA EXPANSIÓN TORÁCICA, MURMULLO VESICULAR PRESENTE.
ABDOMEN: BLANDO, DEPRESIBLE, NO DOLOROSO.
EXTREMIDADES: SIN EDEMA, LLENADO CAPILAR CONSERVADO.

ANÁLISIS:

PLAN:`}
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="mb-2 font-semibold text-cyan-300">Plantilla de ingreso</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {plantillaIngreso}
              </p>
            </div>

            {notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-2xl bg-[#071A2F] p-4">
                    <p className="font-bold">{note.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-300">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Sin notas clínicas registradas.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}