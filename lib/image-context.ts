import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CURRENT_TEAM_ID } from "@/lib/team";

type PatientImage = {
  id: string;
  title: string | null;
  study_type: string | null;
  image_url: string | null;
  created_at: string;
};

function getImagePath(imageUrl: string | null) {
  if (!imageUrl) return null;

  if (imageUrl.includes("/patient-images/")) {
    return imageUrl.split("/patient-images/").pop() || null;
  }

  return imageUrl;
}

export async function getImageClinicalContext(
  supabase: SupabaseClient,
  patientId: string
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return "Contexto de imágenes del expediente:\nIMÁGENES_ANALIZADAS_POR_IA: NO\nMotivo: falta GEMINI_API_KEY.";
  }

  const { data: images, error: imagesError } = await supabase
    .from("patient_images")
    .select("id, title, study_type, image_url, created_at")
    .eq("patient_id", patientId)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  if (imagesError) {
    console.error("Error leyendo patient_images:", imagesError);
    return `Contexto de imágenes del expediente:\nIMÁGENES_ANALIZADAS_POR_IA: NO\nMotivo: error leyendo registros de imágenes: ${imagesError.message}`;
  }

  const patientImages = (images ?? []) as PatientImage[];

  if (patientImages.length === 0) {
    return "Contexto de imágenes del expediente:\nIMÁGENES_ANALIZADAS_POR_IA: NO\nMotivo: no hay imágenes cargadas en el expediente.";
  }

  const selectedImages = patientImages.slice(0, 3);
  const imageParts: Array<{
    inlineData: {
      mimeType: string;
      data: string;
    };
  }> = [];

  const imageDescriptions: string[] = [];

  for (const image of selectedImages) {
    const imagePath = getImagePath(image.image_url);

    if (!imagePath) {
      imageDescriptions.push(`${image.title || "Imagen"}: sin path válido.`);
      continue;
    }

    const { data: signedImage, error: signedError } = await supabase.storage
      .from("patient-images")
      .createSignedUrl(imagePath, 60 * 5);

    if (signedError || !signedImage?.signedUrl) {
      console.error("Error creando signed URL:", signedError);
      imageDescriptions.push(`${image.title || "Imagen"}: no se pudo generar signed URL.`);
      continue;
    }

    const imageResponse = await fetch(signedImage.signedUrl);

    if (!imageResponse.ok) {
      console.error("Error descargando imagen privada:", {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        imagePath,
      });
      imageDescriptions.push(`${image.title || "Imagen"}: no se pudo descargar.`);
      continue;
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    imageDescriptions.push(
      `${image.title || "Imagen clínica"} (${image.study_type || "tipo no especificado"}, ${contentType})`
    );

    imageParts.push({
      inlineData: {
        mimeType: contentType,
        data: base64,
      },
    });
  }

  if (imageParts.length === 0) {
    return `Contexto de imágenes del expediente:
IMÁGENES_ANALIZADAS_POR_IA: NO
Motivo: existen imágenes registradas, pero no se pudieron leer de forma segura.
Imágenes registradas:
${imageDescriptions.join("\n")}`;
  }

  const prompt = `
Analiza directamente las imágenes clínicas cargadas en el expediente.

Imágenes recibidas:
${imageDescriptions.join("\n")}

IMPORTANTE:
- Sí debes describir hallazgos visibles.
- Si la imagen parece tele de tórax, describe: calidad/técnica aproximada, silueta cardiomediastinal, campos pulmonares, senos costofrénicos, patrón intersticial/alveolar, atelectasias, consolidaciones, derrame, neumotórax y dispositivos visibles.
- Si es otra imagen clínica, describe lo visible de forma médica.
- Si algo no puede valorarse, dilo específicamente.
- No respondas solo "no hay reporte formal".
- No sustituyes el reporte formal de Imagenología; esto es una lectura clínica preliminar por IA.
- No inventes hallazgos no visibles.
- Sé breve y útil para Medicina Interna.

Formato:
TIPO PROBABLE DE ESTUDIO:
HALLAZGOS VISIBLES:
LIMITACIONES:
IMPRESIÓN CLÍNICA PRELIMINAR:
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];

    let imageAnalysis = "";

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          ...imageParts,
        ]);

        imageAnalysis = result.response.text();

        if (imageAnalysis?.trim()) {
          break;
        }
      } catch (modelError) {
        console.error(`Error interpretando imágenes con ${modelName}:`, modelError);
      }
    }

    if (!imageAnalysis?.trim()) {
      return `Contexto de imágenes del expediente:
IMÁGENES_ANALIZADAS_POR_IA: NO
Motivo: Gemini no devolvió interpretación útil.
Imágenes recibidas:
${imageDescriptions.join("\n")}`;
    }

    return `Contexto de imágenes del expediente:
IMÁGENES_ANALIZADAS_POR_IA: SÍ
INTERPRETACIÓN_PRELIMINAR_POR_IA: SÍ
INDICACIÓN PARA LA NOTA: debes mencionar explícitamente los hallazgos visibles descritos abajo. No respondas únicamente que no hay reporte formal de Imagenología. Si no hay reporte formal, aclara que lo siguiente es una lectura clínica preliminar por IA.

${imageAnalysis}`;
  } catch (error) {
    console.error("Error general interpretando imágenes:", error);

    return `Contexto de imágenes del expediente:
IMÁGENES_ANALIZADAS_POR_IA: NO
Motivo: error general al procesar imágenes.
Imágenes recibidas:
${imageDescriptions.join("\n")}`;
  }
}
