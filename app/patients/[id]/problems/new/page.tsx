import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export default async function NewProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed")
    .eq("id", id)
    .single();

  async function createProblem(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const status = String(formData.get("status") ?? "Activo").trim();
    const priority = String(formData.get("priority") ?? "Media").trim();
    const comments = String(formData.get("comments") ?? "").trim();

    if (!title) return;

    const { error } = await supabase.from("problems").insert({
      patient_id: id,
      title,
      status: status || "Activo",
      priority: priority || "Media",
      comments: comments || null,
      resolved_at: status === "Resuelto" ? new Date().toISOString() : null,
    });

    if (error) {
      console.error("Error al guardar problema:", error.message);
      throw new Error(`No se pudo guardar el problema: ${error.message}`);
    }

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
            <p className="text-sm text-cyan-300">Nuevo problema activo</p>
            <h1 className="mt-2 text-4xl font-bold">{patient.full_name}</h1>
            <p className="mt-3 text-slate-400">Cama {patient.bed}</p>
          </div>

          <form action={createProblem} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Problema</label>
              <input
                name="title"
                placeholder="Ej. Lesión renal aguda KDIGO II"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Estado</label>
                <select
                  name="status"
                  defaultValue="Activo"
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="Activo">Activo</option>
                  <option value="Crónico">Crónico</option>
                  <option value="Resuelto">Resuelto</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Prioridad</label>
                <select
                  name="priority"
                  defaultValue="Media"
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                >
                  <option value="Crítico">Crítico</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Comentarios</label>
              <textarea
                name="comments"
                rows={5}
                placeholder="Contexto, evolución, pendientes o criterio clínico."
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Guardar problema
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