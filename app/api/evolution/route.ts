

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

function formatLabs(lab: any) {
  if (!lab) return "Sin laboratorios recientes capturados.";

  return [
    lab.glu ? `Glu ${lab.glu}` : null,
    lab.ure ? `Ure ${lab.ure}` : null,
    lab.bun ? `Bun ${lab.bun}` : null,
    lab.cr ? `Cr ${lab.cr}` : null,
    lab.na ? `Na ${lab.na}` : null,
    lab.k ? `K ${lab.k}` : null,
    lab.cl ? `Cl ${lab.cl}` : null,
    lab.ca ? `Ca ${lab.ca}` : null,
    lab.p ? `P ${lab.p}` : null,
    lab.mg ? `Mg ${lab.mg}` : null,
    lab.leu ? `Leu ${lab.leu}` : null,
    lab.hb ? `Hb ${lab.hb}` : null,
    lab.hto ? `Hto ${lab.hto}` : null,
    lab.plt ? `Plaq ${lab.plt}` : null,
    lab.pct ? `PCT ${lab.pct}` : null,
    lab.pcr ? `PCR ${lab.pcr}` : null,
    lab.bnp ? `BNP ${lab.bnp}` : null,
    lab.otros ? `Otros: ${lab.otros}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Falta patientId para generar evolución" },
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: notes } = await supabase
      .from("notes")
      .select("id, title, type, content, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(8);

    const recentClinicalNotes = Array.isArray(notes)
      ? notes
          .filter(
            (note: any) =>
              note &&
              note.type !== "Synapse Pro" &&
              !String(note.title || "").toLowerCase().includes("synapse") &&
              typeof note.content === "string" &&
              note.content.trim().length > 0
          )
          .slice(0, 5)
          .map((note: any, index: number) => ({
            orden:
              index === 0
                ? "EVOLUCIÓN MÁS RECIENTE"
                : `EVOLUCIÓN PREVIA ${index}`,
            title: note.title,
            type: note.type,
            created_at: note.created_at,
            content: note.content,
          }))
      : [];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelNames = ["gemini-3.1-flash-lite", "gemini-2.0-flash"];

    const prompt = `Eres Synapse Evolution, un generador de notas de evolución para Medicina Interna hospitalaria.

Objetivo: redactar una NOTA DE EVOLUCIÓN completa, editable y lista para pase de visita.

REGLAS:
- Español médico, estilo residente de Medicina Interna IMSS.
- No inventes signos vitales, exploración física ni datos no proporcionados.
- Si falta un dato, deja el campo para completar.
- Usa la subespecialidad del paciente para orientar el enfoque.
- No incluyas advertencias legales ni menciones que eres IA.
- No copies literalmente evoluciones previas; integra y actualiza.
- Si hay discordancia documental, menciónala de forma breve en análisis.

PACIENTE:
${JSON.stringify(patient, null, 2)}

SUBESPECIALIDAD:
${patient.subspecialty || "Medicina Interna"}

LABORATORIOS RECIENTES EN FORMATO CLÍNICO:
${formatLabs(latestLab)}

LABORATORIOS CRUDOS:
${JSON.stringify(latestLab, null, 2)}

EVOLUCIONES RECIENTES:
${JSON.stringify(recentClinicalNotes, null, 2)}

FORMATO OBLIGATORIO:

${String(patient.sex || "PACIENTE").toUpperCase()} DE ${patient.age || "EDAD NO REGISTRADA"} AÑOS A CARGO DE MEDICINA INTERNA POR LOS DIAGNÓSTICOS DE:
${patient.diagnosis || "DIAGNÓSTICOS NO REGISTRADOS"}

AL PASE DE VISITA:
Redacta estado actual, síntomas relevantes, estabilidad o deterioro, y cambios respecto a evolución previa.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO:
CARDIOVASCULAR:
RESPIRATORIO:
ABDOMEN:
EXTREMIDADES:

PARACLÍNICOS:
Incluye laboratorios en una sola línea con abreviaturas y sin unidades.

ANÁLISIS:
Redacta análisis integrador tipo R+ / R4 de Medicina Interna, orientado a la subespecialidad ${patient.subspecialty || "Medicina Interna"}. Debe comparar evolución más reciente con previas y jerarquizar problemas.

PLAN:
Redacta plan médico concreto y útil para pase de visita, sin indicaciones de enfermería innecesarias.`;

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
        console.error(`Evolution Gemini error with ${modelName}:`, error);
      }
    }

    if (!content) {
      console.error("Evolution no devolvió contenido:", lastError);
      return NextResponse.json(
        { error: "Gemini no devolvió contenido o está sin cuota disponible" },
        { status: 503 }
      );
    }

    const { data: insertedNote, error: insertError } = await supabase
      .from("notes")
      .insert({
        patient_id: patientId,
        type: "Evolución generada",
        title: `Evolución generada ${new Date().toLocaleDateString("es-MX")}`,
        content,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Se generó la evolución, pero no se pudo guardar: ${insertError.message}` },
        { status: 500 }
      );
    }

    revalidatePath(`/patients/${patientId}`);

    return NextResponse.json({
      content,
      noteId: insertedNote?.id,
      noteUrl: insertedNote?.id
        ? `/patients/${patientId}/notes/${insertedNote.id}`
        : null,
    });
  } catch (error) {
    console.error("Evolution route error:", error);
    return NextResponse.json(
      { error: "Error al generar evolución" },
      { status: 500 }
    );
  }
}