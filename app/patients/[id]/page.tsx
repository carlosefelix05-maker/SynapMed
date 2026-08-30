import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SynapseProButton from "@/app/components/SynapseProButton";
import EvolutionGeneratorButton from "@/app/components/EvolutionGeneratorButton";
import VpoGeneratorButton from "@/app/components/VpoGeneratorButton";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { roundsToday, formatRoundsDate } from "@/lib/date";
import { derivedLabs, interpretGases, derivedVentilation } from "@/lib/clinical";
import {
  formatLabsText,
  formatGasesText,
  parseLabsText,
  LAB_FIELD_NAMES,
} from "@/lib/labs-fields";
import ClinicalResults from "@/app/components/ClinicalResults";

type PresentationRecord = {
  id: string;
  presented_on: string;
  content: string;
};

type MedicalOrder = {
  id: string;
  category: string;
  description: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  suspended: boolean;
  suspended_at: string | null;
};

const ORDER_CATEGORIES: Array<{ key: string; label: string; hint: string }> = [
  { key: "dieta", label: "Dieta", hint: "Ayuno, blanda, hiposódica…" },
  {
    key: "soluciones",
    label: "Soluciones e infusiones",
    hint: "Cristaloides, aminas, infusiones continuas",
  },
  {
    key: "inhaloterapia",
    label: "Inhaloterapia",
    hint: "Broncodilatadores, esteroide inhalado, oxígeno",
  },
  { key: "medicamentos", label: "Medicamentos", hint: "Esquema actual" },
];

type VentilationRecord = {
  id: string;
  recorded_at: string;
  modo: string | null;
  vt: string | null;
  fr: string | null;
  peep: string | null;
  fio2: string | null;
  pplat: string | null;
  ppico: string | null;
  pao2: string | null;
  notes: string | null;
};

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ subspecialty?: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const query = await searchParams;
  const selectedSubspecialty = query?.subspecialty || "Todas";
  const subspecialtyQuery =
    selectedSubspecialty !== "Todas"
      ? `?subspecialty=${encodeURIComponent(selectedSubspecialty)}`
      : "";

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });
    const noteAuthorIds = Array.from(
  new Set((notes ?? []).map((note) => note.created_by).filter(Boolean))
) as string[];

const { data: noteAuthors } = noteAuthorIds.length
  ? await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", noteAuthorIds)
  : { data: [] };

const noteAuthorMap = new Map(
  ((noteAuthors ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
  }>).map((profile) => [profile.id, profile])
);

  const { data: latestLabs } = await supabase
    .from("labs")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: labHistory } = await supabase
    .from("labs")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: vitalsHistory } = await supabase
    .from("patient_vitals")
    .select("*")
    .eq("patient_id", id)
    .order("recorded_at", { ascending: false })
    .limit(5);

  const latestVitals = vitalsHistory?.[0] ?? null;

  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  const { data: patientImages } = await supabase
    .from("patient_images")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  const signedImageUrls = new Map<string, string>();

  await Promise.all(
    (patientImages ?? []).map(async (image) => {
      const imagePath = image.image_url?.includes("/patient-images/")
        ? image.image_url.split("/patient-images/").pop()
        : image.image_url;

      if (!imagePath) return;

      const { data: signedImage } = await supabase.storage
        .from("patient-images")
        .createSignedUrl(imagePath, 60 * 10);

      if (signedImage?.signedUrl) {
        signedImageUrls.set(image.id, signedImage.signedUrl);
      }
    })
  );

  const { data: patientTasks } = await supabase
    .from("patient_tasks")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  const { data: allPatients } = await supabase
    .from("patients")
    .select("id, full_name, bed, subspecialty")
    .eq("team_id", CURRENT_TEAM_ID)
    .order("bed", { ascending: true });

  const { data: presentations } = await supabase
    .from("presentations")
    .select("id, presented_on, content, updated_at")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("presented_on", { ascending: false })
    .limit(10);

  const roundsDate = roundsToday();

  const todayPresentation =
    (presentations ?? []).find(
      (presentation: any) => presentation.presented_on === roundsDate
    ) ?? null;

  // Si hoy todavía no se presenta el caso, se muestra la última disponible.
  const currentPresentation = todayPresentation ?? (presentations ?? [])[0] ?? null;

  const previousPresentations = (presentations ?? []).filter(
    (presentation: any) => presentation.id !== currentPresentation?.id
  );

  const { data: ventilationHistory } = await supabase
    .from("ventilation")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("recorded_at", { ascending: false })
    .limit(6);

  const latestVentilation = (ventilationHistory ?? [])[0] ?? null;

  const { data: medicalOrders } = await supabase
    .from("medical_orders")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: true });

  const ordersOf = (category: string) =>
    ((medicalOrders ?? []) as MedicalOrder[]).filter(
      (order) => order.category === category
    );

  const patientContext = { age: patient?.age ?? null, sex: patient?.sex ?? null };

  const labResults = derivedLabs(latestLabs ?? {}, patientContext);
  const gasResults = interpretGases(latestLabs ?? {}, patientContext);

  const ventilationResults = latestVentilation
    ? derivedVentilation({
        sex: patient?.sex ?? null,
        heightCm: patient?.height_cm ?? null,
        vt: latestVentilation.vt,
        fr: latestVentilation.fr,
        peep: latestVentilation.peep,
        fio2: latestVentilation.fio2,
        pplat: latestVentilation.pplat,
        ppico: latestVentilation.ppico,
        pao2: latestVentilation.pao2,
      })
    : [];

  async function toggleVmi() {
    "use server";

    const supabase = await createClient();

    await supabase
      .from("patients")
      .update({ on_vmi: !patient?.on_vmi })
      .eq("id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
  }

  async function createNote(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
  data: { user },
} = await supabase.auth.getUser();

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) {
      return;
    }

    await supabase.from("notes").insert({
  patient_id: id,
  team_id: CURRENT_TEAM_ID,
  created_by: user?.id ?? null,
  type: "progress",
  title,
  content,
});

    revalidatePath(`/patients/${id}`);
  }

  async function createSynapseNote() {
    "use server";
    const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
    const { data: patientData } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("team_id", CURRENT_TEAM_ID)
      .single();

    const { data: latestLabData } = await supabase
      .from("labs")
      .select("*")
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID)
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

    const sexUpper = String(patientData?.sex || "PACIENTE").toUpperCase();
    const ageText = patientData?.age ? `${patientData.age} AÑOS` : "EDAD NO REGISTRADA";
    const bedText = patientData?.bed ? `CAMA ${patientData.bed}` : "CAMA NO REGISTRADA";
    const diagnosisHeader = problems.length > 0
      ? problems.map((problem) => `- ${problem.toUpperCase()}`).join("\n")
      : "- DIAGNÓSTICO NO REGISTRADO";

    const generatedContent = `SYNAPSE AI v4 R++

${sexUpper} DE ${ageText}, EN ${bedText}, A CARGO DE MEDICINA INTERNA POR LOS DIAGNÓSTICOS DE:

${diagnosisHeader}

ACTUALMENTE SE INTEGRA PACIENTE EN SEGUIMIENTO POR MEDICINA INTERNA, CON BASE EN LOS DIAGNÓSTICOS REGISTRADOS Y LOS ÚLTIMOS PARACLÍNICOS DISPONIBLES.

PARACLÍNICOS RECIENTES:
${labsText}

ALERTAS AUTOMÁTICAS:
${alerts.length > 0 ? alerts.map((alert) => `• ${alert}`).join("\n") : "• Sin alertas críticas automáticas por laboratorios capturados."}

ANÁLISIS R++:
Paciente con los problemas activos previamente descritos. En este contexto, la prioridad clínica es identificar deterioro hemodinámico, respiratorio, renal, infeccioso, metabólico o hematológico. Los paraclínicos actuales deben correlacionarse con exploración física, balance hídrico, diuresis, respuesta terapéutica y evolución durante el pase de visita.

Por el momento, el abordaje debe mantenerse orientado a jerarquizar problemas, vigilar tendencia de laboratorios y ajustar tratamiento según condición clínica, comorbilidades y función renal. Requiere documentación de evolución dirigida y reevaluación de pendientes del día.

PLAN R++:
1. Continuar vigilancia clínica y hemodinámica.
2. Actualizar exploración física dirigida por aparatos y sistemas.
3. Vigilar tendencia de laboratorios, con énfasis en función renal, electrolitos, biometría hemática y marcadores inflamatorios.
4. Revalorar balance hídrico, diuresis y necesidad de ajuste de líquidos o diurético según contexto clínico.
5. Ajustar tratamiento de acuerdo con evolución, comorbilidades, función renal y respuesta terapéutica.
6. Mantener búsqueda activa de datos de alarma: deterioro neurológico, disnea, dolor torácico, fiebre, sangrado, oliguria o inestabilidad.
7. Documentar evolución y plan definitivo posterior al pase de visita.`;

    await supabase.from("notes").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
      created_by: user?.id ?? null,
      type: "Synapse AI",
      title: `Synapse AI v4 R++ ${new Date().toLocaleDateString("es-MX")}`,
      content: generatedContent,
    });

    revalidatePath(`/patients/${id}`);
    redirect(`/patients/${id}`);
  }

  async function updateProblemStatus(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const problemId = String(formData.get("problemId") ?? "").trim();
    const status = String(formData.get("status") ?? "Activo").trim();

    if (!problemId) return;

    await supabase
      .from("problems")
      .update({
        status,
        resolved_at: status === "Resuelto" ? new Date().toISOString() : null,
      })
      .eq("id", problemId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    revalidatePath(`/patients/${id}`);
  }

  async function updateProblemPriority(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const problemId = String(formData.get("problemId") ?? "").trim();
    const priority = String(formData.get("priority") ?? "Media").trim();

    if (!problemId) return;

    await supabase
      .from("problems")
      .update({ priority })
      .eq("id", problemId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    revalidatePath(`/patients/${id}`);
  }


  async function createPatientTask(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const taskScope = String(formData.get("task_scope") ?? "Guardia").trim();

    if (!title) return;

    const { error } = await supabase.from("patient_tasks").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
      title,
      category: category || null,
      task_scope: taskScope || "Guardia",
      status: "Pendiente",
    });

    if (error) {
      console.error("Error al guardar pendiente:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }

  async function updatePatientTaskStatus(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const taskId = String(formData.get("taskId") ?? "").trim();
    const status = String(formData.get("status") ?? "Pendiente").trim();

    if (!taskId) return;

    const { error } = await supabase
      .from("patient_tasks")
      .update({
        status,
        completed_at: status === "Realizado" ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("Error al actualizar pendiente:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }


  async function addOrder(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const category = String(formData.get("category") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!description || !category) return;

    const optional = (name: string) =>
      String(formData.get(name) ?? "").trim() || null;

    const { error } = await supabase.from("medical_orders").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
      category,
      description,
      dose: optional("dose"),
      route: optional("route"),
      frequency: optional("frequency"),
      created_by: user?.id ?? null,
    });

    if (error) {
      console.error("No se pudo agregar la indicación:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }

  // Suspende en lote lo que quedó marcado. Es la casilla de al lado de cada
  // indicación: se marcan varias durante el pase y se guarda una sola vez.
  async function applySuspensions(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const ids = formData
      .getAll("suspend")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!ids.length) return;

    const { error } = await supabase
      .from("medical_orders")
      .update({ suspended: true, suspended_at: new Date().toISOString() })
      .in("id", ids)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("No se pudieron suspender las indicaciones:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }

  // El id llega enlazado con bind: un botón con formAction de función no puede
  // llevar name/value propios, React los usa para codificar la acción.
  async function resumeOrder(orderId: string) {
    "use server";

    const supabase = await createClient();

    if (!orderId) return;

    const { error } = await supabase
      .from("medical_orders")
      .update({ suspended: false, suspended_at: null })
      .eq("id", orderId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("No se pudo reanudar la indicación:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }

  async function deleteOrder(orderId: string) {
    "use server";

    const supabase = await createClient();

    if (!orderId) return;

    const { error } = await supabase
      .from("medical_orders")
      .delete()
      .eq("id", orderId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("No se pudo borrar la indicación:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }

  async function deletePresentation(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const presentationId = String(formData.get("presentationId") ?? "").trim();

    if (!presentationId) return;

    const { error } = await supabase
      .from("presentations")
      .delete()
      .eq("id", presentationId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("No se pudo borrar la presentación:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
  }

  async function deleteVentilation(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const recordId = String(formData.get("ventilationId") ?? "").trim();

    if (!recordId) return;

    const { error } = await supabase
      .from("ventilation")
      .delete()
      .eq("id", recordId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("No se pudo borrar el registro del ventilador:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");
  }

  async function createLabs(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const rawLabs = String(formData.get("rawLabs") ?? "").trim();
    const parsed = parseLabsText(rawLabs);

    const newLabs: Record<string, string | null> = {
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
    };

    for (const name of LAB_FIELD_NAMES) {
      newLabs[name] = parsed[name] ?? null;
    }

    const capturados = Object.keys(parsed).length;

    // El texto original solo se guarda si no se pudo repartir en campos:
    // así no ensucia la línea del formato con una copia de todo.
    newLabs.otros =
      String(formData.get("otros") ?? "").trim() ||
      (rawLabs && capturados === 0 ? rawLabs : null);

    const hasAnyLab = Object.entries(newLabs).some(
      ([key, value]) => key !== "patient_id" && key !== "team_id" && value !== null
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

  async function completeRound(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const nextPatientId = String(formData.get("nextPatientId") ?? "").trim();

    await supabase.from("round_logs").insert({
      patient_id: id,
      team_id: CURRENT_TEAM_ID,
    });

    revalidatePath(`/patients/${id}`);
    revalidatePath("/");

    if (nextPatientId) {
      redirect(`/patients/${nextPatientId}${subspecialtyQuery}`);
    }

    redirect(`/${subspecialtyQuery}`);
  }

  async function dischargePatient() {
    "use server";
    const supabase = await createClient();

    await supabase.from("round_logs").delete().eq("patient_id", id).eq("team_id", CURRENT_TEAM_ID);
    await supabase.from("labs").delete().eq("patient_id", id).eq("team_id", CURRENT_TEAM_ID);
    await supabase.from("notes").delete().eq("patient_id", id).eq("team_id", CURRENT_TEAM_ID);
    await supabase.from("patients").delete().eq("id", id).eq("team_id", CURRENT_TEAM_ID);

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

  function timelineVitals(vital: any) {
    return [
      vital.ta ? `TA ${vital.ta}` : null,
      vital.fc ? `FC ${vital.fc}` : null,
      vital.fr ? `FR ${vital.fr}` : null,
      vital.temp ? `Temp ${vital.temp}` : null,
      vital.spo2 ? `SpO₂ ${vital.spo2}` : null,
      vital.glucemia ? `Glu ${vital.glucemia}` : null,
      vital.diuresis ? `Diuresis ${vital.diuresis}` : null,
      vital.peso ? `Peso ${vital.peso}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  const timelineItems = [
   ...(notes ?? []).map((note) => {
  const author = note.created_by ? noteAuthorMap.get(note.created_by) : null;
  const authorName = author?.full_name || author?.email || "No registrado";

  return {
    id: `note-${note.id}`,
    type: note.type || "Nota",
    date: note.created_at,
    title: note.title || "Nota médica",
    description: `${note.type || "Nota clínica"} · Elaboró: ${authorName}`,
    href: `/patients/${id}/notes/${note.id}`,
    noteId: note.id,
    editable: true,
  };
}),
    ...(labHistory ?? []).map((lab) => ({
      id: `lab-${lab.id}`,
      type: "Labs",
      date: lab.created_at,
      title: timelineLabs(lab) || "Laboratorios capturados",
      description: "Registro de laboratorio",
      href: null,
      labId: lab.id,
    })),
    ...(vitalsHistory ?? []).map((vital) => ({
      id: `vital-${vital.id}`,
      type: "SV del pase",
      date: vital.recorded_at || vital.created_at,
      title: timelineVitals(vital) || "Signos vitales capturados",
      description: vital.notes || "Registro de signos vitales del pase",
      href: null,
      vitalId: vital.id,
    })),
    ...(patientImages ?? []).map((image) => ({
      id: `image-${image.id}`,
      type: "Imagen",
      date: image.created_at,
      title: image.title || "Imagen clínica",
      description: image.study_type || "Estudio clínico",
      href: `/patients/${id}/images/${image.id}`,
      imageId: image.id,
    })),
    ...(patientTasks ?? [])
      .filter((task) => task.status === "Realizado")
      .map((task) => ({
        id: `task-${task.id}`,
        type: "Pendiente realizado",
        date: task.completed_at || task.created_at,
        title: task.title || "Pendiente realizado",
        description: `${task.category || "General"} · ${task.task_scope || "Guardia"}`,
        href: null,
        taskId: task.id,
        completedTask: true,
      })),
  ]
    .filter((item) => Boolean(item.date))
    .sort(
      (a, b) =>
        new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
    );

 function timelineBadgeClass(type: string) {
  if (type === "Labs") return "bg-amber-300/10 text-amber-300";
  if (type === "SV del pase") return "bg-green-300/10 text-green-300";
  if (type === "Imagen") return "bg-purple-300/10 text-purple-300";
  if (type === "Pendiente realizado") return "bg-green-300/10 text-green-300";
  if (type === "VPO generada") return "bg-indigo-300/10 text-indigo-300";
  if (type === "Evolución generada") return "bg-emerald-300/10 text-emerald-300";
  if (type === "Synapse AI") return "bg-cyan-400/10 text-cyan-300";
  return "bg-cyan-400/10 text-cyan-300";
}

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

  const activeProblemTitles = (problems ?? [])
    .filter((problem) => problem.status !== "Resuelto")
    .map((problem) => problem.title)
    .filter(Boolean);

  const diagnosisProblemTitles = (patient.diagnosis ?? "")
    .split("/")
    .map((problem: string) => problem.trim())
    .filter(Boolean);

  const synapseProblems =
    activeProblemTitles.length > 0 ? activeProblemTitles : diagnosisProblemTitles;

  const activeProblemText =
    synapseProblems.length > 0 ? synapseProblems.join("; ") : "no registrado";

  const realPendingTasks = (patientTasks ?? [])
    .filter((task) => task.status !== "Realizado")
    .map((task) => task.title)
    .filter(Boolean);

  const recentTimelineContext = timelineItems
    .slice(0, 3)
    .map((item) => `${item.type}: ${item.title}`)
    .join(" | ");

  const synapseSummary = `${patient.sex || "Paciente"} de ${
    patient.age || "edad no registrada"
  } años, cama ${patient.bed || "sin cama"}. Eje clínico actual: ${
    activeProblemText
  }. ${synapsePriority} Últimos laboratorios: ${
    labsResumen || "pendientes de captura"
  }. Pendientes activos: ${
    realPendingTasks.length > 0 ? realPendingTasks.join("; ") : "sin pendientes registrados"
  }.`;

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
    ...realPendingTasks,
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
    realPendingTasks.length === 0 ? "Actualizar evolución y plan del día" : null,
  ].filter(Boolean) as string[];

  const synapseAnalysis = `Paciente en seguimiento por Medicina Interna con eje clínico actual basado en problemas activos: ${
    activeProblemText
  }. ${synapsePriority} Se cuenta con últimos paraclínicos: ${
    labsResumen || "pendientes de captura"
  }. Pendientes activos: ${
    realPendingTasks.length > 0 ? realPendingTasks.join("; ") : "sin pendientes registrados"
  }. Contexto reciente del timeline: ${
    recentTimelineContext || "sin eventos recientes"
  }. Se sugiere correlacionar con evolución clínica, exploración física, balance hídrico, respuesta al tratamiento y pendientes del día.`;

  async function deleteTimelineNote(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const noteId = String(formData.get("noteId") ?? "").trim();

    if (!noteId) return;

    await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    revalidatePath(`/patients/${id}`);
  }

  async function deleteTimelineLab(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const labId = String(formData.get("labId") ?? "").trim();

    if (!labId) return;

    await supabase
      .from("labs")
      .delete()
      .eq("id", labId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    revalidatePath(`/patients/${id}`);
  }

  async function deleteTimelineImage(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const imageId = String(formData.get("imageId") ?? "").trim();

    if (!imageId) return;

    await supabase
      .from("patient_images")
      .delete()
      .eq("id", imageId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    revalidatePath(`/patients/${id}`);
  }

  async function deletePatientTask(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const taskId = String(formData.get("taskId") ?? "").trim();

    if (!taskId) return;

    const { error } = await supabase
      .from("patient_tasks")
      .delete()
      .eq("id", taskId)
      .eq("patient_id", id)
      .eq("team_id", CURRENT_TEAM_ID);

    if (error) {
      console.error("Error al eliminar pendiente:", error.message);
      return;
    }

    revalidatePath(`/patients/${id}`);
  }

  const synapsePlan = synapsePendings.join("; ");

  const priorityOrder: Record<string, number> = {
    Crítico: 0,
    Alta: 1,
    Media: 2,
    Baja: 3,
  };

  const statusOrder: Record<string, number> = {
    Activo: 0,
    Crónico: 1,
    Resuelto: 2,
  };

  const smartProblems = [...(problems ?? [])].sort((a, b) => {
    const statusA = statusOrder[a.status] ?? 9;
    const statusB = statusOrder[b.status] ?? 9;

    if (statusA !== statusB) return statusA - statusB;

    const priorityA = priorityOrder[a.priority] ?? 9;
    const priorityB = priorityOrder[b.priority] ?? 9;

    if (priorityA !== priorityB) return priorityA - priorityB;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const smartTasks = [...(patientTasks ?? [])].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "Pendiente") return -1;
      if (b.status === "Pendiente") return 1;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const patientList =
    selectedSubspecialty === "Todas"
      ? allPatients ?? []
      : (allPatients ?? []).filter(
          (item) => (item.subspecialty || "Medicina Interna") === selectedSubspecialty
        );
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
          <Link href={`/${subspecialtyQuery}`} className="text-sm text-cyan-300">
            ← Volver a Rounds{selectedSubspecialty !== "Todas" ? ` · ${selectedSubspecialty}` : ""}
          </Link>

          <div className="flex flex-wrap gap-3">
            {previousPatient ? (
              <Link
                href={`/patients/${previousPatient.id}${subspecialtyQuery}`}
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
                href={`/patients/${nextPatient.id}${subspecialtyQuery}`}
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
              <input type="hidden" name="nextPatientId" value={nextPatient?.id || ""} />
              <button
                type="submit"
                className="rounded-xl bg-green-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-green-300"
              >
                ✓ Pase completado
              </button>
            </form>
            <form action={dischargePatient}>
              <ConfirmSubmitButton
                message="¿Dar de alta o retirar este paciente? Se eliminarán sus datos del censo."
                className="rounded-xl bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-red-300"
              >
                Dar de alta / retirar
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>

        <section className="rounded-3xl bg-white/10 p-8">
          <p className="text-slate-400">Cama {patient.bed}</p>

          <h1 className="mt-2 text-5xl font-bold">{patient.full_name}</h1>

          <p className="mt-4 text-xl text-slate-300">{patient.diagnosis}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Edad</p>
              <p className="text-2xl font-bold">{patient.age}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Sexo</p>
              <p className="text-2xl font-bold">{patient.sex}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Subespecialidad</p>
              <p className="text-2xl font-bold">{patient.subspecialty || "Medicina Interna"}</p>
            </div>

            <div className="rounded-2xl bg-[#071A2F] p-4">
              <p className="text-slate-400">Prioridad</p>
              <p className="text-2xl font-bold">{patient.priority}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-cyan-400/20 bg-white/10 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300">
                🗣️ Presentación del pase
              </h2>
              <p className="text-sm text-slate-400">
                Resumen con el que se presenta el caso al inicio del pase de visita
              </p>
            </div>

            <Link
              href={`/patients/${id}/presentations/new`}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              {todayPresentation ? "Editar presentación de hoy" : "+ Presentación de hoy"}
            </Link>
          </div>

          {currentPresentation ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-300/20 bg-[#071A2F] p-5">
                <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <h3 className="font-semibold text-white">
                    Pase del {formatRoundsDate(currentPresentation.presented_on)}
                  </h3>

                  <div className="flex items-center gap-3">
                    {todayPresentation ? (
                      <span className="text-xs font-semibold text-green-300">
                        Presentación de hoy
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-300">
                        Aún no hay presentación de hoy
                      </span>
                    )}

                    <form action={deletePresentation}>
                      <input
                        type="hidden"
                        name="presentationId"
                        value={currentPresentation.id}
                      />
                      <ConfirmSubmitButton
                        message={`¿Borrar la presentación del ${formatRoundsDate(currentPresentation.presented_on)}? No se puede deshacer.`}
                        className="text-xs font-semibold text-red-300 hover:text-red-200"
                      >
                        Borrar
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {currentPresentation.content}
                </p>
              </div>

              {previousPresentations.length > 0 ? (
                <details className="rounded-2xl bg-[#071A2F] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-cyan-300">
                    Historial de presentaciones ({previousPresentations.length})
                  </summary>

                  <div className="mt-4 space-y-4">
                    {previousPresentations.map((presentation: PresentationRecord) => (
                      <div
                        key={presentation.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-300">
                            {formatRoundsDate(presentation.presented_on)}
                          </span>

                          <div className="flex items-center gap-3">
                            <Link
                              href={`/patients/${id}/presentations/new?date=${presentation.presented_on}`}
                              className="text-xs text-cyan-300 hover:text-cyan-200"
                            >
                              Editar
                            </Link>

                            <form action={deletePresentation}>
                              <input
                                type="hidden"
                                name="presentationId"
                                value={presentation.id}
                              />
                              <ConfirmSubmitButton
                                message={`¿Borrar la presentación del ${formatRoundsDate(presentation.presented_on)}? No se puede deshacer.`}
                                className="text-xs text-red-300 hover:text-red-200"
                              >
                                Borrar
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {presentation.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#071A2F] p-4 text-sm text-slate-400">
              Sin presentación todavía. Escríbela o genérala con IA a partir de las
              notas, laboratorios y signos vitales del paciente.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white/10 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300">🩺 SV del pase</h2>
              <p className="text-sm text-slate-400">
                Registro rápido de signos vitales durante el pase de visita
              </p>
            </div>

            <Link
              href={`/patients/${id}/vitals/new`}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              + Agregar SV
            </Link>
          </div>

          {latestVitals ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-300/20 bg-[#071A2F] p-4">
                <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <h3 className="font-semibold text-white">Último registro</h3>
                  <span className="text-xs text-slate-400">
                    {timelineDate(latestVitals.recorded_at || latestVitals.created_at)} · {timelineTime(latestVitals.recorded_at || latestVitals.created_at)}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">TA</p>
                    <p className="text-xl font-bold">{latestVitals.ta || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">FC</p>
                    <p className="text-xl font-bold">{latestVitals.fc || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">FR</p>
                    <p className="text-xl font-bold">{latestVitals.fr || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Temp</p>
                    <p className="text-xl font-bold">{latestVitals.temp || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">SpO₂</p>
                    <p className="text-xl font-bold">{latestVitals.spo2 || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Glucemia</p>
                    <p className="text-xl font-bold">{latestVitals.glucemia || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Diuresis</p>
                    <p className="text-xl font-bold">{latestVitals.diuresis || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Peso</p>
                    <p className="text-xl font-bold">{latestVitals.peso || "—"}</p>
                  </div>
                </div>

                {latestVitals.notes ? (
                  <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                    {latestVitals.notes}
                  </p>
                ) : null}
              </div>

              {(vitalsHistory ?? []).length > 1 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {(vitalsHistory ?? []).slice(1).map((vital) => (
                    <div key={vital.id} className="rounded-2xl bg-[#071A2F] p-4">
                      <p className="mb-2 text-xs text-slate-400">
                        {timelineDate(vital.recorded_at || vital.created_at)} · {timelineTime(vital.recorded_at || vital.created_at)}
                      </p>
                      <p className="text-sm text-slate-300">
                        {timelineVitals(vital) || "Registro de signos vitales"}
                      </p>
                      {vital.notes ? (
                        <p className="mt-2 text-xs text-slate-500">{vital.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#071A2F] p-4 text-sm text-slate-400">
              Sin signos vitales capturados. Agrega los SV del pase para integrarlos al expediente.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white/10 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300">
                🫁 Ventilación mecánica
              </h2>
              <p className="text-sm text-slate-400">
                {patient.on_vmi
                  ? "Parámetros del ventilador y cálculos de protección pulmonar"
                  : "Marca si el paciente está intubado para capturar parámetros"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <form action={toggleVmi}>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    patient.on_vmi
                      ? "bg-white/10 text-slate-200 hover:bg-white/20"
                      : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  }`}
                >
                  {patient.on_vmi ? "Marcar sin VMI" : "Marcar con VMI"}
                </button>
              </form>

              {patient.on_vmi ? (
                <Link
                  href={`/patients/${id}/ventilation/new`}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  + Capturar parámetros
                </Link>
              ) : null}
            </div>
          </div>

          {patient.on_vmi ? (
            latestVentilation ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-cyan-300/20 bg-[#071A2F] p-4">
                  <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold text-white">
                      {latestVentilation.modo || "Modo no registrado"}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {timelineDate(latestVentilation.recorded_at)} ·{" "}
                        {timelineTime(latestVentilation.recorded_at)}
                      </span>

                      <form action={deleteVentilation}>
                        <input
                          type="hidden"
                          name="ventilationId"
                          value={latestVentilation.id}
                        />
                        <ConfirmSubmitButton
                          message="¿Borrar este registro del ventilador? No se puede deshacer."
                          className="text-xs font-semibold text-red-300 hover:text-red-200"
                        >
                          Borrar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    {(
                      [
                      ["VT", latestVentilation.vt, "ml"],
                      ["FR", latestVentilation.fr, "rpm"],
                      ["PEEP", latestVentilation.peep, "cmH₂O"],
                      ["FiO₂", latestVentilation.fio2, "%"],
                      ["Pplat", latestVentilation.pplat, "cmH₂O"],
                      ["Ppico", latestVentilation.ppico, "cmH₂O"],
                      ["PaO₂", latestVentilation.pao2, "mmHg"],
                    ] as [string, string | null, string][]
                    ).map(([label, value, unit]) => (
                      <div key={label} className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-xl font-bold">
                          {value || "—"}
                          {value ? (
                            <span className="ml-1 text-xs font-normal text-slate-500">
                              {unit}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    ))}
                  </div>

                  {latestVentilation.notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {latestVentilation.notes}
                    </p>
                  ) : null}
                </div>

                {ventilationResults.length > 0 ? (
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <h3 className="mb-3 text-sm font-bold text-cyan-300">
                      Cálculos automáticos
                    </h3>
                    <ClinicalResults results={ventilationResults} />
                  </div>
                ) : (
                  <p className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                    Falta la talla del paciente para calcular peso predicho y volumen
                    tidal protector.{" "}
                    <Link href={`/patients/${id}/edit`} className="font-semibold underline">
                      Capturarla
                    </Link>
                    .
                  </p>
                )}

                {(ventilationHistory ?? []).length > 1 ? (
                  <details className="rounded-2xl bg-[#071A2F] p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-cyan-300">
                      Historial del ventilador ({(ventilationHistory ?? []).length - 1})
                    </summary>

                    <div className="mt-3 space-y-2">
                      {(ventilationHistory ?? []).slice(1).map((record: VentilationRecord) => (
                        <div
                          key={record.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300"
                        >
                          <div>
                            <span className="text-cyan-300">
                              {timelineDate(record.recorded_at)} {timelineTime(record.recorded_at)}:
                            </span>{" "}
                            {[
                              record.modo,
                              record.vt ? `VT ${record.vt}` : null,
                              record.fr ? `FR ${record.fr}` : null,
                              record.peep ? `PEEP ${record.peep}` : null,
                              record.fio2 ? `FiO₂ ${record.fio2}` : null,
                              record.pplat ? `Pplat ${record.pplat}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>

                          <form action={deleteVentilation}>
                            <input type="hidden" name="ventilationId" value={record.id} />
                            <ConfirmSubmitButton
                              message="¿Borrar este registro del ventilador? No se puede deshacer."
                              className="shrink-0 text-xs text-red-300 hover:text-red-200"
                            >
                              Borrar
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#071A2F] p-4 text-sm text-slate-400">
                Paciente marcado con VMI, sin parámetros capturados todavía.
              </div>
            )
          ) : (
            <div className="rounded-2xl bg-[#071A2F] p-4 text-sm text-slate-400">
              Paciente sin ventilación mecánica invasiva.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-cyan-300">
              💊 Indicaciones médicas
            </h2>
            <p className="text-sm text-slate-400">
              Marca la casilla de lo que se suspende y guarda al final del bloque.
              Lo suspendido se conserva con su fecha.
            </p>
          </div>

          <form action={applySuspensions} className="space-y-4">
            {ORDER_CATEGORIES.map((category) => {
              const items = ordersOf(category.key);
              const activos = items.filter((order) => !order.suspended);
              const suspendidos = items.filter((order) => order.suspended);

              return (
                <div key={category.key} className="rounded-2xl bg-[#071A2F] p-4">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-cyan-300">{category.label}</h3>
                    <span className="text-xs text-slate-500">{category.hint}</span>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin indicaciones registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...activos, ...suspendidos].map((order) => (
                        <div
                          key={order.id}
                          className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                            order.suspended
                              ? "border-white/5 bg-white/5 opacity-60"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <label className="flex flex-1 items-start gap-3">
                            {order.suspended ? null : (
                              <input
                                type="checkbox"
                                name="suspend"
                                value={order.id}
                                className="mt-1 h-4 w-4 shrink-0 accent-red-400"
                              />
                            )}

                            <span>
                              <span className="block font-semibold text-white">
                                {order.description}
                              </span>

                              {[order.dose, order.route, order.frequency].filter(Boolean)
                                .length > 0 ? (
                                <span className="block text-xs text-slate-400">
                                  {[order.dose, order.route, order.frequency]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              ) : null}

                              {order.suspended ? (
                                <span className="block text-xs font-semibold text-amber-300">
                                  Suspendido
                                  {order.suspended_at
                                    ? ` el ${timelineDate(order.suspended_at)}`
                                    : ""}
                                </span>
                              ) : null}
                            </span>
                          </label>

                          <div className="flex shrink-0 items-center gap-3">
                            {order.suspended ? (
                              <button
                                type="submit"
                                formAction={resumeOrder.bind(null, order.id)}
                                className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                              >
                                Reanudar
                              </button>
                            ) : null}

                            <ConfirmSubmitButton
                              formAction={deleteOrder.bind(null, order.id)}
                              message={`¿Borrar "${order.description}" del expediente? Esto es para errores de captura: si se retiró al paciente, márcalo como suspendido.`}
                              className="text-xs text-red-300 hover:text-red-200"
                            >
                              Borrar
                            </ConfirmSubmitButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Guardar suspensiones
            </button>
          </form>

          <form
            action={addOrder}
            className="mt-5 space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4"
          >
            <p className="font-semibold text-cyan-300">Agregar indicación</p>

            <div className="grid gap-3 md:grid-cols-6">
              <select
                name="category"
                defaultValue="medicamentos"
                className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none"
              >
                {ORDER_CATEGORIES.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>

              <input
                name="description"
                required
                placeholder="Nombre o descripción"
                className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none placeholder:text-slate-600 md:col-span-2"
              />

              <input
                name="dose"
                placeholder="Dosis"
                className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none placeholder:text-slate-600"
              />

              <input
                name="route"
                placeholder="Vía"
                className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none placeholder:text-slate-600"
              />

              <input
                name="frequency"
                placeholder="Frecuencia"
                className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              + Agregar
            </button>
          </form>
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
                v4 R++
              </span>

              <EvolutionGeneratorButton patientId={id} />

              <VpoGeneratorButton patientId={id} />

              <SynapseProButton
                patientId={id}
                patient={patient}
                latestLabs={latestLabs}
                labTrends={labHistory ?? []}
                timeline={timelineItems}
                notes={notes ?? []}
              />
            </div>
          </div>

          <p className="mb-5 leading-7 text-slate-200">{synapseSummary}</p>

          <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-[#071A2F] p-4">
            <h3 className="mb-2 font-semibold text-cyan-300">Borrador Synapse AI v4 R++</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
{`ANÁLISIS R++:
${synapseAnalysis}

PLAN R++:
1. ${synapsePendings.join("\n2. ")}`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-[#071A2F] p-4">
              <h3 className="mb-3 font-semibold text-cyan-300">Eje por problemas</h3>

              {synapseProblems.length > 0 ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  {synapseProblems.map((problem: string) => (
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
              <h3 className="mb-3 font-semibold text-amber-300">Pendientes reales / sugeridos</h3>

              <ul className="space-y-2 text-sm text-slate-300">
                {synapsePendings.map((pending) => (
                  <li key={pending}>• {pending}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white/10 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300">
                🧠 Problemas activos inteligentes
              </h2>
              <p className="text-sm text-slate-400">
                Eje clínico del paciente para Synapse, evolución y plan por problemas
              </p>
            </div>

            <Link
              href={`/patients/${id}/problems/new`}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              + Nuevo problema
            </Link>
          </div>

          {smartProblems.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {smartProblems.map((problem) => {
                const isResolved = problem.status === "Resuelto";
                const nextPriority =
                  problem.priority === "Crítico"
                    ? "Crítico"
                    : problem.priority === "Alta"
                      ? "Crítico"
                      : problem.priority === "Media"
                        ? "Alta"
                        : "Media";

                return (
                  <div
                    key={problem.id}
                    className={`rounded-2xl border border-white/10 bg-[#071A2F] p-4 ${
                      isResolved ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-300">
                            {problem.priority}
                          </span>

                          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                            {problem.status}
                          </span>
                        </div>

                        <p className="mt-3 font-semibold text-white">
                          {problem.title}
                        </p>

                        {problem.comments ? (
                          <p className="mt-2 text-sm text-slate-400">
                            {problem.comments}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={updateProblemPriority}>
                          <input type="hidden" name="problemId" value={problem.id} />
                          <input type="hidden" name="priority" value={nextPriority} />
                          <button
                            type="submit"
                            className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-200"
                          >
                            Subir prioridad
                          </button>
                        </form>

                        <form action={updateProblemStatus}>
                          <input type="hidden" name="problemId" value={problem.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={isResolved ? "Activo" : "Resuelto"}
                          />
                          <button
                            type="submit"
                            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                              isResolved
                                ? "bg-green-300 text-slate-950 hover:bg-green-200"
                                : "bg-white/10 text-slate-200 hover:bg-white/20"
                            }`}
                          >
                            {isResolved ? "Reactivar" : "Resolver"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400">
              Sin problemas activos registrados.
            </p>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-cyan-300">
                ✅ Pendientes del pase
              </h2>
              <p className="text-sm text-slate-400">
                Tareas generadas durante el pase: indicaciones, curaciones, interconsultas y pendientes clínicos
              </p>
            </div>

            <form action={createPatientTask} className="mb-4 rounded-2xl bg-[#071A2F] p-4">
              <p className="mb-3 font-semibold text-cyan-300">Agregar pendiente</p>

              <div className="space-y-3">
                <textarea
                  name="title"
                  rows={4}
                  placeholder="Ej. Actualizar indicaciones, realizar curación, solicitar EKG"
                  className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-white outline-none placeholder:text-slate-500"
                />

                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <select
                    name="category"
                    defaultValue="General"
                    className="rounded-xl border border-white/10 bg-[#061325] px-3 py-2 text-white outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Indicaciones">Indicaciones</option>
                    <option value="Curación">Curación</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Imagen">Imagen</option>
                    <option value="Interconsulta">Interconsulta</option>
                    <option value="Procedimiento">Procedimiento</option>
                  </select>

                  <select
                    name="task_scope"
                    defaultValue="Guardia"
                    className="rounded-xl border border-white/10 bg-[#061325] px-3 py-2 text-white outline-none"
                  >
                    <option value="Guardia">Guardia</option>
                    <option value="Pase">Pase</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="Alta">Alta</option>
                    <option value="Interconsulta">Interconsulta</option>
                  </select>

                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </form>

            {smartTasks.length > 0 ? (
              <div className="space-y-3">
                {smartTasks.map((task) => {
                  const isDone = task.status === "Realizado";

                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border border-white/10 bg-[#071A2F] p-4 ${
                        isDone ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                isDone
                                  ? "bg-green-300/10 text-green-300"
                                  : "bg-amber-300/10 text-amber-300"
                              }`}
                            >
                              {task.status}
                            </span>
                            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                              {task.category || "General"}
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                              {task.task_scope || "Guardia"}
                            </span>
                          </div>

                          <p className={`mt-3 font-semibold text-white ${isDone ? "line-through" : ""}`}>
                            {task.title}
                          </p>

                          {task.completed_at ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Realizado: {new Date(task.completed_at).toLocaleString("es-MX")}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <form action={updatePatientTaskStatus}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={isDone ? "Pendiente" : "Realizado"}
                            />
                            <button
                              type="submit"
                              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                                isDone
                                  ? "bg-white/10 text-slate-200 hover:bg-white/20"
                                  : "bg-green-300 text-slate-950 hover:bg-green-200"
                              }`}
                            >
                              {isDone ? "Marcar pendiente" : "Marcar realizado"}
                            </button>
                          </form>

                          <form action={deletePatientTask}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <ConfirmSubmitButton
                              message="¿Eliminar este pendiente?"
                              className="rounded-xl bg-red-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-red-300"
                            >
                              Eliminar
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400">
                Sin pendientes registrados.
              </p>
            )}
          </section>

          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-cyan-300">
                📅 Timeline clínico
              </h2>
              <p className="text-sm text-slate-400">
                Notas, laboratorios, imágenes y pendientes realizados ordenados por fecha
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
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${timelineBadgeClass(item.type)}`}>
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

                      <div className="flex flex-wrap gap-2">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"
                          >
                            Ver
                          </Link>
                        ) : null}

                        {"editable" in item && item.editable && "noteId" in item && item.noteId ? (
                          <>
                            <Link
                              href={`/patients/${id}/notes/${item.noteId}/edit`}
                              className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-200"
                            >
                              Editar
                            </Link>

                            <form action={deleteTimelineNote}>
                              <input type="hidden" name="noteId" value={item.noteId} />
                              <ConfirmSubmitButton
                                message="¿Eliminar esta nota del expediente?"
                                className="rounded-xl bg-red-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-red-300"
                              >
                                Eliminar
                              </ConfirmSubmitButton>
                            </form>
                          </>
                        ) : null}

                        {"labId" in item && item.labId ? (
                          <form action={deleteTimelineLab}>
                            <input type="hidden" name="labId" value={item.labId} />
                            <ConfirmSubmitButton
                              message="¿Eliminar este laboratorio del expediente?"
                              className="rounded-xl bg-red-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-red-300"
                            >
                              Eliminar
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}

                        {"imageId" in item && item.imageId ? (
                          <form action={deleteTimelineImage}>
                            <input type="hidden" name="imageId" value={item.imageId} />
                            <ConfirmSubmitButton
                              message="¿Eliminar esta imagen del expediente?"
                              className="rounded-xl bg-red-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-red-300"
                            >
                              Eliminar
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}

                        {"completedTask" in item && item.completedTask && "taskId" in item && item.taskId ? (
                          <form action={updatePatientTaskStatus}>
                            <input type="hidden" name="taskId" value={item.taskId} />
                            <input type="hidden" name="status" value="Pendiente" />
                            <button
                              type="submit"
                              className="rounded-xl bg-green-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-green-200"
                            >
                              Reabrir
                            </button>
                          </form>
                        ) : null}
                      </div>
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

          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-cyan-300">
                  📷 Estudios e imágenes
                </h2>
                <p className="text-sm text-slate-400">
                  Rx, TAC, ECG, heridas, reportes y otros archivos clínicos
                </p>
              </div>

              <Link
                href={`/patients/${id}/images/new`}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                + Subir imagen
              </Link>
            </div>

            {patientImages && patientImages.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {patientImages.map((image) => (
                  <Link
                    key={image.id}
                    href={`/patients/${id}/images/${image.id}`}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#071A2F] transition hover:bg-white/10"
                  >
                    <div className="aspect-video bg-black/30">
                      <img
                        src={signedImageUrls.get(image.id) || ""}
                        alt={image.title || "Imagen clínica"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-4">
                      <p className="font-semibold text-white">
                        {image.title || "Imagen clínica"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {image.study_type || "Estudio"} · {new Date(image.created_at).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">
                Sin imágenes clínicas registradas.
              </p>
            )}
          </section>

          <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-cyan-300">Laboratorios</h2>

              <Link
                href={`/patients/${id}/labs/new`}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Captura completa
              </Link>
            </div>

            <p className="mb-3 leading-7 text-slate-300">
              {formatLabsText(latestLabs) || labsResumen || "Sin laboratorios registrados"}
            </p>

            {formatGasesText(latestLabs) ? (
              <p className="mb-4 leading-7 text-slate-300">
                {formatGasesText(latestLabs)}
              </p>
            ) : null}

            {labResults.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-cyan-300">
                  Cálculos automáticos
                </h3>
                <ClinicalResults results={labResults} />
              </div>
            ) : null}

            {gasResults ? (
              <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-cyan-300">Gasometría</h3>

                <ClinicalResults
                  results={gasResults.results}
                  columns="sm:grid-cols-2 lg:grid-cols-3"
                />

                {gasResults.interpretation ? (
                  <p className="mt-3 rounded-xl bg-[#071A2F] p-4 text-sm leading-6 text-slate-200">
                    {gasResults.interpretation}
                  </p>
                ) : null}
              </div>
            ) : null}

            {labHistory && labHistory.length > 0 ? (
              <div className="mb-6 space-y-2">
                <p className="text-sm font-semibold text-cyan-300">Historial reciente</p>

                {labHistory.map((lab) => (
                  <div key={lab.id} className="rounded-xl bg-[#071A2F] p-3 text-sm text-slate-300">
                    <span className="text-cyan-300">{labDate(lab)}:</span> {timelineLabs(lab)}
                  </div>
                ))}
              </div>
            ) : null}

            <form action={createLabs} className="space-y-4 rounded-2xl bg-[#071A2F] p-4">
              <p className="font-semibold text-cyan-300">Captura rápida</p>

              <div>
                <textarea
                  name="rawLabs"
                  placeholder="Pega aquí el reporte del laboratorio: Glu 300, Ure 128, Bun 60, Cr 3.0, Alb 2.5, Leu 14.2, Hb 9, Hto 27, Plaq 180, pH 7.20, pCO2 28, HCO3 12, Lactato 4.5..."
                  rows={5}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Reparte solo el texto en los campos del formato: química, biometría,
                  coagulación y gasometría. Acepta &quot;Glu 110&quot;, &quot;GLU: 110&quot; y nombres
                  completos como &quot;Creatinina&quot; o &quot;Hemoglobina&quot;. Para capturar campo por
                  campo, usa Captura completa.
                </p>
              </div>

              <textarea
                name="otros"
                placeholder="Otros parámetros sin campo propio"
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-500"
              />

              <button type="submit" className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950">
                Guardar laboratorios
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}