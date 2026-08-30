import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import { formatLabsText, formatGasesText } from "@/lib/labs-fields";
import { formatOrdersText, type MedicalOrder } from "@/lib/orders";
import { getImageClinicalContext } from "@/lib/image-context";


export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Falta patientId para generar VPO" },
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

    const { data: notes } = await supabase
      .from("notes")
      .select("id, title, type, content, created_at")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
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

    const prompt = `Eres Synapse VPO, un asistente para redactar valoraciones preoperatorias hospitalarias de Medicina Interna.

Objetivo: generar una VALORACIÓN PREOPERATORIA completa, editable y clínicamente útil.

REGLAS:
- Español médico, estilo residente de Medicina Interna IMSS.
- No inventes procedimiento quirúrgico si no está documentado; deja campo para completar.
- No inventes signos vitales ni exploración física no proporcionada.
- Si faltan datos para ASA, Lee, Goldman o Gupta, estima solo si es razonable y especifica que es aproximado.
- No incluyas advertencias legales ni menciones que eres IA.
- Prioriza riesgos cardiaco, pulmonar, renal, hematológico, metabólico e infeccioso.
- Usa lenguaje claro para nota médica.
- Si existen imágenes cargadas e interpretadas, DEBES incluir un apartado breve llamado "Imágenes del expediente" en la VPO. No lo omitas. Si aparece IMÁGENES_ANALIZADAS_POR_IA: SÍ, resume los hallazgos visibles aportados por la IA. No respondas solo que no hay reporte formal de Imagenología; aclara que es lectura clínica preliminar por IA.
- Toma en cuenta las INDICACIONES MÉDICAS ACTUALES, en especial anticoagulantes, antiagregantes, hipoglucemiantes y esteroides, por el riesgo perioperatorio.

PACIENTE:
${JSON.stringify(patient, null, 2)}

SUBESPECIALIDAD:
${patient.subspecialty || "Medicina Interna"}

LABORATORIOS RECIENTES:
${formatLabsText(latestLab) || "Sin laboratorios recientes capturados."}
${formatGasesText(latestLab)}

INDICACIONES MÉDICAS ACTUALES:
${ordersText}

LABORATORIOS CRUDOS:
${JSON.stringify(latestLab, null, 2)}

EVOLUCIONES RECIENTES:
${JSON.stringify(recentClinicalNotes, null, 2)}

IMÁGENES CARGADAS EN EXPEDIENTE:
${imageClinicalContext}

FORMATO OBLIGATORIO:

VALORACIÓN PREOPERATORIA

${String(patient.sex || "PACIENTE").toUpperCase()} DE ${patient.age || "EDAD NO REGISTRADA"} AÑOS, EN CAMA ${patient.bed || "NO REGISTRADA"}, A CARGO DE MEDICINA INTERNA POR LOS DIAGNÓSTICOS DE:
${patient.diagnosis || "DIAGNÓSTICOS NO REGISTRADOS"}

PROCEDIMIENTO PROGRAMADO:
[Completar procedimiento]

MOTIVO DE VALORACIÓN:
Valoración preoperatoria y estratificación de riesgo perioperatorio.

ESTADO CLÍNICO ACTUAL:
Redacta estabilidad hemodinámica, respiratoria, neurológica y datos relevantes disponibles. Si faltan datos, deja pendiente para completar.

PARACLÍNICOS:
Incluye laboratorios en una sola línea con abreviaturas y sin unidades.

RIESGO QUIRÚRGICO Y ANESTÉSICO:
ASA: [I/II/III/IV/V] justificar.
Lee/RCRI: mencionar factores presentes y riesgo aproximado.
Gupta/MICA: estimar solo si hay datos suficientes; si no, indicar pendiente.
Goldman: mencionar si aplica.
Riesgo pulmonar: valorar oxígeno, EPOC, neumonía, VMNI/VMI, SAOS o insuficiencia respiratoria si están documentados.
Riesgo renal/metabólico: valorar ERC/LRA, K, Na, glucosa, acidosis si hay datos.
Riesgo hematológico: valorar Hb, plaquetas, coagulación y sangrado si hay datos.
Riesgo infeccioso: valorar foco activo, fiebre, leucocitosis, antibiótico si hay datos.

ANÁLISIS PREOPERATORIO:
Redacta integración clínica tipo R+ / R4 de Medicina Interna. Debe concluir si el paciente se encuentra con riesgo bajo, intermedio, alto o muy alto según datos disponibles y qué debe optimizarse antes del procedimiento.

RECOMENDACIONES PREOPERATORIAS:
1. ...
2. ...
3. ...

RECOMENDACIONES TRANSOPERATORIAS:
1. ...
2. ...
3. ...

RECOMENDACIONES POSTOPERATORIAS:
1. ...
2. ...
3. ...

CONCLUSIÓN:
Redacta conclusión breve, especificando si no existen contraindicaciones absolutas documentadas o si requiere optimización previa.`;

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
        console.error(`VPO Gemini error with ${modelName}:`, error);
      }
    }

    if (!content) {
      console.error("VPO no devolvió contenido:", lastError);
      return NextResponse.json(
        { error: "Gemini no devolvió contenido o está sin cuota disponible" },
        { status: 503 }
      );
    }

    const { data: insertedNote, error: insertError } = await supabase
      .from("notes")
      .insert({
        patient_id: patientId,
        team_id: CURRENT_TEAM_ID,
        type: "VPO generada",
        title: `VPO generada ${new Date().toLocaleDateString("es-MX")}`,
        content,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Se generó la VPO, pero no se pudo guardar: ${insertError.message}` },
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
    console.error("VPO route error:", error);
    return NextResponse.json(
      { error: "Error al generar VPO" },
      { status: 500 }
    );
  }
}