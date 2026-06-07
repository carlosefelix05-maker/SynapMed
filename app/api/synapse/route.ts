import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, patient, latestLabs, labTrends, timeline, notes } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Falta patientId para guardar la nota" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelNames = ["gemini-3.1-flash-lite", "gemini-2.0-flash"];

    const prompt = `Eres Synapse Pro, un asistente clínico para Medicina Interna.
Redacta en español médico, estilo residente R+.
No inventes datos no proporcionados.
No des diagnósticos definitivos si faltan datos.
Usa formato claro para nota clínica.
Prioriza integración fisiopatológica, problemas activos, análisis y plan.
No menciones que eres IA.
No incluyas advertencias legales genéricas.
El texto debe ser útil para pase de visita hospitalario.

Genera un análisis clínico tipo R++ para este paciente.

PACIENTE:
${JSON.stringify(patient, null, 2)}

ÚLTIMOS LABORATORIOS:
${JSON.stringify(latestLabs, null, 2)}

TENDENCIAS DE LABORATORIO:
${JSON.stringify(labTrends, null, 2)}

TIMELINE CLÍNICO:
${JSON.stringify(timeline, null, 2)}

NOTAS PREVIAS:
${JSON.stringify(notes, null, 2)}

Formato requerido:
SYNAPSE PRO

[Sexo] de [edad] años, en cama [cama], a cargo de Medicina Interna por los diagnósticos de:
- ...

PARACLÍNICOS RELEVANTES:
...

INTEGRACIÓN CLÍNICA R++:
...

PROBLEMAS ACTIVOS JERARQUIZADOS:
1. ...
2. ...

PLAN:
1. ...
2. ...
3. ...

PENDIENTES DEL DÍA:
- ...`;

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
        console.error(`Synapse Pro Gemini error with ${modelName}:`, error);
      }
    }

    if (!content) {
      console.error("Synapse Pro no devolvió contenido:", lastError);
      return NextResponse.json(
        { error: "Gemini no devolvió contenido o está sin cuota disponible" },
        { status: 503 }
      );
    }

    const { data: insertedNote, error: insertError } = await supabase
      .from("notes")
      .insert({
        patient_id: patientId,
        type: "Synapse Pro",
        title: `Synapse Pro ${new Date().toLocaleDateString("es-MX")}`,
        content,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Synapse Pro generó contenido, pero no pudo guardar la nota: ${insertError.message}` },
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
    console.error("Synapse Pro Gemini error:", error);
    return NextResponse.json(
      { error: "Error al generar Synapse Pro con Gemini" },
      { status: 500 }
    );
  }
}
