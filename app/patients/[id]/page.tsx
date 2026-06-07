import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import NoteTemplateSelector from "@/app/components/NoteTemplateSelector";

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

  const { data: labHistory } = await supabase
    .from("labs")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

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

  async function createSynapseNote() {
    "use server";

    const { data: patientData } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    const { data: latestLabData } = await supabase
      .from("labs")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const labsText = latestLabData
      ? [
          latestLabData.glu ? `Glu ${latestLabData.glu}` : null,
          latestLabData.cr ? `Cr ${latestLabData.cr}` : null,
          latestLabData.na ? `Na ${latestLabData.na}` : null,
          latestLabData.k ? `K ${latestLabData.k}` : null,
          latestLabData.hb ? `Hb ${latestLabData.hb}` : null,
          latestLabData.leu ? `Leu ${latestLabData.leu}` : null,
          latestLabData.pct ? `PCT ${latestLabData.pct}` : null,
          latestLabData.bnp ? `BNP ${latestLabData.bnp}` : null,
          latestLabData.pcr ? `PCR ${latestLabData.pcr}` : null,
          latestLabData.otros ? `Otros: ${latestLabData.otros}` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "Pendientes de captura";

    const alerts = [
      latestLabData?.cr && Number(latestLabData.cr) >= 2
        ? `Cr ${latestLabData.cr}: lesión renal/azoados elevados a correlacionar`
        : null,
      latestLabData?.hb && Number(latestLabData.hb) <= 8
        ? `Hb ${latestLabData.hb}: anemia severa a correlacionar con sangrado o cronicidad`
        : null,
      latestLabData?.k && Number(latestLabData.k) >= 5.5
        ? `K ${latestLabData.k}: hiperkalemia, valorar EKG y manejo específico`
        : null,
      latestLabData?.na && Number(latestLabData.na) <= 130
        ? `Na ${latestLabData.na}: hiponatremia clínicamente relevante`
        : null,
      latestLabData?.leu && Number(latestLabData.leu) >= 15
        ? `Leu ${latestLabData.leu}: leucocitosis significativa, valorar foco infeccioso/inflamatorio`
        : null,
      latestLabData?.pct && Number(latestLabData.pct) >= 2
        ? `PCT ${latestLabData.pct}: marcador compatible con proceso infeccioso significativo`
        : null,
      latestLabData?.bnp && Number(latestLabData.bnp) >= 500
        ? `BNP ${latestLabData.bnp}: probable sobrecarga o estrés miocárdico a correlacionar`
        : null,
    ].filter(Boolean);

    const problems = String(patientData?.diagnosis ?? "")
      .split("/")
      .map((problem) => problem.trim())
      .filter(Boolean);

    const generatedContent = `ANÁLISIS SYNAPSE AI v2:
Paciente ${patientData?.sex || ""} de ${patientData?.age || "edad no registrada"} años, en cama ${patientData?.bed || "sin cama"}, con diagnóstico principal: ${patientData?.diagnosis || "no registrado"}.

PROBLEMAS ACTIVOS:
${problems.length > 0 ? problems.map((problem, index) => `${index + 1}. ${problem}`).join("\n") : "1. Sin problemas registrados."}

PARACLÍNICOS RECIENTES:
${labsText}

ALERTAS AUTOMÁTICAS:
${alerts.length > 0 ? alerts.map((alert) => `• ${alert}`).join("\n") : "• Sin alertas críticas automáticas por laboratorios capturados."}

INTEGRACIÓN:
Paciente en seguimiento por Medicina Interna. Al momento se integra con los diagnósticos registrados y paraclínicos recientes. La prioridad clínica se orienta a identificar datos de deterioro hemodinámico, respiratorio, renal, infeccioso o hematológico. Requiere correlación estrecha con exploración física, balance hídrico, diuresis, respuesta al tratamiento y evolución durante el pase de visita.

PLAN:
• Continuar vigilancia clínica y hemodinámica.
• Actualizar exploración física dirigida por aparatos y sistemas.
• Vigilar tendencia de laboratorios, especialmente función renal, electrolitos, biometría hemática y marcadores inflamatorios.
• Revalorar balance hídrico, diuresis y necesidad de ajuste de líquidos/diurético según contexto clínico.
• Ajustar tratamiento de acuerdo con evolución, comorbilidades, función renal y respuesta terapéutica.
• Mantener búsqueda activa de datos de alarma: deterioro neurológico, disnea, dolor torácico, fiebre, sangrado, oliguria o inestabilidad.
• Documentar evolución y plan definitivo posterior al pase.`;

    await supabase.from("notes").insert({
      patient_id: id,
      type: "Synapse AI",
      title: `Synapse AI v2 ${new Date().toLocaleDateString("es-MX")}`,
      content: generatedContent,
    });

    revalidatePath(`/patients/${id}`);
    redirect(`/patients/${id}`);
  }

  async function deleteNote(formData: FormData) {
    "use server";

    const noteId = String(formData.get("noteId") ?? "").trim();

    if (!noteId) {
      return;
    }

    await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("patient_id", id);

    revalidatePath(`/patients/${id}`);
  }

  async function createLabs(formData: FormData) {
    "use server";

    const rawLabs = String(formData.get("rawLabs") ?? "").trim();

    function extractLab(patterns: RegExp[]) {
      for (const pattern of patterns) {
        const match = rawLabs.match(pattern);
        if (match?.[1]) return match[1];
      }

      return null;
    }

    const parsedLabs = rawLabs
      ? {
          glu: extractLab([/\bGLU\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bGLUCOSA\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          cr: extractLab([/\bCR\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bCRE\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bCREATININA\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          na: extractLab([/\bNA\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bSODIO\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          k: extractLab([/\bK\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bPOTASIO\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          hb: extractLab([/\bHB\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bHEMOGLOBINA\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          leu: extractLab([/\bLEU\s*[:=]?\s*(\d+(?:\.\d+)?)/i, /\bLEUCOCITOS\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          pct: extractLab([/\bPCT\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          bnp: extractLab([/\bBNP\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
          pcr: extractLab([/\bPCR\s*[:=]?\s*(\d+(?:\.\d+)?)/i]),
        }
      : null;

    const newLabs = {
      patient_id: id,
      glu: String(formData.get("glu") ?? "").trim() || parsedLabs?.glu || null,
      cr: String(formData.get("cr") ?? "").trim() || parsedLabs?.cr || null,
      na: String(formData.get("na") ?? "").trim() || parsedLabs?.na || null,
      k: String(formData.get("k") ?? "").trim() || parsedLabs?.k || null,
      hb: String(formData.get("hb") ?? "").trim() || parsedLabs?.hb || null,
      leu: String(formData.get("leu") ?? "").trim() || parsedLabs?.leu || null,
      pct: String(formData.get("pct") ?? "").trim() || parsedLabs?.pct || null,
      bnp: String(formData.get("bnp") ?? "").trim() || parsedLabs?.bnp || null,
      pcr: String(formData.get("pcr") ?? "").trim() || parsedLabs?.pcr || null,
      otros: String(formData.get("otros") ?? "").trim() || (rawLabs ? `Texto original: ${rawLabs}` : null),
    };

    const hasAnyLab = Object.entries(newLabs).some(
      ([key, value]) => key !== "patient_id" && value !== null
    );

    if (!hasAnyLab) {
      return;
    }

    const { error } = await supabase.from("labs").insert(newLabs);

    if (error) {
      console.error("Error al guardar laboratorios:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
    redirect(`/patients/${id}`);
  }

  async function completeRound() {
    "use server";

    await supabase.from("round_logs").insert({
      patient_id: id,
    });

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
  }

  async function dischargePatient() {
    "use server";

    await supabase.from("round_logs").delete().eq("patient_id", id);
    await supabase.from("labs").delete().eq("patient_id", id);
    await supabase.from("notes").delete().eq("patient_id", id);
    await supabase.from("patients").delete().eq("id", id);

    revalidatePath("/");
    redirect("/");
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

  const recentLabs = [...(labHistory ?? [])].reverse();

  function labValue(lab: any, key: string) {
    const raw = lab?.[key];
    if (raw === null || raw === undefined || raw === "") return null;
    return String(raw);
  }

  function trendText(key: string, label: string) {
    const values = recentLabs
      .map((lab) => labValue(lab, key))
      .filter(Boolean) as string[];

    if (values.length === 0) return `${label}: Pendiente`;
    if (values.length === 1) return `${label}: ${values[0]}`;

    const first = Number(values[0]);
    const last = Number(values[values.length - 1]);
    const arrow =
      !Number.isNaN(first) && !Number.isNaN(last)
        ? last > first
          ? " ↑"
          : last < first
            ? " ↓"
            : " →"
        : "";

    return `${label}: ${values.join(" → ")}${arrow}`;
  }

  function labDate(lab: any) {
    return new Date(lab.created_at).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function timelineDate(value: string) {
    return new Date(value).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  function timelineTime(value: string) {
    return new Date(value).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function timelineLabs(lab: any) {
    return [
      lab.cr ? `Cr ${lab.cr}` : null,
      lab.hb ? `Hb ${lab.hb}` : null,
      lab.leu ? `Leu ${lab.leu}` : null,
      lab.na ? `Na ${lab.na}` : null,
      lab.k ? `K ${lab.k}` : null,
      lab.glu ? `Glu ${lab.glu}` : null,
      lab.otros ? `Otros: ${lab.otros}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  const timelineItems = [
    ...(notes ?? []).map((note) => ({
      id: `note-${note.id}`,
      type: "Nota",
      date: note.created_at,
      title: note.title || "Nota médica",
      description: note.type || "Nota clínica",
      href: `/patients/${id}/notes/${note.id}`,
    })),
    ...(labHistory ?? []).map((lab) => ({
      id: `lab-${lab.id}`,
      type: "Labs",
      date: lab.created_at,
      title: timelineLabs(lab) || "Laboratorios capturados",
      description: "Registro de laboratorio",
      href: null,
    })),
  ]
    .filter((item) => Boolean(item.date))
    .sort(
      (a, b) =>
        new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
    );

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

  const synapseAnalysis = `Paciente con diagnóstico de ${
    patient.diagnosis || "patología en estudio"
  }, actualmente en seguimiento por Medicina Interna. ${synapsePriority} Se cuenta con últimos paraclínicos: ${
    labsResumen || "pendientes de captura"
  }. Se sugiere correlacionar con evolución clínica, exploración física, balance hídrico, respuesta al tratamiento y pendientes del día.`;

  const synapsePlan = synapsePendings.join("; ");

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
${synapseAnalysis}

PLAN:
${synapsePlan}`;

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
            <Link
              href={`/patients/${id}/notes/new`}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              ✍️ Nueva nota
            </Link>
            <Link
              href={`/patients/${id}/edit`}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/20"
            >
              Editar paciente
            </Link>
            <form action={completeRound}>
              <button
                type="submit"
                className="rounded-xl bg-green-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-green-300"
              >
                ✓ Pase completado
              </button>
            </form>
            <form action={dischargePatient}>
              <button
                type="submit"
                className="rounded-xl bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-red-300"
              >
                Dar de alta / retirar
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

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                v1 AI
              </span>

              <form action={createSynapseNote}>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  Generar análisis
                </button>
              </form>
            </div>
          </div>

          <p className="mb-5 leading-7 text-slate-200">{synapseSummary}</p>

          <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-[#071A2F] p-4">
            <h3 className="mb-2 font-semibold text-cyan-300">Borrador Synapse AI v2 estilo R+</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
{`ANÁLISIS:
${synapseAnalysis}

PLAN:
${synapsePlan}`}
            </p>
          </div>

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
          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-cyan-300">
                📅 Timeline clínico
              </h2>
              <p className="text-sm text-slate-400">
                Notas y laboratorios ordenados por fecha
              </p>
            </div>

            {timelineItems.length > 0 ? (
              <div className="space-y-3">
                {timelineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#071A2F] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                            {item.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {timelineDate(item.date as string)} · {timelineTime(item.date as string)}
                          </span>
                        </div>

                        <p className="mt-3 font-semibold text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      {item.href ? (
                        <Link
                          href={item.href}
                          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"
                        >
                          Abrir
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">
                Sin eventos clínicos registrados todavía.
              </p>
            )}
          </section>
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
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-cyan-300">
                  📈 Tendencias de laboratorio
                </h2>
                <p className="text-sm text-slate-400">
                  Últimos {recentLabs.length} registro(s) capturados
                </p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-2 text-slate-300 md:grid-cols-2">
              <div className="rounded-xl bg-[#071A2F] p-3">{trendText("cr", "Cr")}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">{trendText("hb", "Hb")}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">{trendText("leu", "Leu")}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">{trendText("na", "Na")}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">{trendText("k", "K")}</div>
              <div className="rounded-xl bg-[#071A2F] p-3">{trendText("glu", "Glu")}</div>
            </div>

            {recentLabs.length > 0 ? (
              <div className="mb-5 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-7 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-300">
                  <span>Fecha</span>
                  <span>Cr</span>
                  <span>Hb</span>
                  <span>Leu</span>
                  <span>Na</span>
                  <span>K</span>
                  <span>Glu</span>
                </div>

                {[...(labHistory ?? [])].map((lab) => (
                  <div key={lab.id} className="grid grid-cols-7 border-t border-white/10 px-3 py-2 text-xs text-slate-300">
                    <span>{labDate(lab)}</span>
                    <span>{lab.cr || "-"}</span>
                    <span>{lab.hb || "-"}</span>
                    <span>{lab.leu || "-"}</span>
                    <span>{lab.na || "-"}</span>
                    <span>{lab.k || "-"}</span>
                    <span>{lab.glu || "-"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-5 text-sm text-slate-400">Sin laboratorios capturados.</p>
            )}

            <form action={createLabs} className="rounded-2xl bg-[#071A2F] p-4">
              <p className="mb-3 font-semibold text-cyan-300">Capturar laboratorios</p>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-slate-400">
                  Pegar laboratorios
                </label>
                <textarea
                  name="rawLabs"
                  placeholder="Ejemplo: GLU 92 URE 102 CRE 6.0 NA 140 K 4.2 LEU 12.1 HB 9.8 PLAQ 210"
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  SynapMed intentará llenar Glu, Cr, Na, K, Hb, Leu, PCT, BNP y PCR automáticamente al guardar.
                </p>
              </div>

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
              <NoteTemplateSelector today={today} defaultTemplate={plantillaMI} />

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
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-bold">{note.title || "Nota médica"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {note.type || "Nota médica"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/patients/${id}/notes/${note.id}`}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"
            >
              Ver
            </Link>

            <Link
              href={`/patients/${id}/notes/${note.id}/edit`}
              className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Editar
            </Link>

            <form action={deleteNote}>
              <input type="hidden" name="noteId" value={note.id} />
              <button
                type="submit"
                className="rounded-xl bg-red-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-red-300"
              >
                Eliminar
              </button>
            </form>
          </div>
        </div>

        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-slate-300">
          {note.content || "Sin contenido."}
        </p>
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