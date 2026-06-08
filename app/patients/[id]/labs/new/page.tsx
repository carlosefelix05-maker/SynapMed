import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";

export default async function NewLabsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed, diagnosis")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  async function createLabs(formData: FormData) {
    "use server";

    const supabase = await createClient();

    await supabase.from("labs").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
      glu: String(formData.get("glu") ?? "").trim() || null,
      cr: String(formData.get("cr") ?? "").trim() || null,
      na: String(formData.get("na") ?? "").trim() || null,
      k: String(formData.get("k") ?? "").trim() || null,
      hb: String(formData.get("hb") ?? "").trim() || null,
      leu: String(formData.get("leu") ?? "").trim() || null,
      pct: String(formData.get("pct") ?? "").trim() || null,
      bnp: String(formData.get("bnp") ?? "").trim() || null,
      pcr: String(formData.get("pcr") ?? "").trim() || null,
      otros: String(formData.get("otros") ?? "").trim() || null,
    });

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
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
            <p className="text-sm text-cyan-300">Cama {patient.bed}</p>
            <h1 className="mt-2 text-4xl font-bold">Capturar laboratorios</h1>
            <p className="mt-3 text-slate-300">
              {patient.full_name} · {patient.diagnosis || "Sin diagnóstico registrado"}
            </p>
          </div>

          <form action={createLabs} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <input name="glu" placeholder="Glu" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="cr" placeholder="Cr" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="na" placeholder="Na" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="k" placeholder="K" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="hb" placeholder="Hb" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="leu" placeholder="Leu" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="pct" placeholder="PCT" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="bnp" placeholder="BNP" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <input name="pcr" placeholder="PCR" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
            </div>

            <textarea
              name="otros"
              rows={4}
              placeholder="Otros parámetros: Ure 102, Bun 48, Plaq 210, Mg 2.1..."
              className="w-full rounded-2xl bg-[#071A2F] p-4 text-white outline-none placeholder:text-slate-500"
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Guardar laboratorios
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
