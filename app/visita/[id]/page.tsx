import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { roundsToday, formatRoundsDate } from "@/lib/date";
import { formatLabsText, formatGasesText } from "@/lib/labs-fields";
import { censusAlerts, derivedVentilation } from "@/lib/clinical";
import { ORDER_CATEGORIES, type MedicalOrder } from "@/lib/orders";
import ClinicalResults from "@/app/components/ClinicalResults";
import CopyButton from "@/app/components/CopyButton";

type Patient = {
  id: string;
  full_name: string;
  bed: string | null;
  age: number | null;
  sex: string | null;
  diagnosis: string | null;
  subspecialty: string | null;
  priority: string | null;
  on_vmi: boolean | null;
  height_cm: number | null;
};

function bedOrder(a: Patient, b: Patient) {
  const bedA = Number(a.bed);
  const bedB = Number(b.bed);

  if (!Number.isNaN(bedA) && !Number.isNaN(bedB)) return bedA - bedB;

  return String(a.bed || "").localeCompare(String(b.bed || ""));
}

export default async function VisitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ subspecialty?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const selectedSubspecialty = query?.subspecialty || "Todas";
  const subspecialtyQuery =
    selectedSubspecialty !== "Todas"
      ? `?subspecialty=${encodeURIComponent(selectedSubspecialty)}`
      : "";

  const supabase = await createClient();

  const { data: allPatients } = await supabase
    .from("patients")
    .select("*")
    .eq("team_id", CURRENT_TEAM_ID);

  const roster = ((allPatients ?? []) as Patient[])
    .filter(
      (item) =>
        selectedSubspecialty === "Todas" ||
        (item.subspecialty || "Medicina Interna") === selectedSubspecialty
    )
    .sort(bedOrder);

  const patient = roster.find((item) => item.id === id) ?? null;

  // Quién ya se pasó hoy, para saber a quién sigue.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: roundLogs } = await supabase
    .from("round_logs")
    .select("patient_id, completed_at")
    .eq("team_id", CURRENT_TEAM_ID)
    .gte("completed_at", startOfDay.toISOString());

  const completed = new Set((roundLogs ?? []).map((log) => log.patient_id));

  const position = roster.findIndex((item) => item.id === id);

  // El siguiente pendiente después de éste; si ya no hay, el primero pendiente.
  const nextPatient =
    roster.slice(position + 1).find((item) => !completed.has(item.id)) ??
    roster.find((item) => item.id !== id && !completed.has(item.id)) ??
    null;

  const previousPatient = position > 0 ? roster[position - 1] : null;

  const [
    { data: presentation },
    { data: vitals },
    { data: labs },
    { data: orders },
    { data: tasks },
    { data: ventilation },
  ] = await Promise.all([
    supabase
      .from("presentations")
      .select("content, presented_on")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("presented_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("patient_vitals")
      .select("*")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("labs")
      .select("*")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("sampled_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("medical_orders")
      .select("*")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .eq("suspended", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("patient_tasks")
      .select("id, title, status")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .neq("status", "Completado"),
    supabase
      .from("ventilation")
      .select("*")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  async function completeAndAdvance(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const goTo = String(formData.get("nextPatientId") ?? "").trim();

    await supabase.from("round_logs").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
    });

    revalidatePath("/");
    revalidatePath(`/patients/${id}`);

    redirect(goTo ? `/visita/${goTo}${subspecialtyQuery}` : `/${subspecialtyQuery}`);
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#061325] p-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm text-cyan-300">
            ← Volver al censo
          </Link>
          <p className="mt-8 text-red-300">Paciente no encontrado en este pase.</p>
        </div>
      </main>
    );
  }

  const alerts = censusAlerts(labs, { age: patient.age, sex: patient.sex });

  const ventilationResults =
    patient.on_vmi && ventilation
      ? derivedVentilation({
          sex: patient.sex,
          heightCm: patient.height_cm,
          vt: ventilation.vt,
          fr: ventilation.fr,
          peep: ventilation.peep,
          fio2: ventilation.fio2,
          pplat: ventilation.pplat,
          ppico: ventilation.ppico,
          pao2: ventilation.pao2,
        })
      : [];

  const labsLine = formatLabsText(labs);
  const gasesLine = formatGasesText(labs);
  const activeOrders = (orders ?? []) as MedicalOrder[];

  const vitalSigns = vitals
    ? ([
        ["TA", vitals.ta],
        ["FC", vitals.fc],
        ["FR", vitals.fr],
        ["Temp", vitals.temp],
        ["SatO₂", vitals.spo2],
        ["Glucemia", vitals.glucemia],
        ["Diuresis", vitals.diuresis],
        ["Peso", vitals.peso],
      ] as [string, string | null][]).filter(([, value]) => value)
    : [];

  const done = completed.size;

  return (
    <main className="min-h-screen bg-[#061325] pb-32 text-white">
      <div className="mx-auto max-w-4xl p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href={`/${subspecialtyQuery}`} className="text-cyan-300">
            ← Salir del pase
          </Link>

          <span className="text-slate-400">
            Cama {position + 1} de {roster.length} · {done} completado
            {done === 1 ? "" : "s"} hoy
          </span>
        </div>

        <header className="rounded-3xl bg-white/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Cama {patient.bed}
              </p>
              <h1 className="mt-1 text-4xl font-bold leading-tight">
                {patient.full_name}
              </h1>
              <p className="mt-2 text-lg text-slate-300">
                {patient.age} años · {patient.sex} ·{" "}
                {patient.subspecialty || "Medicina Interna"}
              </p>
              <p className="mt-2 text-xl leading-8 text-slate-200">
                {patient.diagnosis || "Sin diagnóstico registrado"}
              </p>
            </div>

            {completed.has(patient.id) ? (
              <span className="rounded-full bg-green-400/15 px-4 py-2 text-sm font-semibold text-green-300">
                ✓ Ya pasado hoy
              </span>
            ) : null}
          </div>

          {alerts.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {alerts.map((alert) => (
                <span
                  key={alert.label}
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    alert.severity === "alta"
                      ? "bg-red-400/20 text-red-200"
                      : "bg-amber-400/20 text-amber-200"
                  }`}
                >
                  {alert.label}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <section className="mt-5 rounded-3xl bg-white/10 p-6">
          <h2 className="mb-3 text-lg font-bold text-cyan-300">Presentación</h2>

          {presentation?.content ? (
            <>
              <p className="whitespace-pre-wrap text-lg leading-8 text-slate-100">
                {presentation.content}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Del pase del {formatRoundsDate(presentation.presented_on)}
                {presentation.presented_on === roundsToday() ? "" : " · no es de hoy"}
              </p>
            </>
          ) : (
            <Link
              href={`/patients/${id}/presentations/new`}
              className="text-slate-400 underline"
            >
              Sin presentación. Escribirla.
            </Link>
          )}
        </section>

        <section className="mt-5 rounded-3xl bg-white/10 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cyan-300">Signos vitales</h2>
            <Link
              href={`/patients/${id}/vitals/new`}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200"
            >
              Capturar
            </Link>
          </div>

          {vitalSigns.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {vitalSigns.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#071A2F] p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">Sin signos vitales de hoy.</p>
          )}
        </section>

        <section className="mt-5 rounded-3xl bg-white/10 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cyan-300">Laboratorios</h2>

            <div className="flex gap-2">
              {labsLine ? (
                <CopyButton
                  text={[labsLine, gasesLine].filter(Boolean).join("\n\n")}
                  label="Copiar"
                  className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200"
                />
              ) : null}

              <Link
                href={`/patients/${id}/labs`}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200"
              >
                Comparativo
              </Link>
            </div>
          </div>

          {labsLine ? (
            <>
              <p className="text-base leading-7 text-slate-200">{labsLine}</p>
              {gasesLine ? (
                <p className="mt-2 text-base leading-7 text-slate-200">{gasesLine}</p>
              ) : null}
            </>
          ) : (
            <p className="text-slate-400">Sin laboratorios capturados.</p>
          )}
        </section>

        {patient.on_vmi ? (
          <section className="mt-5 rounded-3xl bg-white/10 p-6">
            <h2 className="mb-3 text-lg font-bold text-cyan-300">
              Ventilación mecánica
            </h2>

            {ventilation ? (
              <>
                <p className="mb-3 text-base text-slate-200">
                  {[
                    ventilation.modo,
                    ventilation.vt ? `VT ${ventilation.vt}` : null,
                    ventilation.fr ? `FR ${ventilation.fr}` : null,
                    ventilation.peep ? `PEEP ${ventilation.peep}` : null,
                    ventilation.fio2 ? `FiO₂ ${ventilation.fio2}` : null,
                    ventilation.pplat ? `Pplat ${ventilation.pplat}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <ClinicalResults results={ventilationResults} />
              </>
            ) : (
              <Link
                href={`/patients/${id}/ventilation/new`}
                className="text-slate-400 underline"
              >
                Sin parámetros capturados. Capturarlos.
              </Link>
            )}
          </section>
        ) : null}

        <section className="mt-5 rounded-3xl bg-white/10 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cyan-300">Indicaciones</h2>
            <Link
              href={`/patients/${id}`}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200"
            >
              Modificar
            </Link>
          </div>

          {activeOrders.length > 0 ? (
            <div className="space-y-3">
              {ORDER_CATEGORIES.map((category) => {
                const items = activeOrders.filter(
                  (order) => order.category === category.key
                );

                if (!items.length) return null;

                return (
                  <div key={category.key}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {category.label}
                    </p>
                    <ul className="mt-1 space-y-1 text-base text-slate-200">
                      {items.map((order) => (
                        <li key={order.id}>
                          {[order.description, order.dose, order.route, order.frequency]
                            .filter(Boolean)
                            .join(" ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400">Sin indicaciones registradas.</p>
          )}
        </section>

        {(tasks ?? []).length > 0 ? (
          <section className="mt-5 rounded-3xl border border-amber-300/20 bg-amber-400/5 p-6">
            <h2 className="mb-3 text-lg font-bold text-amber-200">Pendientes</h2>
            <ul className="space-y-1 text-base text-amber-100">
              {(tasks ?? []).map((task) => (
                <li key={task.id}>• {task.title}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/patients/${id}`}
            className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-slate-200"
          >
            Abrir expediente completo
          </Link>

          {previousPatient ? (
            <Link
              href={`/visita/${previousPatient.id}${subspecialtyQuery}`}
              className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-slate-200"
            >
              ← Cama {previousPatient.bed}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Barra fija: en la tablet es lo único que se toca durante el pase. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#071A2F]/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <form action={completeAndAdvance} className="flex-1">
            <input
              type="hidden"
              name="nextPatientId"
              value={nextPatient?.id || ""}
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-green-400 px-6 py-4 text-lg font-bold text-slate-950 hover:bg-green-300"
            >
              ✓ Pase completado
              {nextPatient ? ` · sigue cama ${nextPatient.bed}` : " · terminar"}
            </button>
          </form>

          {nextPatient ? (
            <Link
              href={`/visita/${nextPatient.id}${subspecialtyQuery}`}
              className="rounded-2xl bg-white/10 px-6 py-4 text-lg font-semibold text-slate-200 hover:bg-white/20"
            >
              Saltar →
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
