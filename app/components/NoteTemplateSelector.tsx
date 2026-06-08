"use client";

import { useState } from "react";

type Props = {
  today: string;
  defaultTemplate: string;
  subspecialty?: string | null;
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
    content: `AL PASE DE VISITA SE VALORA PACIENTE CON ENFOQUE CARDIOLÓGICO. INTERROGAR DOLOR TORÁCICO, DISNEA, ORTOPNEA, DISNEA PAROXÍSTICA NOCTURNA, PALPITACIONES, SÍNCOPE, EDEMA Y TOLERANCIA AL ESFUERZO.

EXPLORACIÓN CARDIOVASCULAR:
ESTADO HEMODINÁMICO:
RITMO Y FRECUENCIA:
RUIDOS CARDIACOS / SOPLOS:
DATOS DE CONGESTIÓN: ingurgitación yugular, estertores, hepatomegalia, edema.
DATOS DE BAJO GASTO: piel fría, llenado capilar, oliguria, alteración neurológica.

PARACLÍNICOS CARDIOLÓGICOS:
EKG:
TROPONINA / BIOMARCADORES:
BNP/NT-proBNP:
ECOCARDIOGRAMA / FEVI:
RX/TAC SI APLICA:

ANÁLISIS CARDIOLÓGICO:
Paciente con patología cardiovascular en seguimiento. Valorar síndrome coronario agudo, insuficiencia cardiaca agudizada, arritmia, congestión, perfusión, clase funcional NYHA y estadio hemodinámico. Correlacionar clínica con EKG, biomarcadores, BNP y ecocardiograma.

PLAN:`,
  },
  nefro: {
    label: "Nefrología",
    title: "Evolución Nefrología",
    content: `AL PASE DE VISITA SE VALORA PACIENTE CON ENFOQUE NEFROLÓGICO. INTERROGAR DIURESIS, DATOS URÉMICOS, NÁUSEA, VÓMITO, PRURITO, ALTERACIÓN DEL ESTADO NEUROLÓGICO, DISNEA, EDEMA Y TOLERANCIA A LA VÍA ORAL.

EXPLORACIÓN NEFROLÓGICA:
ESTADO NEUROLÓGICO / DATOS URÉMICOS:
ESTADO DE VOLEMIA:
DATOS DE SOBRECARGA HÍDRICA:
EDEMA:
PERFUSIÓN DISTAL:
ACCESO VASCULAR / TENCKHOFF SI APLICA:

PARACLÍNICOS NEFROLÓGICOS:
AZOADOS: Urea/BUN/Creatinina.
ELECTROLITOS: Na, K, Cl, Ca, P, Mg.
EQUILIBRIO ÁCIDO-BASE:
DIURESIS:
BALANCE HÍDRICO:
EGO / PROTEINURIA SI APLICA:

ANÁLISIS NEFROLÓGICO:
Paciente con compromiso renal en seguimiento. Diferenciar ERC vs LRA o agudización de ERC, valorar KDIGO, tendencia de azoados, hiperkalemia, acidosis, sobrecarga hídrica, uremia, nefrotóxicos y criterios de terapia sustitutiva renal.

PLAN:`,
  },
  neumo: {
    label: "Neumología",
    title: "Evolución Neumología",
    content: `AL PASE DE VISITA SE VALORA PACIENTE CON ENFOQUE NEUMOLÓGICO. INTERROGAR DISNEA, TOS, EXPECTORACIÓN, DOLOR TORÁCICO, FIEBRE, HEMOPTISIS, TOLERANCIA AL OXÍGENO Y TRABAJO RESPIRATORIO.

EXPLORACIÓN RESPIRATORIA:
PATRÓN RESPIRATORIO:
USO DE MÚSCULOS ACCESORIOS:
EXPANSIÓN TORÁCICA:
MURMULLO VESICULAR:
ESTERTORES / SIBILANCIAS:
SATURACIÓN Y DISPOSITIVO DE OXÍGENO:

PARACLÍNICOS NEUMOLÓGICOS:
GASOMETRÍA:
RX/TAC DE TÓRAX:
OXIGENOTERAPIA / VMNI / VMI:
RELACIÓN PaO2/FiO2 SI APLICA:
MARCADORES INFLAMATORIOS:

ANÁLISIS NEUMOLÓGICO:
Paciente con patología respiratoria en seguimiento. Valorar insuficiencia respiratoria, neumonía, EPOC/asma, congestión pulmonar, TEP si hay datos, necesidad de oxígeno, VMNI/VMI y respuesta al manejo. Correlacionar clínica, gasometría e imagen.

PLAN:`,
  },
  uci: {
    label: "Terapia Intensiva",
    title: "Evolución UCI",
    content: `PACIENTE EN ESTADO CRÍTICO CON MONITOREO CONTINUO. VALORAR DE FORMA SISTEMÁTICA NEUROLÓGICO, HEMODINÁMICO, RESPIRATORIO, RENAL, METABÓLICO E INFECCIOSO.

NEUROLÓGICO:
Glasgow/RASS:
Sedación/analgesia:
Pupilas/focalización:
Delirium/convulsiones si aplica:

HEMODINÁMICO:
PAM/FC/RITMO:
Vasopresores/inotrópicos:
Lactato/perfusión:
Llenado capilar/diuresis:

RESPIRATORIO:
Modo ventilatorio:
FiO2 / PEEP / VT / FR:
Presiones / mecánica ventilatoria:
Gasometría:
PaO2/FiO2:

RENAL/METABÓLICO:
Diuresis:
Balance hídrico:
Azoados/electrolitos:
Glucosa:

INFECCIOSO:
Foco probable:
Cultivos:
Antibióticos:
PCT/PCR/leucocitos:

ANÁLISIS UCI:
Paciente crítico en seguimiento. Jerarquizar choque, insuficiencia respiratoria, ventilación mecánica, sedoanalgesia, vasopresores, balance hídrico, función renal, control infeccioso, nutrición y prevención de complicaciones asociadas a UCI.

PLAN:`,
  },
  gastro: {
    label: "Gastroenterología",
    title: "Evolución Gastroenterología",
    content: `AL PASE DE VISITA SE VALORA PACIENTE CON ENFOQUE GASTROENTEROLÓGICO. SE INTERROGA DOLOR ABDOMINAL, NÁUSEA, VÓMITO, HEMATEMESIS, MELENA, HEMATOQUEZIA, TOLERANCIA A LA VÍA ORAL Y EVACUACIONES.

EXPLORACIÓN:
ESTADO GENERAL:
ABDOMEN: Inspección, peristalsis, dolor, defensa, rebote, visceromegalias, ascitis.
DATOS DE SANGRADO:
DATOS DE ENCEFALOPATÍA HEPÁTICA:

PARACLÍNICOS:
BH:
PFH:
COAGULACIÓN:
ENDOSCOPIA/IMAGEN:

ANÁLISIS GASTROENTEROLÓGICO:

PLAN:`,
  },
  endo: {
    label: "Endocrinología",
    title: "Evolución Endocrinología",
    content: `AL PASE DE VISITA SE VALORA PACIENTE CON ENFOQUE ENDOCRINOMETABÓLICO. SE INTERROGA SÍNTOMAS DE HIPO/HIPERGLUCEMIA, TOLERANCIA A LA VÍA ORAL, POLIURIA, POLIDIPSIA, ESTADO NEUROLÓGICO Y ADHERENCIA A MANEJO.

EXPLORACIÓN:
ESTADO NEUROLÓGICO:
HIDRATACIÓN:
CARDIORESPIRATORIO:
ABDOMEN:
EXTREMIDADES/PIES:

PARACLÍNICOS:
GLUCOSA:
ELECTROLITOS:
CETONAS/GASOMETRÍA SI APLICA:
FUNCIÓN RENAL:

ANÁLISIS ENDOCRINOLÓGICO:

PLAN:`,
  },
  hema: {
    label: "Hematología",
    title: "Evolución Hematología",
    content: `AL PASE DE VISITA SE VALORA PACIENTE CON ENFOQUE HEMATOLÓGICO. SE INTERROGA SANGRADO ACTIVO, EQUIMOSIS, PETEQUIAS, ASTENIA, DISNEA, FIEBRE, PÉRDIDA DE PESO Y SÍNTOMAS B.

EXPLORACIÓN:
ESTADO GENERAL:
PIEL Y MUCOSAS:
ADENOPATÍAS:
ABDOMEN: HEPATO/ESPLENOMEGALIA.
DATOS DE SANGRADO:

PARACLÍNICOS:
BH:
RETICULOCITOS/FROTIS:
COAGULACIÓN:
HIERRO/B12/FOLATO SI APLICA:

ANÁLISIS HEMATOLÓGICO:

PLAN:`,
  },
};

type TemplateKey = keyof typeof templates;

function templateKeyFromSubspecialty(subspecialty?: string | null): TemplateKey {
  const value = String(subspecialty || "").toLowerCase();

  if (value.includes("cardio")) return "cardio";
  if (value.includes("nefro")) return "nefro";
  if (value.includes("neumo")) return "neumo";
  if (value.includes("terapia") || value.includes("uci") || value.includes("intensiva")) return "uci";
  if (value.includes("gastro")) return "gastro";
  if (value.includes("endo")) return "endo";
  if (value.includes("hema")) return "hema";

  return "mi";
}

export default function NoteTemplateSelector({ today, defaultTemplate, subspecialty }: Props) {
  const initialTemplate = templateKeyFromSubspecialty(subspecialty);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>(initialTemplate);
  const [content, setContent] = useState(defaultTemplate || templates[initialTemplate].content);
  const [title, setTitle] = useState(`${templates[initialTemplate].title} ${today}`);

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
