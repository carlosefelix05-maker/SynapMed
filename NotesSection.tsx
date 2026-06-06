"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  content: string;
  created_at?: string;
};

type NotesSectionProps = {
  patientId: string;
  notes: Note[];
};

const plantillaMI = `AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE, ORIENTADO Y RESPONDIENDO ADECUADAMENTE AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO: CONSCIENTE, ORIENTADO, SIN DATOS DE FOCALIZACIÓN NEUROLÓGICA.
CARDIOVASCULAR: RUIDOS CARDIACOS RÍTMICOS, DE BUEN TONO E INTENSIDAD, SIN SOPLOS AUDIBLES.
RESPIRATORIO: ADECUADA EXPANSIÓN TORÁCICA, MURMULLO VESICULAR PRESENTE, SIN RUIDOS AGREGADOS.
ABDOMEN: BLANDO, DEPRESIBLE, NO DOLOROSO, PERISTALSIS PRESENTE, SIN DATOS DE IRRITACIÓN PERITONEAL.
EXTREMIDADES: SIN EDEMA, LLENADO CAPILAR CONSERVADO.

ANÁLISIS:
PACIENTE CON EVOLUCIÓN CLÍNICA ACTUAL __________, CON DIAGNÓSTICOS ACTIVOS YA CONOCIDOS. SE MANTIENE EN VIGILANCIA POR MEDICINA INTERNA, CON SEGUIMIENTO DE PARACLÍNICOS Y RESPUESTA AL MANEJO ESTABLECIDO.

PLAN:
CONTINUAR VIGILANCIA CLÍNICA, MONITOREO DE SIGNOS VITALES, SEGUIMIENTO DE LABORATORIOS, AJUSTE TERAPÉUTICO SEGÚN EVOLUCIÓN Y REVALORACIÓN EN PASE DE VISITA.`;

export default function NotesSection({ patientId, notes }: NotesSectionProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);

    await supabase.from("notes").insert({
      patient_id: patientId,
      type: "progress",
      title: title.trim(),
      content: content.trim(),
    });

    setTitle("");
    setContent("");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <section className="rounded-3xl bg-white/10 p-6 lg:col-span-2">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-cyan-300">Notas clínicas</h2>

        <button
          type="button"
          onClick={() => {
            setTitle(`Evolución ${new Date().toLocaleDateString("es-MX")}`);
            setContent(plantillaMI);
          }}
          className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
        >
          Usar plantilla MI
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-[#071A2F] p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Evolución 06/06/2026"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Tipo</label>
            <input
              value="Progress Note"
              readOnly
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300 outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm text-slate-400">Contenido</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Paciente al pase de visita..."
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar evolución"}
        </button>
      </div>

      {notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl bg-[#071A2F] p-4">
              <p className="font-bold">{note.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400">Sin notas clínicas registradas.</p>
      )}
    </section>
  );
}