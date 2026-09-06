import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { clinicalPatient } from "@/lib/deidentify";
import { formatLabsText, formatGasesText } from "@/lib/labs-fields";
import { formatOrdersText, type MedicalOrder } from "@/lib/orders";
import { getImageClinicalContext } from "@/lib/image-context";


function formatVitals(vitals: any) {
  if (!vitals) return "Sin signos vitales capturados.";

  return [
    vitals.ta ? `TA ${vitals.ta}` : null,
    vitals.fc ? `FC ${vitals.fc}` : null,
    vitals.fr ? `FR ${vitals.fr}` : null,
    vitals.temp ? `Temp ${vitals.temp}` : null,
    vitals.spo2 ? `SatO2 ${vitals.spo2}` : null,
    vitals.glucemia ? `Glucemia ${vitals.glucemia}` : null,
    vitals.diuresis ? `Diuresis ${vitals.diuresis}` : null,
    vitals.peso ? `Peso ${vitals.peso}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Falta patientId para generar la presentación" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .single();

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente no encontrado" },
        { status: 404 }
      );
    }

    const { data: latestLab } = await supabase
      .from("labs")
      .select("*")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("sampled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestVitals } = await supabase
      .from("patient_vitals")
      .select("*")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: notes } = await supabase
      .from("notes")
      .select("id, title, type, content, created_at")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("created_at", { ascending: false })
      .limit(8);

    const { data: problems } = await supabase
      .from("problems")
      .select("title, status, priority, comments, started_at, resolved_at, created_at")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("created_at", { ascending: false });

    // Presentación previa: la nueva debe continuar el hilo, no empezar de cero.
    const { data: previousPresentation } = await supabase
      .from("presentations")
      .select("presented_on, content")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("presented_on", { ascending: false })
      .limit(1)
      .maybeSingle();

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

    const activeProblems = [...(problems ?? [])].sort((a: any, b: any) => {
      const statusA = statusOrder[a.status] ?? 9;
      const statusB = statusOrder[b.status] ?? 9;

      if (statusA !== statusB) return statusA - statusB;

      const priorityA = priorityOrder[a.priority] ?? 9;
      const priorityB = priorityOrder[b.priority] ?? 9;

      if (priorityA !== priorityB) return priorityA - priorityB;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const clinicalNotes = Array.isArray(notes)
      ? notes
          .filter(
            (note: any) =>
              note &&
              typeof note.content === "string" &&
              note.content.trim().length > 0
          )
          .slice(0, 5)
          .map((note: any, index: number) => ({
            orden: index === 0 ? "NOTA MÁS RECIENTE" : `NOTA PREVIA ${index}`,
            title: note.title,
            type: note.type,
            created_at: note.created_at,
            content: note.content,
          }))
      : [];

    const imageClinicalContext = await getImageClinicalContext(supabase, patientId);

    const { data: medicalOrders } = await supabase
      .from("medical_orders")
      .select("*")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("created_at", { ascending: true });

    const ordersText = formatOrdersText((medicalOrders ?? []) as MedicalOrder[]);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelNames = ["gemini-3.1-flash-lite", "gemini-2.0-flash"];

    const prompt = `Eres Synapse Presentación, un generador de presentaciones de paciente para el pase de visita de Medicina Interna hospitalaria.

Objetivo: redactar la PRESENTACIÓN del caso, es decir, el resumen narrativo con el que el residente presenta al paciente al inicio del pase de visita.

REGLAS:
- Español médico, estilo residente de Medicina Interna IMSS.
- Prosa continua en párrafos. NO uses listas, viñetas ni encabezados.
- Máximo 4 párrafos. Debe poder leerse en voz alta en menos de un minuto.
- No inventes datos. Si un dato no está registrado, simplemente no lo menciones.
- No incluyas plan terapéutico detallado ni indicaciones: eso va en la evolución, no en la presentación.
- No incluyas advertencias legales ni menciones que eres IA.
- Si existe una presentación previa, actualízala con lo ocurrido desde entonces en lugar de repetirla igual.
- Si hay imágenes interpretadas por IA, menciónalas como lectura clínica preliminar.
- Puedes mencionar el tratamiento de fondo solo si explica la evolución del caso; no enlistes las indicaciones, eso va en la evolución.

ESTRUCTURA NARRATIVA:
1. Quién es el paciente: edad, sexo, antecedentes relevantes y motivo de ingreso.
2. Qué se encontró al ingreso y con qué diagnóstico se integró.
3. Cómo ha evolucionado durante la estancia y cómo se encuentra hoy.

PACIENTE:
${JSON.stringify(clinicalPatient(patient), null, 2)}

SUBESPECIALIDAD:
${patient.subspecialty || "Medicina Interna"}

PRESENTACIÓN PREVIA (${previousPresentation?.presented_on || "no hay"}):
${previousPresentation?.content || "Sin presentación previa registrada."}

PROBLEMAS REGISTRADOS:
${JSON.stringify(activeProblems, null, 2)}

SIGNOS VITALES MÁS RECIENTES:
${formatVitals(latestVitals)}

LABORATORIOS RECIENTES:
${formatLabsText(latestLab) || "Sin laboratorios recientes capturados."}
${formatGasesText(latestLab)}

INDICACIONES MÉDICAS ACTUALES:
${ordersText}

NOTAS RECIENTES DEL EXPEDIENTE:
${JSON.stringify(clinicalNotes, null, 2)}

IMÁGENES CARGADAS EN EXPEDIENTE:
${imageClinicalContext}

Responde únicamente con el texto de la presentación, sin título ni encabezado.`;

    let content = "";
    let lastError: unknown = null;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        content = result.response.text();
        if (content) break;
      } catch (error) {
        lastError = error;
        console.error(`Presentación Gemini error with ${modelName}:`, error);
      }
    }

    if (!content) {
      console.error("Presentación no devolvió contenido:", lastError);
      return NextResponse.json(
        { error: "Gemini no devolvió contenido o está sin cuota disponible" },
        { status: 503 }
      );
    }

    // No se guarda aquí a propósito: el texto vuelve al editor para revisarlo
    // y es el médico quien decide guardarlo.
    return NextResponse.json({ content: content.trim() });
  } catch (error) {
    console.error("Presentation route error:", error);
    return NextResponse.json(
      { error: "Error al generar la presentación" },
      { status: 500 }
    );
  }
}
