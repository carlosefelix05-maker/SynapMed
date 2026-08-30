import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CURRENT_TEAM_ID } from "@/lib/team";
import LogoutButton from "@/app/components/LogoutButton";
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
  attending_id: string | null;
  assigned_resident_id: string | null;
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

type Attending = {
  id: string;
  full_name: string;
  specialty: string | null;
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ subspecialty?: string; view?: string; attending?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentMembership } = user
    ? await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", CURRENT_TEAM_ID)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: currentProfile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const currentUserName =
    currentProfile?.full_name || currentProfile?.email || user?.email || "Usuario";

  const currentUserRole = currentMembership?.role || currentProfile?.role || "medico";

  const displayUserName =
  currentUserName.startsWith("Dr.") || currentUserName.startsWith("Dra.")
    ? currentUserName
    : `Dr. ${currentUserName}`;

  const isAdmin = currentMembership?.role === "admin";
  const selectedSubspecialty = params?.subspecialty && params.subspecialty !== "Todas" ? params.subspecialty : "Todas";
  const selectedAttending = params?.attending && params.attending !== "Todos" ? params.attending : "Todos";
  const selectedView = params?.view === "mine" ? "mine" : "all";

const queryParts = [
  selectedSubspecialty !== "Todas"
    ? `subspecialty=${encodeURIComponent(selectedSubspecialty)}`
    : null,
  selectedAttending !== "Todos"
    ? `attending=${encodeURIComponent(selectedAttending)}`
    : null,
  selectedView === "mine" ? "view=mine" : null,
].filter(Boolean);

const subspecialtyQuery = queryParts.length ? `?${queryParts.join("&")}` : "";

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("bed", { ascending: true });

  const { data: attendings } = await supabase
    .from("attendings")
    .select("id, full_name, specialty")
    .eq("team_id", CURRENT_TEAM_ID);

  const { data: labs } = await supabase
    .from("labs")
    .select("*")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("sampled_at", { ascending: false });

  const { data: notes } = await supabase
    .from("notes")
    .select("patient_id, created_at")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  const { data: roundLogs } = await supabase
    .from("round_logs")
    .select("patient_id, completed_at")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("completed_at", { ascending: false });

  const { data: patientTasks } = await supabase
    .from("patient_tasks")
    .select("id, patient_id, title, category, status, task_scope, created_at, completed_at")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#071A2F] p-10 text-white">
        <h1 className="text-3xl font-bold">SynapMed</h1>
        <p className="mt-4 text-red-300">Error cargando pacientes.</p>
      </main>
    );
  }

  const allPatients = (patients ?? []) as Patient[];

const list =
  selectedView === "mine" && user
    ? allPatients.filter((patient) => patient.assigned_resident_id === user.id)
    : allPatients;

  const assignedUserIds = Array.from(
    new Set(list.map((patient) => patient.assigned_resident_id).filter(Boolean))
  ) as string[];

  const { data: assignedProfiles } = assignedUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", assignedUserIds)
    : { data: [] };

  const assignedProfileMap = new Map(
    ((assignedProfiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      role: string | null;
    }>).map((profile) => [profile.id, profile])
  );

  const attendingMap = new Map(
    ((attendings ?? []) as Attending[]).map((attending) => [attending.id, attending])
  );

  function assignedName(userId?: string | null) {
    if (!userId) return "Sin asignar";

    const profile = assignedProfileMap.get(userId);
    return profile?.full_name || profile?.email || "Sin asignar";
  }

  function attendingName(attendingId?: string | null) {
    if (!attendingId) return "Sin asignar";

    const attending = attendingMap.get(attendingId);
    return attending?.full_name || "Sin asignar";
  }
  const labsList = (labs ?? []) as Lab[];
  const notesList = (notes ?? []) as { patient_id: string; created_at: string }[];
  const roundLogsList = (roundLogs ?? []) as { patient_id: string; completed_at: string }[];
  const patientTasksList = (patientTasks ?? []) as {
    id: string;
    patient_id: string;
    title: string;
    category: string | null;
    status: string;
    task_scope: string | null;
    created_at: string;
    completed_at: string | null;
  }[];
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

  const currentPassSummaries = patientSummaries.filter((item) => {
    const matchesSubspecialty =
      selectedSubspecialty === "Todas" ||
      (item.patient.subspecialty || "Medicina Interna") === selectedSubspecialty;

    const matchesAttending =
      selectedAttending === "Todos" || item.patient.attending_id === selectedAttending;

    return matchesSubspecialty && matchesAttending;
  });

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

  const visiblePendingPatientSummaries = pendingPatientSummaries.filter((item) => {
    const matchesSubspecialty =
      selectedSubspecialty === "Todas" ||
      (item.patient.subspecialty || "Medicina Interna") === selectedSubspecialty;

    const matchesAttending =
      selectedAttending === "Todos" || item.patient.attending_id === selectedAttending;

    return matchesSubspecialty && matchesAttending;
  });

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

  const pendingTasksByPatient = patientTasksList
    .filter((task) => task.status !== "Realizado" && (task.task_scope || "Guardia") === "Guardia")
    .map((task) => {
      const patient = list.find((item) => item.id === task.patient_id);

      if (!patient) return null;

      return {
        ...task,
        patient,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      patient_id: string;
      title: string;
      category: string | null;
      status: string;
      task_scope: string | null;
      created_at: string;
      completed_at: string | null;
      patient: Patient;
    }>;

  const visiblePendingTasks = pendingTasksByPatient.filter((task) => {
    const matchesSubspecialty =
      selectedSubspecialty === "Todas" ||
      (task.patient.subspecialty || "Medicina Interna") === selectedSubspecialty;

    const matchesAttending =
      selectedAttending === "Todos" || task.patient.attending_id === selectedAttending;

    return matchesSubspecialty && matchesAttending;
  });

  const pendingTasksGrouped = visiblePendingTasks.reduce(
    (groups, task) => {
      const key = task.patient.id;

      if (!groups[key]) {
        groups[key] = {
          patient: task.patient,
          tasks: [],
        };
      }

      groups[key].tasks.push(task);
      return groups;
    },
    {} as Record<string, { patient: Patient; tasks: typeof visiblePendingTasks }>
  );

  const pendingTaskGroups = Object.values(pendingTasksGrouped).sort((a, b) => {
    const bedA = Number(a.patient.bed);
    const bedB = Number(b.patient.bed);

    if (!Number.isNaN(bedA) && !Number.isNaN(bedB)) return bedA - bedB;

    return String(a.patient.bed || "").localeCompare(String(b.patient.bed || ""));
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

    const supabase = await createClient();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    await supabase
      .from("round_logs")
      .delete()
      .eq("team_id", CURRENT_TEAM_ID)
      .gte("completed_at", todayStart.toISOString())
      .lt("completed_at", tomorrowStart.toISOString());

    revalidatePath("/");
  }

  return (
    <main className="min-h-screen bg-[#071A2F] text-white">
      <div className="flex min-h-screen">
<aside className="hidden w-72 flex-col border-r border-white/10 bg-[#061527] p-6 lg:flex">
          <h1 className="text-2xl font-bold">SynapMed</h1>
          <p className="mb-8 text-xs text-cyan-300">
            Conectando la inteligencia médica
          </p>

          {[
  { label: "Synapse", href: "/" },
  { label: "Census", href: "/" },
  { label: "Mis pacientes", href: "/?view=mine" },
  { label: "Rounds", href: "/" },
  { label: "Patients", href: "/patients/new" },
  { label: "Notes", href: "/" },
  { label: "Calc", href: "/calc" },
  { label: "Drugs", href: "/" },
  { label: "Protocols", href: "/" },
].map((item) => (
  <Link
    key={item.label}
    href={item.href}
    className={`mb-2 w-full rounded-xl px-4 py-3 text-left text-sm ${
      (item.label === "Census" && selectedView === "all") ||
      (item.label === "Mis pacientes" && selectedView === "mine")
        ? "bg-cyan-400 font-semibold text-slate-950"
        : "text-slate-300 hover:bg-white/10"
    }`}
  >
    {item.label}
  </Link>
))}

          
          <div className="mt-auto pt-8">
  <LogoutButton />
</div>
        </aside>

        <section className="flex-1 p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-slate-400">Buenos días,</p>
              <h2 className="text-3xl font-bold">{displayUserName}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <Link
                  href="/configuracion/equipo"
                  className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20"
                >
                  Configuración del equipo
                </Link>
              )}

              <div className="rounded-full bg-white/10 p-1">
                <button className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950">
                  Hospital
                </button>
                <button className="px-5 py-2 text-sm text-slate-300">
                  Consulta
                </button>
              </div>
            </div>
          </header>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">📊 Census</h3>
                <p className="text-sm text-slate-400">
                  {selectedView === "mine" ? "Pacientes asignados a tu usuario" : "Vista global administrativa del servicio"}
                </p>
              </div>

              <Link
                href="/patients/new"
                className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                + Nuevo paciente
              </Link>
              <Link
                href={selectedView === "mine" ? "/" : "/?view=mine"}
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/20"
              >
                {selectedView === "mine" ? "Ver todo el censo" : "Mis pacientes"}
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
                  href={`/?subspecialty=${encodeURIComponent(item.subspecialty)}${selectedView === "mine" ? "&view=mine" : ""}`}
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

            <div className="mt-6 rounded-2xl bg-[#071A2F] p-5">
              <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-xl font-bold text-cyan-300">
                    📌 Pendientes globales de la guardia
                  </h4>
                  <p className="text-sm text-slate-400">
                    Pendientes no realizados {selectedSubspecialty === "Todas" ? "de todo el servicio" : `de ${selectedSubspecialty}`}
                  </p>
                </div>

                <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {visiblePendingTasks.length} pendiente(s)
                </span>
              </div>

              {pendingTaskGroups.length > 0 ? (
                <div className="space-y-4">
                  {pendingTaskGroups.map((group) => (
                    <div
                      key={group.patient.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            Cama {group.patient.bed} · {group.patient.full_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {group.patient.subspecialty || "Medicina Interna"}
                          </p>
                        </div>

                        <Link
                          href={`/patients/${group.patient.id}${subspecialtyQuery}`}
                          className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
                        >
                          Abrir expediente
                        </Link>
                      </div>

                      <div className="space-y-2">
                        {group.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex flex-col gap-2 rounded-xl bg-[#061527] p-3 text-sm md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-slate-200">{task.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {task.category || "General"} · {task.task_scope || "Guardia"} · {new Date(task.created_at).toLocaleString("es-MX")}
                              </p>
                            </div>

                            <span className="w-fit rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-300">
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Sin pendientes globales por realizar.
                </p>
              )}
            </div>
          </section>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">🏥 Rounds</h3>
                <p className="text-slate-300">
                  {selectedSubspecialty === "Todas" ? "Medicina Interna" : selectedSubspecialty} · {selectedAttending === "Todos" ? "Todos los adscritos" : attendingName(selectedAttending)}
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

              <select
                name="attending"
                defaultValue={selectedAttending}
                className="rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="Todos">Todos los adscritos</option>
                {((attendings ?? []) as Attending[]).map((attending) => (
                  <option key={attending.id} value={attending.id}>
                    {attending.full_name} · {attending.specialty || "Medicina Interna"}
                  </option>
                ))}
              </select>

              {selectedView === "mine" ? <input type="hidden" name="view" value="mine" /> : null}

              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Seleccionar pase
              </button>

              {selectedSubspecialty !== "Todas" || selectedAttending !== "Todos" ? (
                <Link
                  href={selectedView === "mine" ? "/?view=mine" : "/"}
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
              <div className="grid grid-cols-8 bg-white/10 px-4 py-3 text-sm text-slate-300">
                <span>Cama</span>
                <span>Paciente</span>
                <span>Edad / Sexo</span>
                <span>Diagnóstico</span>
                <span>Responsables</span>
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
                        className={`grid grid-cols-8 ${patientRowClass(latestLabsByPatient.get(patient.id))}`}
                      >
                        <span className="font-semibold">{patient.bed}</span>
                        <span>{patient.full_name}</span>
                        <span className="text-slate-300">
                          {patient.age} · {patient.sex}
                        </span>
                        <span className="text-slate-300">{patient.diagnosis}</span>
                        <span className="text-xs leading-5 text-slate-300">
                          <span className="block">
                            Ads: <span className="text-slate-100">{attendingName(patient.attending_id)}</span>
                          </span>
                          <span className="block">
                            R: <span className="text-slate-100">{assignedName(patient.assigned_resident_id)}</span>
                          </span>
                        </span>
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