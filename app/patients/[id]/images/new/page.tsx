import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";

export default async function NewImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  async function uploadImage(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const file = formData.get("image") as File;
    const title = String(formData.get("title") ?? "").trim();
    const studyType = String(formData.get("study_type") ?? "").trim();

    if (!file || file.size === 0) return;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${id}/${Date.now()}_${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("patient-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const publicUrl = supabase.storage
      .from("patient-images")
      .getPublicUrl(uploadData.path).data.publicUrl;

    await supabase.from("patient_images").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
      title: title || "Imagen clínica",
      study_type: studyType || "Imagen",
      image_url: publicUrl,
    });

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
            <p className="text-sm text-cyan-300">Cama {patient.bed} · {patient.full_name}</p>
            <h1 className="mt-2 text-4xl font-bold">Subir imagen</h1>
            <p className="mt-3 text-slate-400">Guarda radiografías, TAC, ECG, fotos clínicas o estudios relevantes.</p>
          </div>

          <form action={uploadImage} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Título</label>
              <input
                name="title"
                placeholder="Ej. Radiografía de tórax"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Tipo de estudio</label>
              <input
                name="study_type"
                placeholder="Ej. Rx, TAC, ECG, USG"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Imagen</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                required
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Subir imagen
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
