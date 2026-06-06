import { supabase } from "@/lib/supabase";

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  diagnosis: string | null;
  bed: string | null;
  priority: string | null;
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

export default async function Home() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("bed", { ascending: true });

  const { data: labs } = await supabase
    .from("labs")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: notes } = await supabase
    .from("notes")
    .select("patient_id, created_at")
    .order("created_at", { ascending: false });

  const { data: roundLogs } = await supabase
    .from("round_logs")
    .select("patient_id, completed_at")
    .order("completed_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#071A2F] p-10 text-white">
        <h1 className="text-3xl font-bold">SynapMed</h1>
        <p className="mt-4 text-red-300">Error cargando pacientes.</p>
      </main>
    );
  }

  const list = (patients ?? []) as Patient[];
  const labsList = (labs ?? []) as Lab[];
  const notesList = (notes ?? []) as { patient_id: string; created_at: string }[];
  const roundLogsList = (roundLogs ?? []) as { patient_id: string; completed_at: string }[];
  const latestLabsByPatient = new Map<string, Lab>();

  for (const lab of labsList) {
    if (!latestLabsByPatient.has(lab.patient_id)) {
      latestLabsByPatient.set(lab.patient_id, lab);
    }
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const patientsWithNoteToday = new Set<string>();

  for (const note of notesList) {
    if (note.created_at?.slice(0, 10) === todayKey) {
      patientsWithNoteToday.add(note.patient_id);
    }
  }

  const patientsWithRoundCompletedToday = new Set<string>();

  for (const log of roundLogsList) {
    if (log.completed_at?.slice(0, 10) === todayKey) {
      patientsWithRoundCompletedToday.add(log.patient_id);
    }
  }

  function formatLabs(lab?: Lab) {
    if (!lab) return "Sin labs";

    return [
      lab.cr ? `Cr ${lab.cr}` : null,
      lab.k ? `K ${lab.k}` : null,
      lab.hb ? `Hb ${lab.hb}` : null,
      lab.leu ? `Leu ${lab.leu}` : null,
      lab.pct ? `PCT ${lab.pct}` : null,
      lab.bnp ? `BNP ${lab.bnp}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Sin labs";
  }

  function labAlertClass(lab?: Lab) {
    if (!lab) return "text-slate-300";

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
      return "text-red-400 font-semibold";
    }

    if (
      (!Number.isNaN(cr) && cr >= 1.5) ||
      (!Number.isNaN(hb) && hb <= 10) ||
      (!Number.isNaN(leu) && leu >= 12) ||
      (!Number.isNaN(pct) && pct >= 0.5)
    ) {
      return "text-amber-300 font-medium";
    }

    return "text-green-300";
  }

  function patientRowClass(lab?: Lab) {
    if (!lab) return "border-t border-white/10 px-4 py-4 text-sm transition hover:bg-white/10";

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
      return "border-t border-red-400/30 bg-red-400/10 px-4 py-4 text-sm transition hover:bg-red-400/15";
    }

    if (
      (!Number.isNaN(cr) && cr >= 1.5) ||
      (!Number.isNaN(hb) && hb <= 10) ||
      (!Number.isNaN(leu) && leu >= 12) ||
      (!Number.isNaN(pct) && pct >= 0.5)
    ) {
      return "border-t border-amber-300/30 bg-amber-300/10 px-4 py-4 text-sm transition hover:bg-amber-300/15";
    }

    return "border-t border-green-300/20 bg-green-300/5 px-4 py-4 text-sm transition hover:bg-green-300/10";
  }

  function visualPriority(lab?: Lab, fallback?: string | null) {
    if (!lab) return fallback || "Sin prioridad";

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

    return fallback || "Estable";
  }

  const patientSummaries = list.map((patient) => {
    const lab = latestLabsByPatient.get(patient.id);
    const priority = visualPriority(lab, patient.priority);

    return {
      patient,
      lab,
      priority,
    };
  });

  const criticalCount = patientSummaries.filter((item) => item.priority === "Crítico").length;
  const highPriorityCount = patientSummaries.filter((item) => item.priority === "Alta").length;
  const stableCount = patientSummaries.filter((item) => item.priority === "Estable").length;
  const noLabsCount = patientSummaries.filter((item) => !item.lab).length;
  const criticalPendingCount = criticalCount;
  const noNoteTodayCount = patientSummaries.filter((item) => !patientsWithNoteToday.has(item.patient.id)).length;
  const completedRoundsCount = patientSummaries.filter((item) => patientsWithRoundCompletedToday.has(item.patient.id)).length;
  const pendingRoundsCount = patientSummaries.length - completedRoundsCount;

  const criticalAlerts = patientSummaries
    .filter((item) => item.priority === "Crítico")
    .map((item) => ({
      bed: item.patient.bed,
      name: item.patient.full_name,
      labs: formatLabs(item.lab),
    }));

  const nextPatientForRounds =
    patientSummaries.find((item) => item.priority === "Crítico")?.patient.id ||
    patientSummaries.find((item) => item.priority === "Alta")?.patient.id ||
    patientSummaries[0]?.patient.id;

  return (
    <main className="min-h-screen bg-[#071A2F] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#061527] p-6 lg:block">
          <h1 className="text-2xl font-bold">SynapMed</h1>
          <p className="mb-8 text-xs text-cyan-300">
            Conectando la inteligencia médica
          </p>

          {["Synapse", "Rounds", "Patients", "Notes", "Calc", "Drugs", "Protocols"].map(
            (item) => (
              <button
                key={item}
                className={`mb-2 w-full rounded-xl px-4 py-3 text-left text-sm ${
                  item === "Rounds"
                    ? "bg-cyan-400 font-semibold text-slate-950"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            )
          )}
        </aside>

        <section className="flex-1 p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-slate-400">Buenos días,</p>
              <h2 className="text-3xl font-bold">Dr. Carlos</h2>
            </div>

            <div className="rounded-full bg-white/10 p-1">
              <button className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950">
                Hospital
              </button>
              <button className="px-5 py-2 text-sm text-slate-300">
                Consulta
              </button>
            </div>
          </header>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">🏥 Rounds</h3>
                <p className="text-slate-300">
                  Medicina Interna · Pacientes desde Supabase
                </p>
              </div>

              <a
                href={nextPatientForRounds ? `/patients/${nextPatientForRounds}` : "#"}
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
              >
                Iniciar Pase
              </a>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4 text-sm text-slate-300">
              <span className="font-semibold text-white">{list.length}</span> pacientes activos · Lista priorizada por últimos laboratorios
            </div>
          </section>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">☀️ Morning Report</h3>
                <p className="text-sm text-slate-400">
                  Resumen automático del servicio
                </p>
              </div>

              <p className="text-sm text-slate-400">
                Sincronizado con últimos laboratorios
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Críticos</p>
                <p className="mt-2 text-3xl font-bold text-red-400">{criticalCount}</p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Alta prioridad</p>
                <p className="mt-2 text-3xl font-bold text-amber-300">{highPriorityCount}</p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Estables</p>
                <p className="mt-2 text-3xl font-bold text-green-300">{stableCount}</p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Pase completado</p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">{completedRoundsCount}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#071A2F] p-4">
              <h4 className="mb-3 font-semibold text-cyan-300">Alertas críticas</h4>

              {criticalAlerts.length > 0 ? (
                <div className="space-y-2 text-sm text-red-300">
                  {criticalAlerts.map((alert, index) => (
                    <p key={`${alert.bed}-${alert.name}-${alert.labs}-${index}`}>
                      Cama {alert.bed} · {alert.name} · {alert.labs}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin alertas críticas al momento.</p>
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-[#071A2F] p-4">
              <h4 className="mb-3 font-semibold text-cyan-300">📋 Pendientes del servicio</h4>

              <div className="space-y-2 text-sm text-slate-300">
                <p>• {noLabsCount} paciente(s) sin laboratorios capturados</p>
                <p>• {criticalPendingCount} paciente(s) en estado crítico</p>
                <p>• {noNoteTodayCount} paciente(s) sin evolución registrada hoy</p>
                <p>• {pendingRoundsCount} paciente(s) pendientes de pase</p>
                <p>• Revisar plan del día y pendientes clínicos</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h3 className="mb-4 text-xl font-bold">Lista de pacientes</h3>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-7 bg-white/10 px-4 py-3 text-sm text-slate-300">
                <span>Cama</span>
                <span>Paciente</span>
                <span>Edad / Sexo</span>
                <span>Diagnóstico</span>
                <span>Prioridad</span>
                <span>Labs</span>
                <span>Pase</span>
              </div>

              {list.map((patient) => (
                <a
                  href={`/patients/${patient.id}`}
                  key={patient.id}
                  className={`grid grid-cols-7 ${patientRowClass(latestLabsByPatient.get(patient.id))}`}
                >
                  <span className="font-semibold">{patient.bed}</span>
                  <span>{patient.full_name}</span>
                  <span className="text-slate-300">
                    {patient.age} · {patient.sex}
                  </span>
                  <span className="text-slate-300">{patient.diagnosis}</span>
                  <span>{visualPriority(latestLabsByPatient.get(patient.id), patient.priority)}</span>
                  <span className={labAlertClass(latestLabsByPatient.get(patient.id))}>
                    {formatLabs(latestLabsByPatient.get(patient.id))}
                  </span>
                  <span>
                    {patientsWithRoundCompletedToday.has(patient.id) ? (
                      <span className="rounded-full bg-green-400/15 px-3 py-1 text-xs font-semibold text-green-300">
                        ✓ Completado
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                        Pendiente
                      </span>
                    )}
                  </span>
                </a>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}