import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();
const { data: notes } = await supabase
  .from("notes")
  .select("*")
  .eq("patient_id", id)
  .order("created_at", { ascending: false });
  if (!patient) {
    return (
      <main className="min-h-screen bg-[#061325] p-10 text-white">
        <h1>Paciente no encontrado</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-8 inline-block text-sm text-cyan-300">
          ← Volver a Rounds
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <p className="text-slate-400">Cama {patient.bed}</p>

          <h1 className="mt-2 text-5xl font-bold">{patient.full_name}</h1>

          <p className="mt-4 text-xl text-slate-300">{patient.diagnosis}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Edad</p>
              <p className="text-2xl font-bold">{patient.age}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Sexo</p>
              <p className="text-2xl font-bold">{patient.sex}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Prioridad</p>
              <p className="text-2xl font-bold">{patient.priority}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Problemas activos
            </h2>

            <div className="flex flex-wrap gap-2">
              {(patient.diagnosis ?? "")
                .split("/")
                .map((problem: string) => problem.trim())
                .map((problem: string) => (
                  <span
                    key={problem}
                    className="rounded-full bg-white/10 px-3 py-1 text-sm"
                  >
                    {problem}
                  </span>
                ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Labs relevantes
            </h2>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
                Pendiente captura
              </span>
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Pendientes
            </h2>

            <ul className="space-y-2 text-slate-300">
              <li>☐ Revisión por pase de visita</li>
              <li>☐ Actualizar laboratorios</li>
              <li>☐ Definir plan del día</li>
            </ul>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">
              Plan del día
            </h2>

            <ul className="space-y-2 text-slate-300">
              <li>• Continuar vigilancia clínica</li>
              <li>• Revalorar según evolución</li>
              <li>• Documentar Progress Note</li>
            </ul>
          </section>
          <section className="mt-6 rounded-3xl bg-white/10 p-6">
  <h2 className="mb-4 text-2xl font-bold text-cyan-300">
    Notas clínicas
  </h2>

<div className="rounded-2xl bg-[#071A2F] p-4">
  <p className="font-bold">Evolución 06/06/2026</p>
  <p className="mt-2 text-slate-300">
    Paciente estable, sin eventos agudos.
  </p>
</div>
</section>
        </div>
      </div>
    </main>
  );
}