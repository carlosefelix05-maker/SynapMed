import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { CURRENT_TEAM_ID } from "@/lib/team";

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

    const { data: teamPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .single();

    if (!teamPatient) {
      return NextResponse.json(
        { error: "Paciente no encontrado en el equipo actual" },
        { status: 404 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelNames = ["gemini-3.1-flash-lite", "gemini-2.0-flash"];

    const { data: problems } = await supabase
      .from("problems")
      .select("id, title, status, priority, comments, created_at, started_at, resolved_at")
      .eq("patient_id", patientId)
      .eq("team_id", CURRENT_TEAM_ID)
      .order("created_at", { ascending: false });

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

    const activeProblems = [...(problems ?? [])]
      .sort((a: any, b: any) => {
        const statusA = statusOrder[a.status] ?? 9;
        const statusB = statusOrder[b.status] ?? 9;

        if (statusA !== statusB) return statusA - statusB;

        const priorityA = priorityOrder[a.priority] ?? 9;
        const priorityB = priorityOrder[b.priority] ?? 9;

        if (priorityA !== priorityB) return priorityA - priorityB;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .map((problem: any) => ({
        title: problem.title,
        status: problem.status,
        priority: problem.priority,
        comments: problem.comments,
        started_at: problem.started_at,
        resolved_at: problem.resolved_at,
      }));

    const recentClinicalNotes = Array.isArray(notes)
      ? Array.from(
          new Map(
            notes
              .filter(
                (note: any) =>
                  note &&
                  note.type !== "Synapse Pro" &&
                  !String(note.title || "").toLowerCase().includes("synapse") &&
                  typeof note.content === "string" &&
                  note.content.trim().length > 0
              )
              .map((note: any) => [note.content.trim().slice(0, 250), note])
          ).values()
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

    const prompt = `Eres Synapse AI v4 R++, un médico internista virtual con nivel de R4/adscrito.

Tu estilo debe parecerse al de un residente de Medicina Interna del IMSS.

REGLAS:
- Escribe en español médico.
- No inventes datos.
- La fuente primaria para sexo, edad, cama y diagnóstico principal es el objeto PACIENTE, no las notas previas.
- Si una evolución menciona sexo, edad, servicio o diagnóstico que contradice al objeto PACIENTE, debes marcarlo como posible nota mal asignada o discrepancia documental y NO usarlo para definir identidad del paciente.
- No extrapoles antecedentes de otros pacientes ni menciones "otros pacientes del servicio".
- No propongas diagnósticos como TEP, arritmia maligna, sepsis o evento neurológico si no hay datos directos; puedes decir "a descartar" solo si hay datos clínicos compatibles proporcionados.
- Integra fisiopatología.
- Jerarquiza problemas por gravedad.
- Identifica síndromes clínicos.
- Relaciona evolución temporal con laboratorios y eventos clínicos.
- Evita texto de relleno.
- Redacta con lenguaje hospitalario real.
- Si existen datos insuficientes, indícalo explícitamente.
- Dar mayor peso clínico a las evoluciones más recientes.
- Ignorar notas generadas previamente por Synapse.
- Identificar cambios entre notas consecutivas.
- Comparar explícitamente la EVOLUCIÓN MÁS RECIENTE contra las EVOLUCIONES PREVIAS.
- Si existe una evolución posterior, debe ser la base principal del análisis.
- No repetir literalmente la nota; sintetizar cambios clínicos, mejoría, deterioro o estabilidad.
- Usar PROBLEMAS ACTIVOS como eje principal del análisis clínico.
- Si existen problemas activos registrados, el análisis debe organizarse por problema y no solo por sistemas.
- Los problemas con prioridad Crítico o Alta deben aparecer primero.
- Los problemas Resueltos deben mencionarse solo si afectan la conducta actual.

ESTILO DE ANÁLISIS:
- Similar a nota de evolución de Medicina Interna.
- Priorizar razonamiento clínico.
- Identificar mejoría, deterioro o estabilidad.
- Correlacionar función renal, estado inflamatorio, biometría hemática y trastornos hidroelectrolíticos.
- Señalar pendientes diagnósticos y terapéuticos.

PACIENTE:
${JSON.stringify(patient, null, 2)}

ÚLTIMOS LABORATORIOS:
${JSON.stringify(latestLabs, null, 2)}

TENDENCIAS DE LABORATORIO:
${JSON.stringify(labTrends, null, 2)}

PROBLEMAS ACTIVOS REGISTRADOS:
${JSON.stringify(activeProblems, null, 2)}

TIMELINE CLÍNICO:
${JSON.stringify(timeline, null, 2)}

EVOLUCIONES RECIENTES ORDENADAS POR PRIORIDAD CLÍNICA:
La primera es la evolución más reciente y debe tener mayor peso en el análisis.
${JSON.stringify(recentClinicalNotes, null, 2)}

CONTROL DE CALIDAD DOCUMENTAL:
Antes de redactar, verifica si las evoluciones corresponden al mismo paciente. Si detectas contradicciones de sexo, edad, diagnóstico o servicio entre PACIENTE y las evoluciones, debes señalarlo en ALERTAS CLÍNICAS como "posible discordancia documental" y basar el análisis en los datos más confiables.

FORMATO OBLIGATORIO:

SYNAPSE AI v4 R++

RESUMEN EJECUTIVO:
- Máximo 6 líneas.
- Explicar situación actual del paciente.
- No cambies sexo, edad ni diagnóstico si las notas previas los contradicen; usa PACIENTE como fuente principal.

PROBLEMAS ACTIVOS JERARQUIZADOS:
Usa primero los problemas activos registrados. Para cada problema incluye estado, prioridad, interpretación y conducta sugerida.
1. [Problema] — [Estado/Prioridad]: análisis breve y conducta.
2. [Problema] — [Estado/Prioridad]: análisis breve y conducta.
3. [Problema] — [Estado/Prioridad]: análisis breve y conducta.

INTERPRETACIÓN DE PARACLÍNICOS:
- Función renal.
- Biometría hemática.
- Electrolitos.
- Marcadores inflamatorios.
- Tendencias relevantes.

ANÁLISIS CLÍNICO R++:
Redacta un análisis integrador como residente avanzado de Medicina Interna.
Debe incluir comparación temporal: qué cambió respecto a evoluciones previas, qué persiste, qué mejoró y qué empeoró.
Debe estar orientado por problemas activos y correlacionar cada problema con laboratorios, notas recientes y timeline.

PLAN MÉDICO PROPUESTO POR PROBLEMAS:
1. [Problema]: conducta concreta.
2. [Problema]: conducta concreta.
3. [Problema]: conducta concreta.

PENDIENTES DEL DÍA:
- ...

ALERTAS CLÍNICAS:
- Señalar deterioro clínico real si está documentado.
- Señalar posible discordancia documental si alguna nota parece corresponder a otro paciente.
- No inventar antecedentes ni diagnósticos no documentados.
`;

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
        team_id: CURRENT_TEAM_ID,
        type: "Synapse Pro",
        title: `Synapse Pro ${new Date().toLocaleDateString("es-MX")}`,
        content,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: `Synapse Pro generó contenido, pero no pudo guardar la nota: ${insertError.message}`,
        },
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