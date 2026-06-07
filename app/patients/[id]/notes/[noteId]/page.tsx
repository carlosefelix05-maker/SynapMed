import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export default async function NoteDetailPage({
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

  async function deleteNote() {
    "use server";

    await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("patient_id", id);

    revalidatePath(`/patients/${id}`);
    redirect(`/patients/${id}`);
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
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={`/patients/${id}`} className="text-sm text-cyan-300">
              ← Volver al expediente
            </Link>
            <h1 className="mt-3 text-4xl font-bold">{note.title || "Nota médica"}</h1>
            <p className="mt-2 text-slate-400">
              Cama {patient.bed} · {patient.full_name} · {note.type || "Nota médica"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/patients/${id}/notes/${noteId}/edit`}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Editar nota
            </Link>

            <form action={deleteNote}>
              <button
                type="submit"
                className="rounded-xl bg-red-400 px-5 py-3 font-semibold text-slate-950 hover:bg-red-300"
              >
                Eliminar nota
              </button>
            </form>
          </div>
        </div>

        <section className="rounded-3xl bg-white/10 p-8">
          <p className="whitespace-pre-wrap font-mono text-sm leading-7 text-slate-100">
            {note.content || "Sin contenido."}
          </p>
        </section>
      </div>
    </main>
  );
}