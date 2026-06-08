import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { revalidatePath } from "next/cache";

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

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ subspecialty?: string }>;
}) {
  const params = await searchParams;
  const selectedSubspecialty = params?.subspecialty && params.subspecialty !== "Todas" ? params.subspecialty : "Todas";
  const subspecialtyQuery =
    selectedSubspecialty !== "Todas"
      ? `?subspecialty=${encodeURIComponent(selectedSubspecialty)}`
      : "";
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

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const patientsWithNoteToday = new Set<string>();

  for (const note of notesList) {
    const noteDate = note.created_at ? new Date(note.created_at) : null;

    if (noteDate && noteDate >= todayStart && noteDate < tomorrowStart) {
      patientsWithNoteToday.add(note.patient_id);
    }
  }

  const patientsWithRoundCompletedToday = new Set<string>();

  for (const log of roundLogsList) {
    const completedDate = log.completed_at ? new Date(log.completed_at) : null;

    if (completedDate && completedDate >= todayStart && completedDate < tomorrowStart) {
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

  const currentPassSummaries =
    selectedSubspecialty === "Todas"
      ? patientSummaries
      : patientSummaries.filter(
          (item) => (item.patient.subspecialty || "Medicina Interna") === selectedSubspecialty
        );

  const criticalCount = currentPassSummaries.filter((item) => item.priority === "Crítico").length;
  const highPriorityCount = currentPassSummaries.filter((item) => item.priority === "Alta").length;
  const stableCount = currentPassSummaries.filter((item) => item.priority === "Estable").length;
  const noLabsCount = currentPassSummaries.filter((item) => !item.lab).length;
  const criticalPendingCount = criticalCount;
  const noNoteTodayCount = currentPassSummaries.filter((item) => !patientsWithNoteToday.has(item.patient.id)).length;
  const completedRoundsCount = currentPassSummaries.filter((item) => patientsWithRoundCompletedToday.has(item.patient.id)).length;
  const pendingRoundsCount = currentPassSummaries.length - completedRoundsCount;

  const pendingPatientSummaries = patientSummaries.filter(
    (item) => !patientsWithRoundCompletedToday.has(item.patient.id)
  );

  const visiblePendingPatientSummaries =
    selectedSubspecialty === "Todas"
      ? pendingPatientSummaries
      : pendingPatientSummaries.filter(
          (item) => (item.patient.subspecialty || "Medicina Interna") === selectedSubspecialty
        );

  const patientsBySubspecialty = visiblePendingPatientSummaries.reduce(
    (groups, item) => {
      const key = item.patient.subspecialty || "Medicina Interna";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
      return groups;
    },
    {} as Record<string, typeof pendingPatientSummaries>
  );

  const subspecialtyOrder = Object.keys(patientsBySubspecialty).sort();

  const availableSubspecialties = Array.from(
    new Set(patientSummaries.map((item) => item.patient.subspecialty || "Medicina Interna"))
  ).sort();

  const censusBySubspecialty = availableSubspecialties.map((subspecialty) => {
    const summaries = patientSummaries.filter(
      (item) => (item.patient.subspecialty || "Medicina Interna") === subspecialty
    );

    return {
      subspecialty,
      total: summaries.length,
      critical: summaries.filter((item) => item.priority === "Crítico").length,
      high: summaries.filter((item) => item.priority === "Alta").length,
      stable: summaries.filter((item) => item.priority === "Estable").length,
      pending: summaries.filter((item) => !patientsWithRoundCompletedToday.has(item.patient.id)).length,
    };
  });

  const criticalAlertsMap = new Map<string, { bed: string | null; name: string; labs: string }>();

  for (const item of patientSummaries.filter((summary) => summary.priority === "Crítico")) {
    const alertKey = `${item.patient.bed}-${item.patient.full_name}`;
    const currentLabs = formatLabs(item.lab);
    const existingAlert = criticalAlertsMap.get(alertKey);

    if (!existingAlert || existingAlert.labs === "Sin labs") {
      criticalAlertsMap.set(alertKey, {
        bed: item.patient.bed,
        name: item.patient.full_name,
        labs: currentLabs,
      });
    }
  }

  const criticalAlerts = Array.from(criticalAlertsMap.values()).filter((alert) => {
    if (selectedSubspecialty === "Todas") return true;

    return currentPassSummaries.some(
      (item) => item.patient.bed === alert.bed && item.patient.full_name === alert.name
    );
  });

  const roundsSource = visiblePendingPatientSummaries;

  const nextPatientForRounds = roundsSource[0]?.patient.id;

  async function resetRounds() {
    "use server";

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    await supabase
      .from("round_logs")
      .delete()
      .gte("completed_at", todayStart.toISOString())
      .lt("completed_at", tomorrowStart.toISOString());

    revalidatePath("/");
  }

  return (
    <main className="min-h-screen bg-[#071A2F] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#061527] p-6 lg:block">
          <h1 className="text-2xl font-bold">SynapMed</h1>
          <p className="mb-8 text-xs text-cyan-300">
            Conectando la inteligencia médica
          </p>

          {["Synapse", "Census", "Rounds", "Patients", "Notes", "Calc", "Drugs", "Protocols"].map(
            (item) => (
              <button
                key={item}
                className={`mb-2 w-full rounded-xl px-4 py-3 text-left text-sm ${
                  item === "Census"
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
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">📊 Census</h3>
                <p className="text-sm text-slate-400">
                  Vista global administrativa del servicio
                </p>
              </div>

              <Link
                href="/patients/new"
                className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                + Nuevo paciente
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Total hospitalizados</p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">{patientSummaries.length}</p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Críticos</p>
                <p className="mt-2 text-3xl font-bold text-red-400">
                  {patientSummaries.filter((item) => item.priority === "Crítico").length}
                </p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Sin labs</p>
                <p className="mt-2 text-3xl font-bold text-amber-300">
                  {patientSummaries.filter((item) => !item.lab).length}
                </p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Pendientes de pase</p>
                <p className="mt-2 text-3xl font-bold text-green-300">
                  {patientSummaries.filter((item) => !patientsWithRoundCompletedToday.has(item.patient.id)).length}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {censusBySubspecialty.map((item) => (
                <Link
                  key={item.subspecialty}
                  href={`/?subspecialty=${encodeURIComponent(item.subspecialty)}`}
                  className="rounded-2xl border border-white/10 bg-[#071A2F] p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{item.subspecialty}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.total} paciente(s)</p>
                    </div>

                    <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                      Abrir pase
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-red-400/10 p-2 text-red-300">
                      <p className="font-bold">{item.critical}</p>
                      <p>Crít</p>
                    </div>
                    <div className="rounded-xl bg-amber-300/10 p-2 text-amber-300">
                      <p className="font-bold">{item.high}</p>
                      <p>Alta</p>
                    </div>
                    <div className="rounded-xl bg-green-300/10 p-2 text-green-300">
                      <p className="font-bold">{item.stable}</p>
                      <p>Est</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-2 text-slate-300">
                      <p className="font-bold">{item.pending}</p>
                      <p>Pend</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">🏥 Rounds</h3>
                <p className="text-slate-300">
                  {selectedSubspecialty === "Todas" ? "Medicina Interna" : selectedSubspecialty} · Pacientes desde Supabase
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={nextPatientForRounds ? `/patients/${nextPatientForRounds}${subspecialtyQuery}` : "#"}
                  className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
                >
                  Iniciar Pase
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4 text-sm text-slate-300">
              <span className="font-semibold text-cyan-300">⏳ {visiblePendingPatientSummaries.length}</span> pacientes pendientes de pase
              {selectedSubspecialty !== "Todas" ? ` en ${selectedSubspecialty}` : ""}
            </div>

            <form action="/" className="mt-4 flex flex-wrap items-center gap-3">
              <select
                name="subspecialty"
                defaultValue={selectedSubspecialty}
                className="rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="Todas">Todas las subespecialidades</option>
                {availableSubspecialties.map((subspecialty) => (
                  <option key={subspecialty} value={subspecialty}>
                    {subspecialty}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Seleccionar pase
              </button>

              {selectedSubspecialty !== "Todas" ? (
                <Link
                  href="/"
                  className="rounded-xl bg-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/20"
                >
                  Ver todas
                </Link>
              ) : null}
            </form>
          </section>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">☀️ Morning Report</h3>
                <p className="text-sm text-slate-400">
                  Resumen automático {selectedSubspecialty === "Todas" ? "del servicio" : `de ${selectedSubspecialty}`}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <p className="text-sm text-slate-400">
                  Sincronizado con últimos laboratorios
                </p>

                <form action={resetRounds}>
                  <button
                    type="submit"
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/20"
                  >
                    Reiniciar pase del día
                  </button>
                </form>
              </div>
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

              {visiblePendingPatientSummaries.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-5xl">🎉</div>
                  <h4 className="mt-4 text-2xl font-bold text-cyan-300">
                    Pase completado
                  </h4>
                  <p className="mt-2 text-slate-400">
                    Todos los pacientes fueron revisados hoy.
                  </p>
                </div>
              ) : (
                subspecialtyOrder.map((subspecialty) => (
                  <div key={subspecialty}>
                    <div className="border-t border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-cyan-300">
                      {subspecialty} · {patientsBySubspecialty[subspecialty].length} paciente(s)
                    </div>

                    {patientsBySubspecialty[subspecialty].map(({ patient }) => (
                      <a
                        href={`/patients/${patient.id}${subspecialtyQuery}`}
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
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}