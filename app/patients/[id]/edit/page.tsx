import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export default async function EditPatientPage({
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

  async function updatePatient(formData: FormData) {
    "use server";

    const full_name = String(formData.get("full_name") ?? "").trim();
    const bed = String(formData.get("bed") ?? "").trim();
    const ageValue = String(formData.get("age") ?? "").trim();
    const sex = String(formData.get("sex") ?? "").trim();
    const diagnosis = String(formData.get("diagnosis") ?? "").trim();
    const priority = String(formData.get("priority") ?? "").trim();
    const subspecialty = String(formData.get("subspecialty") ?? "").trim();

    await supabase
      .from("patients")
      .update({
        full_name,
        bed,
        age: ageValue ? Number(ageValue) : null,
        sex: sex || null,
        diagnosis: diagnosis || null,
        priority: priority || "Estable",
        subspecialty: subspecialty || "Medicina Interna",
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
            <p className="text-sm text-cyan-300">SynapMed · Patients</p>
            <h1 className="mt-2 text-4xl font-bold">Editar paciente</h1>
            <p className="mt-3 text-slate-300">
              Actualiza cama, diagnóstico, prioridad y subespecialidad.
            </p>
          </div>

          <form action={updatePatient} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Cama</label>
                <input
                  name="bed"
                  defaultValue={patient.bed || ""}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Nombre completo</label>
                <input
                  name="full_name"
                  defaultValue={patient.full_name || ""}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Edad</label>
                <input
                  name="age"
                  type="number"
                  defaultValue={patient.age || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Sexo</label>
                <select
                  name="sex"
                  defaultValue={patient.sex || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="">Sin especificar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">Diagnóstico principal</label>
                <textarea
                  name="diagnosis"
                  rows={4}
                  defaultValue={patient.diagnosis || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Prioridad</label>
                <select
                  name="priority"
                  defaultValue={patient.priority || "Estable"}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="Estable">Estable</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítico">Crítico</option>
                </select>
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
                  <option value="Infectología">Infectología</option>
                  <option value="Endocrinología">Endocrinología</option>
                  <option value="Neurología">Neurología</option>
                  <option value="Hematología">Hematología</option>
                  <option value="Oncología">Oncología</option>
                  <option value="Reumatología">Reumatología</option>
                  <option value="Geriatría">Geriatría</option>
                  <option value="Terapia Intensiva">Terapia Intensiva</option>
                  <option value="Preoperatorio / VPO">Preoperatorio / VPO</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
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
