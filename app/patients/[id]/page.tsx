import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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

  const { data: latestLabs } = await supabase
    .from("labs")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: allPatients } = await supabase
    .from("patients")
    .select("id, full_name, bed")
    .order("bed", { ascending: true });

  async function createNote(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) {
      return;
    }

    await supabase.from("notes").insert({
      patient_id: id,
      type: "progress",
      title,
      content,
    });

    revalidatePath(`/patients/${id}`);
  }

  async function createLabs(formData: FormData) {
    "use server";

    await supabase.from("labs").insert({
      patient_id: id,
      glu: String(formData.get("glu") ?? "").trim(),
      cr: String(formData.get("cr") ?? "").trim(),
      na: String(formData.get("na") ?? "").trim(),
      k: String(formData.get("k") ?? "").trim(),
      hb: String(formData.get("hb") ?? "").trim(),
      leu: String(formData.get("leu") ?? "").trim(),
      pct: String(formData.get("pct") ?? "").trim(),
      bnp: String(formData.get("bnp") ?? "").trim(),
      pcr: String(formData.get("pcr") ?? "").trim(),
      otros: String(formData.get("otros") ?? "").trim(),
    });

    revalidatePath(`/patients/${id}`);
  }

  async function completeRound() {
    "use server";

    await supabase.from("round_logs").insert({
      patient_id: id,
    });

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#061325] p-10 text-white">
        <h1>Paciente no encontrado</h1>
      </main>
    );
  }

  const today = new Date().toLocaleDateString("es-MX");

  const labsResumen = [
    latestLabs?.glu ? `Glu ${latestLabs.glu}` : null,
    latestLabs?.cr ? `Cr ${latestLabs.cr}` : null,
    latestLabs?.na ? `Na ${latestLabs.na}` : null,
    latestLabs?.k ? `K ${latestLabs.k}` : null,
    latestLabs?.hb ? `Hb ${latestLabs.hb}` : null,
    latestLabs?.leu ? `Leu ${latestLabs.leu}` : null,
    latestLabs?.pct ? `PCT ${latestLabs.pct}` : null,
    latestLabs?.bnp ? `BNP ${latestLabs.bnp}` : null,
    latestLabs?.pcr ? `PCR ${latestLabs.pcr}` : null,
    latestLabs?.otros ? `Otros: ${latestLabs.otros}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const synapsePriority =
    latestLabs?.cr && Number(latestLabs.cr) >= 2
      ? "Alerta renal por creatinina elevada."
      : latestLabs?.hb && Number(latestLabs.hb) <= 8
        ? "Alerta hematológica por anemia severa."
        : latestLabs?.pct && Number(latestLabs.pct) >= 2
          ? "Alerta infecciosa por procalcitonina elevada."
          : latestLabs?.leu && Number(latestLabs.leu) >= 15
            ? "Alerta inflamatoria/infecciosa por leucocitosis."
            : "Sin criterios automáticos de alarma crítica por laboratorios.";

  const synapseSummary = `${patient.sex || "Paciente"} de ${
    patient.age || "edad no registrada"
  } años, cama ${patient.bed || "sin cama"}, con diagnóstico principal: ${
    patient.diagnosis || "no registrado"
  }. ${synapsePriority} Últimos laboratorios: ${
    labsResumen || "pendientes de captura"
  }.`;

  const synapseProblems = (patient.diagnosis ?? "")
    .split("/")
    .map((problem: string) => problem.trim())
    .filter(Boolean);

  const synapseAlerts = [
    latestLabs?.cr && Number(latestLabs.cr) >= 2
      ? `Cr ${latestLabs.cr}: alerta renal`
      : null,
    latestLabs?.hb && Number(latestLabs.hb) <= 8
      ? `Hb ${latestLabs.hb}: anemia severa`
      : null,
    latestLabs?.k && Number(latestLabs.k) >= 5.5
      ? `K ${latestLabs.k}: hiperkalemia`
      : null,
    latestLabs?.na && Number(latestLabs.na) <= 130
      ? `Na ${latestLabs.na}: hiponatremia`
      : null,
    latestLabs?.leu && Number(latestLabs.leu) >= 15
      ? `Leu ${latestLabs.leu}: leucocitosis significativa`
      : null,
    latestLabs?.pct && Number(latestLabs.pct) >= 2
      ? `PCT ${latestLabs.pct}: probable proceso infeccioso significativo`
      : null,
    latestLabs?.bnp && Number(latestLabs.bnp) >= 500
      ? `BNP ${latestLabs.bnp}: sobrecarga/estrés cardiaco probable`
      : null,
  ].filter(Boolean) as string[];

  const synapsePendings = [
    !latestLabs ? "Capturar laboratorios actuales" : null,
    latestLabs?.cr && Number(latestLabs.cr) >= 2
      ? "Vigilar función renal, balance hídrico y nefrotóxicos"
      : null,
    latestLabs?.hb && Number(latestLabs.hb) <= 8
      ? "Revalorar anemia, sangrado activo y necesidad transfusional"
      : null,
    latestLabs?.k && Number(latestLabs.k) >= 5.5
      ? "Revisar manejo de potasio y electrocardiograma"
      : null,
    latestLabs?.pct && Number(latestLabs.pct) >= 2
      ? "Revalorar foco infeccioso, cultivos y antibiótico"
      : null,
    "Actualizar evolución y plan del día",
  ].filter(Boolean) as string[];

  const plantillaMI = `AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE, ORIENTADO Y RESPONDIENDO ADECUADAMENTE AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO: CONSCIENTE, ORIENTADO, SIN DATOS DE FOCALIZACIÓN NEUROLÓGICA.
CARDIOVASCULAR: RUIDOS CARDIACOS RÍTMICOS, DE BUEN TONO E INTENSIDAD.
RESPIRATORIO: ADECUADA EXPANSIÓN TORÁCICA, MURMULLO VESICULAR PRESENTE.
ABDOMEN: BLANDO, DEPRESIBLE, NO DOLOROSO.
EXTREMIDADES: SIN EDEMA, LLENADO CAPILAR CONSERVADO.

PARACLÍNICOS:
${labsResumen || "Pendientes de captura."}

ANÁLISIS:

PLAN:`;

  const plantillaIngreso = `FICHA DE IDENTIFICACIÓN:
NOMBRE:
EDAD:
SEXO:
CAMA:

PADECIMIENTO ACTUAL:

ANTECEDENTES HEREDOFAMILIARES:

ANTECEDENTES PERSONALES NO PATOLÓGICOS:

ANTECEDENTES PERSONALES PATOLÓGICOS:

EXPLORACIÓN FÍSICA:
NEUROLÓGICO:
CARDIOVASCULAR:
RESPIRATORIO:
ABDOMEN:
EXTREMIDADES:

PARACLÍNICOS:

ANÁLISIS:

PLAN:`;

  const patientList = allPatients ?? [];
  const currentPatientIndex = patientList.findIndex((item) => item.id === id);
  const previousPatient = currentPatientIndex > 0 ? patientList[currentPatientIndex - 1] : null;
  const nextPatient =
    currentPatientIndex >= 0 && currentPatientIndex < patientList.length - 1
      ? patientList[currentPatientIndex + 1]
      : null;

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="text-sm text-cyan-300">
            ← Volver a Rounds
          </Link>

          <div className="flex flex-wrap gap-3">
            {previousPatient ? (
              <Link
                href={`/patients/${previousPatient.id}`}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/20"
              >
                ← Cama {previousPatient.bed}
              </Link>
            ) : (
              <span className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-500">
                ← Sin anterior
              </span>
            )}

            {nextPatient ? (
              <Link
                href={`/patients/${nextPatient.id}`}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Cama {nextPatient.bed} →
              </Link>
            ) : (
              <span className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-500">
                Sin siguiente →
              </span>
            )}
            <form action={completeRound}>
              <button
                type="submit"
                className="rounded-xl bg-green-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-green-300"
              >
                ✓ Pase completado
              </button>
            </form>
          </div>
        </div>

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

        <section className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300">🧠 Synapse</h2>
              <p className="text-sm text-slate-400">
                Integración clínica automática
              </p>
            </div>

            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              v2 clínica
            </span>
          </div>

          <p className="mb-5 leading-7 text-slate-200">{synapseSummary}</p>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-[#071A2F] p-4">
              <h3 className="mb-3 font-semibold text-cyan-300">Problemas activos</h3>

              {synapseProblems.length > 0 ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  {synapseProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-400">Sin problemas registrados.</p>
              )}
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <h3 className="mb-3 font-semibold text-red-300">Alertas</h3>

              {synapseAlerts.length > 0 ? (
                <ul className="space-y-2 text-sm text-red-300">
                  {synapseAlerts.map((alert) => (
                    <li key={alert}>• {alert}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">Sin alertas críticas automáticas.</p>
              )}
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <h3 className="mb-3 font-semibold text-amber-300">Pendientes sugeridos</h3>

              <ul className="space-y-2 text-sm text-slate-300">
                {synapsePendings.map((pending) => (
                  <li key={pending}>• {pending}</li>
                ))}
              </ul>
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

            <div className="mb-5 grid grid-cols-2 gap-2 text-slate-300 md:grid-cols-3">
              <div className="rounded-xl bg-[#071A2F] p-3">Glu: {latestLabs?.glu || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">Cr: {latestLabs?.cr || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">Na: {latestLabs?.na || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">K: {latestLabs?.k || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">Hb: {latestLabs?.hb || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">Leu: {latestLabs?.leu || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">PCT: {latestLabs?.pct || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">BNP: {latestLabs?.bnp || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">PCR: {latestLabs?.pcr || "Pendiente"}</div>
              <div className="rounded-xl bg-[#071A2F] p-3 md:col-span-3">Otros: {latestLabs?.otros || "Pendiente"}</div>
            </div>

            <form action={createLabs} className="rounded-2xl bg-[#071A2F] p-4">
              <p className="mb-3 font-semibold text-cyan-300">Capturar laboratorios</p>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <input name="glu" placeholder="Glu" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="cr" placeholder="Cr" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="na" placeholder="Na" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="k" placeholder="K" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="hb" placeholder="Hb" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="leu" placeholder="Leu" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="pct" placeholder="PCT" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="bnp" placeholder="BNP" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <input name="pcr" placeholder="PCR" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500" />
                <textarea name="otros" placeholder="Otros parámetros: TROP 125, DD 3200, INR 1.3..." rows={3} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500 md:col-span-3" />
              </div>

              <button type="submit" className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950">
                Guardar laboratorios
              </button>
            </form>
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
          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-cyan-300">
                Notas clínicas
              </h2>

              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                + Nueva evolución
              </span>
            </div>

            <form action={createNote} className="mb-6 rounded-2xl bg-[#071A2F] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Título
                  </label>
                  <input
                    name="title"
                    defaultValue={`Evolución ${today}`}
                    placeholder="Evolución 06/06/2026"
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Tipo
                  </label>
                  <input
                    value="Progress Note"
                    readOnly
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-slate-400">
                  Contenido
                </label>
                <textarea
                  name="content"
                  rows={14}
                  defaultValue={plantillaMI}
                  placeholder="Paciente al pase de visita..."
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
              >
                Guardar evolución
              </button>
            </form>

            <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="mb-2 font-semibold text-cyan-300">Plantilla MI rápida</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
{`AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE, ORIENTADO Y RESPONDIENDO ADECUADAMENTE AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO: CONSCIENTE, ORIENTADO, SIN DATOS DE FOCALIZACIÓN NEUROLÓGICA.
CARDIOVASCULAR: RUIDOS CARDIACOS RÍTMICOS, DE BUEN TONO E INTENSIDAD.
RESPIRATORIO: ADECUADA EXPANSIÓN TORÁCICA, MURMULLO VESICULAR PRESENTE.
ABDOMEN: BLANDO, DEPRESIBLE, NO DOLOROSO.
EXTREMIDADES: SIN EDEMA, LLENADO CAPILAR CONSERVADO.

ANÁLISIS:

PLAN:`}
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="mb-2 font-semibold text-cyan-300">Plantilla de ingreso</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {plantillaIngreso}
              </p>
            </div>

            {notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-2xl bg-[#071A2F] p-4">
                    <p className="font-bold">{note.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-300">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Sin notas clínicas registradas.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}