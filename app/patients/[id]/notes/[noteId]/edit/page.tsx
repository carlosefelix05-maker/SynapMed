

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { id, noteId } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed")
    .eq("id", id)
    .single();

  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("patient_id", id)
    .single();

  async function updateNote(formData: FormData) {
    "use server";

    const type = String(formData.get("type") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) return;

    await supabase
      .from("notes")
      .update({
        type: type || "Progress Note",
        title,
        content,
      })
      .eq("id", noteId)
      .eq("patient_id", id);

    revalidatePath(`/patients/${id}`);
    revalidatePath(`/patients/${id}/notes/${noteId}`);
    redirect(`/patients/${id}/notes/${noteId}`);
  }

  if (!patient || !note) {
    return (
      <main className="min-h-screen bg-[#061325] p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <Link href={`/patients/${id}`} className="text-sm text-cyan-300">
            ← Volver al expediente
          </Link>
          <p className="mt-8 text-red-300">Nota no encontrada.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href={`/patients/${id}/notes/${noteId}`} className="mb-8 inline-block text-sm text-cyan-300">
          ← Volver a la nota
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8">
            <p className="text-sm text-cyan-300">Cama {patient.bed} · {patient.full_name}</p>
            <h1 className="mt-2 text-4xl font-bold">Editar nota médica</h1>
          </div>

          <form action={updateNote} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Tipo de nota</label>
                <select
                  name="type"
                  defaultValue={note.type || "Progress Note"}
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
                  defaultValue={note.title || ""}
                  className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Contenido</label>
              <textarea
                name="content"
                defaultValue={note.content || ""}
                rows={24}
                className="w-full rounded-2xl border border-white/10 bg-[#071A2F] p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
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
                href={`/patients/${id}/notes/${noteId}`}
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