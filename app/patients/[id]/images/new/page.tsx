

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function NewPatientImagePage({
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

  async function uploadImage(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const studyType = String(formData.get("study_type") ?? "").trim();
    const file = formData.get("image");

    if (!title) return;
    if (!(file instanceof File) || file.size === 0) return;

    const safeName = cleanFileName(file.name || "imagen-clinica");
    const storagePath = `${id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("patient-images")
      .upload(storagePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error al subir imagen:", uploadError.message);
      throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("patient-images")
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase.from("patient_images").insert({
      patient_id: id,
      title,
      study_type: studyType || null,
      image_url: imageUrl,
    });

    if (insertError) {
      console.error("Error al guardar imagen clínica:", insertError.message);
      throw new Error(`No se pudo guardar la imagen clínica: ${insertError.message}`);
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
            <p className="text-sm text-cyan-300">Nueva imagen clínica</p>
            <h1 className="mt-2 text-4xl font-bold">{patient.full_name}</h1>
            <p className="mt-3 text-slate-400">Cama {patient.bed}</p>
          </div>

          <form action={uploadImage} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Título</label>
              <input
                name="title"
                placeholder="Ej. Rx tórax AP 09/06/26"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Tipo de estudio</label>
              <select
                name="study_type"
                defaultValue="Rx"
                className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
              >
                <option value="Rx">Rx</option>
                <option value="TAC">TAC</option>
                <option value="ECG">ECG</option>
                <option value="Ultrasonido">Ultrasonido</option>
                <option value="Ecocardiograma">Ecocardiograma</option>
                <option value="Herida">Herida</option>
                <option value="Laboratorio">Laboratorio</option>
                <option value="Reporte">Reporte</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Imagen</label>
              <input
                name="image"
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
              />
              <p className="mt-2 text-xs text-slate-500">
                Puedes subir Rx, ECG, TAC, heridas, reportes escaneados o capturas clínicas.
              </p>
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