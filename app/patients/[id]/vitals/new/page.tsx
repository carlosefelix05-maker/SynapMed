

import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function NewPatientVitalsPage({
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
    .single();

  async function createVitals(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const recorded_at = String(formData.get("recorded_at") ?? "").trim();
    const ta = String(formData.get("ta") ?? "").trim();
    const fc = String(formData.get("fc") ?? "").trim();
    const fr = String(formData.get("fr") ?? "").trim();
    const temp = String(formData.get("temp") ?? "").trim();
    const spo2 = String(formData.get("spo2") ?? "").trim();
    const glucemia = String(formData.get("glucemia") ?? "").trim();
    const diuresis = String(formData.get("diuresis") ?? "").trim();
    const peso = String(formData.get("peso") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    await supabase.from("patient_vitals").insert({
      patient_id: id,
      recorded_at: recorded_at || new Date().toISOString(),
      ta: ta || null,
      fc: fc || null,
      fr: fr || null,
      temp: temp || null,
      spo2: spo2 || null,
      glucemia: glucemia || null,
      diuresis: diuresis || null,
      peso: peso || null,
      notes: notes || null,
    });

    redirect(`/patients/${id}`);
  }

  return (
    <main className="min-h-screen bg-[#071A2F] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Signos vitales
          </p>
          <h1 className="mt-2 text-3xl font-bold">Agregar SV del pase</h1>
          <p className="mt-2 text-sm text-slate-400">
            {patient?.full_name || "Paciente"}
            {patient?.bed ? ` · Cama ${patient.bed}` : ""}
          </p>
        </header>

        <form action={createVitals} className="space-y-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Fecha y hora del pase</label>
            <input
              type="datetime-local"
              name="recorded_at"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Si se deja vacío, se guardará la fecha y hora actual.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">TA</label>
              <input
                name="ta"
                placeholder="120/80"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">FC</label>
              <input
                name="fc"
                placeholder="80"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">FR</label>
              <input
                name="fr"
                placeholder="18"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Temp</label>
              <input
                name="temp"
                placeholder="36.5"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">SpO₂</label>
              <input
                name="spo2"
                placeholder="98%"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Glucemia</label>
              <input
                name="glucemia"
                placeholder="110"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Diuresis</label>
              <input
                name="diuresis"
                placeholder="1200 ml/24 h"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Peso</label>
              <input
                name="peso"
                placeholder="70 kg"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Comentario</label>
            <textarea
              name="notes"
              rows={4}
              placeholder="Ej. Afebril, normotenso, saturando aire ambiente, diuresis conservada."
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Guardar SV
            </button>

            <Link
              href={`/patients/${id}`}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}