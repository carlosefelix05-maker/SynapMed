import type { SupabaseClient } from "@supabase/supabase-js";
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
    return "Imágenes cargadas: no analizadas porque falta GEMINI_API_KEY.";
  }

  const { data: images } = await supabase
    .from("patient_images")
    .select("id, title, study_type, image_url, created_at")
    .eq("patient_id", patientId)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("created_at", { ascending: false });

  const patientImages = (images ?? []) as PatientImage[];

  if (patientImages.length === 0) {
    return "Imágenes cargadas: no hay imágenes disponibles en el expediente.";
  }

  const selectedImages = patientImages.slice(0, 3);
  const imageParts = [];

  for (const image of selectedImages) {
    const imagePath = getImagePath(image.image_url);

    if (!imagePath) continue;

    const { data: signedImage } = await supabase.storage
      .from("patient-images")
      .createSignedUrl(imagePath, 60 * 5);

    if (!signedImage?.signedUrl) continue;

    const imageResponse = await fetch(signedImage.signedUrl);

    if (!imageResponse.ok) continue;

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    imageParts.push({
      inlineData: {
        mimeType: contentType,
        data: base64,
      },
    });
  }

  if (imageParts.length === 0) {
    return "Imágenes cargadas: existen imágenes, pero no se pudieron leer de forma segura.";
  }

  const prompt = `
Analiza directamente las imágenes clínicas cargadas en el expediente.

IMPORTANTE:
- Sí debes describir hallazgos visibles.
- Si la imagen parece tele de tórax, describe: técnica/calidad aproximada, silueta cardiomediastinal, campos pulmonares, senos costofrénicos, patrón intersticial/alveolar, atelectasias, consolidaciones, derrame, neumotórax, dispositivos o material visible.
- Si no puedes valorar algo, dilo específicamente.
- No digas simplemente "no interpretar" solo porque no hay reporte de radiología.
- No sustituyes el reporte formal de Imagenología; tu función es aportar una lectura clínica preliminar y prudente.
- No inventes hallazgos no visibles.
- Entrega el resultado en formato breve para expediente de Medicina Interna.

Formato:
TIPO PROBABLE DE ESTUDIO:
HALLAZGOS VISIBLES:
LIMITACIONES:
IMPRESIÓN CLÍNICA PRELIMINAR:
`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, ...imageParts],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    return "Imágenes cargadas: no se pudieron interpretar por error del modelo.";
  }

  const result = await geminiResponse.json();

  const imageAnalysis =
    result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join("\n\n") || "No se obtuvo interpretación útil de las imágenes.";

  return `Contexto de imágenes del expediente:\n${imageAnalysis}`;
}
