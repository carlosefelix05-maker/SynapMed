import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  diagnosis: string | null;
  bed: string | null;
  priority: string | null;
  subspecialty: string | null;
};

type Lab = {
  id: string;
  patient_id: string;
  glu: string | null;
  cr: string | null;
  na: string | null;
  k: string | null;
  hb: string | null;
  leu: string | null;
  pct: string | null;
  bnp: string | null;
  pcr: string | null;
  otros: string | null;
  created_at: string;
};

export default async function CensusPage({
  searchParams,
}: {
  searchParams?: Promise<{ subspecialty?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const selectedSubspecialty =
    params?.subspecialty && params.subspecialty !== "Todas"
      ? params.subspecialty
      : "Todas";

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("bed", { ascending: true });

  const { data: labs } = await supabase
    .from("labs")
    .select("*")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  const list = (patients ?? []) as Patient[];
  const labsList = (labs ?? []) as Lab[];
  const latestLabsByPatient = new Map<string, Lab>();

  for (const lab of labsList) {
    if (!latestLabsByPatient.has(lab.patient_id)) {
      latestLabsByPatient.set(lab.patient_id, lab);
    }
  }

  function formatLabs(lab?: Lab) {
    if (!lab) return "Sin labs";

    return [
      lab.glu ? `Glu ${lab.glu}` : null,
      lab.cr ? `Cr ${lab.cr}` : null,
      lab.na ? `Na ${lab.na}` : null,
      lab.k ? `K ${lab.k}` : null,
      lab.hb ? `Hb ${lab.hb}` : null,
      lab.leu ? `Leu ${lab.leu}` : null,
      lab.pct ? `PCT ${lab.pct}` : null,
      lab.bnp ? `BNP ${lab.bnp}` : null,
      lab.pcr ? `PCR ${lab.pcr}` : null,
      lab.otros ? `Otros: ${lab.otros}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Sin labs";
  }

  function visualPriority(patient: Patient, lab?: Lab) {
    if (!lab) return patient.priority || "Sin prioridad";

    const cr = Number(lab.cr);
    const hb = Number(lab.hb);
    const leu = Number(lab.leu);
    const pct = Number(lab.pct);

    if (
      (!Number.isNaN(cr) && cr >= 2) ||
      (!Number.isNaN(hb) && hb <= 8) ||
      (!Number.isNaN(leu) && leu >= 15) ||
      (!Number.isNaN(pct) && pct >= 2)
    ) {
      return "Crítico";
    }

    if (
      (!Number.isNaN(cr) && cr >= 1.5) ||
      (!Number.isNaN(hb) && hb <= 10) ||
      (!Number.isNaN(leu) && leu >= 12) ||
      (!Number.isNaN(pct) && pct >= 0.5)
    ) {
      return "Alta";
    }

    return patient.priority || "Estable";
  }

  const visiblePatients =
    selectedSubspecialty === "Todas"
      ? list
      : list.filter(
          (patient) =>
            (patient.subspecialty || "Medicina Interna") === selectedSubspecialty
        );

  const censusLines = visiblePatients.map((patient) => {
    const lab = latestLabsByPatient.get(patient.id);

    return `CAMA ${patient.bed || "S/C"} | ${patient.full_name} | ${
      patient.subspecialty || "Medicina Interna"
    } | ${patient.diagnosis || "Sin diagnóstico"} | ${formatLabs(lab)} | ${visualPriority(
      patient,
      lab
    )}`;
  });

  const censusText = censusLines.join("\n");

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-sm text-cyan-300">
              ← Volver a Rounds
            </Link>
            <h1 className="mt-3 text-4xl font-bold">📋 Censo automático</h1>
            <p className="mt-2 text-slate-400">
              {selectedSubspecialty === "Todas"
                ? "Todas las subespecialidades"
                : selectedSubspecialty} · {visiblePatients.length} paciente(s)
            </p>
          </div>

          <Link
            href="/patients/new"
            className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
          >
            + Nuevo paciente
          </Link>
        </div>

        <section className="rounded-3xl bg-white/10 p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-bold text-cyan-300">Censo para copiar</h2>
            <p className="text-sm text-slate-400">
              CAMA | PACIENTE | SUBESP | DX | LABS | PRIORIDAD
            </p>
          </div>

          <textarea
            readOnly
            value={censusText}
            rows={Math.max(8, visiblePatients.length + 2)}
            className="w-full rounded-2xl border border-white/10 bg-[#071A2F] p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
          />

          <p className="mt-3 text-sm text-slate-400">
            Selecciona el texto y cópialo con Cmd + C para pegarlo en WhatsApp,
            Word o entrega de guardia.
          </p>
        </section>

        <section className="mt-6 rounded-3xl bg-white/10 p-6">
          <h2 className="mb-4 text-2xl font-bold text-cyan-300">Vista rápida</h2>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-6 bg-white/10 px-4 py-3 text-sm text-slate-300">
              <span>Cama</span>
              <span>Paciente</span>
              <span>Subespecialidad</span>
              <span>Diagnóstico</span>
              <span>Labs</span>
              <span>Prioridad</span>
            </div>

            {visiblePatients.map((patient) => {
              const lab = latestLabsByPatient.get(patient.id);

              return (
                <Link
                  href={`/patients/${patient.id}`}
                  key={patient.id}
                  className="grid grid-cols-6 border-t border-white/10 px-4 py-4 text-sm hover:bg-white/10"
                >
                  <span className="font-semibold">{patient.bed}</span>
                  <span>{patient.full_name}</span>
                  <span className="text-slate-300">
                    {patient.subspecialty || "Medicina Interna"}
                  </span>
                  <span className="text-slate-300">{patient.diagnosis}</span>
                  <span className="text-slate-300">{formatLabs(lab)}</span>
                  <span>{visualPriority(patient, lab)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
