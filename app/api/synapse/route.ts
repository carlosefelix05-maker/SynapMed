import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient, latestLabs, labTrends, timeline, notes } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
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

    const result = await model.generateContent(prompt);
    const content = result.response.text();

    if (!content) {
      return NextResponse.json(
        { error: "Gemini no devolvió contenido" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Synapse Pro Gemini error:", error);

    return NextResponse.json(
      { error: "Error al generar Synapse Pro con Gemini" },
      { status: 500 }
    );
  }
}