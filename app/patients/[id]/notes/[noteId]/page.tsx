import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export default async function NoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; noteId: string }>;
  searchParams?: Promise<{ confirmDelete?: string }>;
}) {
  const { id, noteId } = await params;
  const supabase = await createClient();
  const query = await searchParams;
  const isConfirmingDelete = query?.confirmDelete === "1";

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
    const supabase = await createClient();

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

  if (isConfirmingDelete) {
    return (
      <main className="min-h-screen bg-[#061325] p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href={`/patients/${id}/notes/${noteId}`} className="mb-8 inline-block text-sm text-cyan-300">
            ← Volver a la nota
          </Link>

          <section className="rounded-3xl border border-red-400/30 bg-red-400/10 p-8">
            <p className="text-sm font-semibold text-red-300">Confirmar eliminación</p>
            <h1 className="mt-3 text-4xl font-bold">¿Eliminar esta nota?</h1>
            <p className="mt-3 text-slate-300">
              Cama {patient.bed} · {patient.full_name}
            </p>

            <div className="mt-6 rounded-2xl bg-[#071A2F] p-5">
              <p className="font-bold text-white">{note.title || "Nota médica"}</p>
              <p className="mt-1 text-sm text-slate-500">{note.type || "Nota médica"}</p>
              <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {note.content || "Sin contenido."}
              </p>
            </div>

            <p className="mt-6 text-sm text-red-200">
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/patients/${id}/notes/${noteId}`}
                className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-slate-200 hover:bg-white/20"
              >
                Cancelar
              </Link>

              <form action={deleteNote}>
                <button
                  type="submit"
                  className="rounded-xl bg-red-400 px-6 py-3 font-semibold text-slate-950 hover:bg-red-300"
                >
                  Sí, eliminar nota
                </button>
              </form>
            </div>
          </section>
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

            <Link
              href={`/patients/${id}/notes/${noteId}?confirmDelete=1`}
              className="rounded-xl bg-red-400 px-5 py-3 font-semibold text-slate-950 hover:bg-red-300"
            >
              Eliminar nota
            </Link>
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