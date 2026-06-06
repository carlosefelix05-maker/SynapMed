import Link from "next/link";

type Note = {
  id: string;
  title: string | null;
  content: string | null;
  type: string | null;
  created_at?: string | null;
};

type NotesSectionProps = {
  patientId: string;
  notes: Note[];
};

export default function NotesSection({ patientId, notes }: NotesSectionProps) {
  if (!notes || notes.length === 0) {
    return <p className="text-slate-400">Sin notas clínicas registradas.</p>;
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="rounded-2xl bg-[#071A2F] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-bold">{note.title || "Nota médica"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {note.type || "Nota médica"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/patients/${patientId}/notes/${note.id}`}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"
              >
                Ver
              </Link>

              <Link
                href={`/patients/${patientId}/notes/${note.id}/edit`}
                className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Editar
              </Link>
            </div>
          </div>

          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-slate-300">
            {note.content || "Sin contenido."}
          </p>
        </div>
      ))}
    </div>
  );
}