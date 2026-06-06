"use client";

import { useState } from "react";

type Props = {
  today: string;
  defaultTemplate: string;
};

const templates = {
  mi: {
    label: "Medicina Interna",
    title: "Evolución MI",
    content: `AL PASE DE VISITA SE ENCUENTRA PACIENTE EN CAMA, CON POSICIÓN LIBREMENTE ELEGIDA, CONSCIENTE, ORIENTADO Y RESPONDIENDO ADECUADAMENTE AL INTERROGATORIO. SE MANTIENE CON ESTABILIDAD HEMODINÁMICA Y RESPIRATORIA AL MOMENTO.

EXPLORACIÓN FÍSICA:
NEUROLÓGICO:
CARDIOVASCULAR:
RESPIRATORIO:
ABDOMEN:
EXTREMIDADES:

PARACLÍNICOS:

ANÁLISIS:

PLAN:`,
  },
  cardio: {
    label: "Cardiología",
    title: "Evolución Cardiología",
    content: `AL PASE DE VISITA SE ENCUENTRA PACIENTE CON ESTABILIDAD HEMODINÁMICA AL MOMENTO. NIEGA DOLOR TORÁCICO, PALPITACIONES O DISNEA EN REPOSO.

CARDIOVASCULAR:
Ruidos cardiacos rítmicos, valorar soplos, datos de congestión, perfusión distal y clase funcional.

PARACLÍNICOS:
EKG:
Biomarcadores:
Ecocardiograma:

ANÁLISIS CARDIOLÓGICO:

PLAN:`,
  },
  nefro: {
    label: "Nefrología",
    title: "Evolución Nefrología",
    content: `AL PASE DE VISITA SE VALORA FUNCIÓN RENAL, DIURESIS, BALANCE HÍDRICO, ELECTROLITOS Y DATOS URÉMICOS.

EXPLORACIÓN:
Estado neurológico, datos de sobrecarga hídrica, edema, perfusión distal.

PARACLÍNICOS:
Azoados:
Electrolitos:
Diuresis:
Balance:

ANÁLISIS NEFROLÓGICO:

PLAN:`,
  },
  neumo: {
    label: "Neumología",
    title: "Evolución Neumología",
    content: `AL PASE DE VISITA SE VALORA PATRÓN RESPIRATORIO, OXIGENACIÓN, TRABAJO VENTILATORIO Y RESPUESTA A OXÍGENO SUPLEMENTARIO.

RESPIRATORIO:
Expansión torácica, murmullo vesicular, estertores/sibilancias, SatO2, dispositivo de oxígeno.

PARACLÍNICOS:
Gasometría:
Imagen:
Oxígeno actual:

ANÁLISIS NEUMOLÓGICO:

PLAN:`,
  },
  uci: {
    label: "Terapia Intensiva",
    title: "Evolución UCI",
    content: `PACIENTE EN ESTADO CRÍTICO CON MONITOREO CONTINUO.

NEUROLÓGICO:
Glasgow/RASS, sedación, pupilas, focalización.

HEMODINÁMICO:
PAM, FC, ritmo, vasopresores/inotrópicos, lactato.

RESPIRATORIO:
Modo ventilatorio, FiO2, PEEP, VT, presiones, gasometría.

RENAL/METABÓLICO:
Diuresis, balance, azoados, electrolitos, glucosa.

INFECCIOSO:
Foco, cultivos, antibióticos.

ANÁLISIS UCI:

PLAN:`,
  },
};

type TemplateKey = keyof typeof templates;

export default function NoteTemplateSelector({ today, defaultTemplate }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("mi");
  const [content, setContent] = useState(defaultTemplate || templates.mi.content);
  const [title, setTitle] = useState(`${templates.mi.title} ${today}`);

  function changeTemplate(value: TemplateKey) {
    setSelectedTemplate(value);
    setTitle(`${templates[value].title} ${today}`);
    setContent(templates[value].content);
  }

  return (
    <>
      <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <label className="mb-2 block text-sm font-semibold text-cyan-300">
          Plantilla por servicio
        </label>
        <select
          value={selectedTemplate}
          onChange={(event) => changeTemplate(event.target.value as TemplateKey)}
          className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
        >
          {Object.entries(templates).map(([key, template]) => (
            <option key={key} value={key}>
              {template.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
        />

        <input
          value="Progress Note"
          readOnly
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300 outline-none"
        />
      </div>

      <textarea
        name="content"
        rows={18}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
      />
    </>
  );
}
