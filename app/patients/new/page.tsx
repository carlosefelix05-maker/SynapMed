import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";

export default function NewPatientPage() {
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

          <form action={createPatient} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <input name="bed" placeholder="Cama" required className="rounded-xl bg-[#071A2F] px-4 py-3 text-white" />
              <input name="full_name" placeholder="Nombre completo" required className="rounded-xl bg-[#071A2F] px-4 py-3 text-white" />
              <input name="age" type="number" placeholder="Edad" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white" />

              <select name="sex" defaultValue="" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white">
                <option value="" disabled>Sexo</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>

              <textarea
                name="diagnosis"
                rows={4}
                placeholder="Diagnóstico principal"
                className="rounded-xl bg-[#071A2F] px-4 py-3 text-white md:col-span-2"
              />

              <select name="subspecialty" defaultValue="Medicina Interna" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white">
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
              </select>

              <select name="priority" defaultValue="Estable" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white">
                <option value="Estable">Estable</option>
                <option value="Alta">Alta</option>
                <option value="Crítico">Crítico</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950">
                Guardar paciente
              </button>

              <Link href="/" className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-slate-200">
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
