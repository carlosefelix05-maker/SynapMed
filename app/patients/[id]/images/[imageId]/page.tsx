import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PatientImagePage({
  params,
}: {
  params: Promise<{ id: string; imageId: string }>;
}) {
  const { id, imageId } = await params;
  const supabase = await createClient();

  const { data: image } = await supabase
    .from("patient_images")
    .select("*")
    .eq("id", imageId)
    .eq("patient_id", id)
    .single();

  if (!image) {
    return (
      <main className="min-h-screen bg-[#061325] p-8 text-white">
        <Link href={`/patients/${id}`} className="text-sm text-cyan-300">
          ← Volver al expediente
        </Link>
        <p className="mt-8 text-red-300">Imagen no encontrada.</p>
      </main>
    );
  }

  const imagePath = image.image_url?.includes("/patient-images/")
    ? image.image_url.split("/patient-images/").pop()
    : image.image_url;

  const { data: signedImage } = await supabase.storage
    .from("patient-images")
    .createSignedUrl(imagePath, 60 * 10);

  const imageSrc = signedImage?.signedUrl;

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href={`/patients/${id}`} className="mb-6 inline-block text-sm text-cyan-300">
          ← Volver al expediente
        </Link>

        <section className="rounded-3xl bg-white/10 p-6">
          <p className="text-sm text-cyan-300">{image.study_type || "Estudio clínico"}</p>
          <h1 className="mt-2 text-3xl font-bold">{image.title || "Imagen clínica"}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {new Date(image.created_at).toLocaleString("es-MX")}
          </p>

          {!imageSrc && (
            <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              No se pudo generar una URL segura para esta imagen.
            </p>
          )}

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <img
              src={imageSrc || ""}
              alt={image.title || "Imagen clínica"}
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </section>
      </div>
    </main>
  );
}