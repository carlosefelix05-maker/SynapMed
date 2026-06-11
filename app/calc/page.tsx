"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type InfusionUnit = "mcg/kg/min" | "mcg/kg/h" | "mg/kg/h";

type InfusionDrug = {
  name: string;
  unit: InfusionUnit;
  defaultDose: string;
  defaultDrugMg: string;
  defaultDiluentMl: string;
  note: string;
};

const infusionDrugs: InfusionDrug[] = [
  {
    name: "Norepinefrina",
    unit: "mcg/kg/min",
    defaultDose: "0.1",
    defaultDrugMg: "4",
    defaultDiluentMl: "250",
    note: "Choque distributivo/séptico. Meta habitual PAM ≥65.",
  },
  {
    name: "Dobutamina",
    unit: "mcg/kg/min",
    defaultDose: "5",
    defaultDrugMg: "250",
    defaultDiluentMl: "250",
    note: "Bajo gasto cardiaco con presión permisiva.",
  },
  {
    name: "Dopamina",
    unit: "mcg/kg/min",
    defaultDose: "5",
    defaultDrugMg: "200",
    defaultDiluentMl: "250",
    note: "Menos preferida; vigilar taquiarritmias.",
  },
  {
    name: "Adrenalina",
    unit: "mcg/kg/min",
    defaultDose: "0.05",
    defaultDrugMg: "1",
    defaultDiluentMl: "100",
    note: "Choque refractario, anafilaxia o contexto específico.",
  },
  {
    name: "Dexmedetomidina",
    unit: "mcg/kg/h",
    defaultDose: "0.4",
    defaultDrugMg: "0.2",
    defaultDiluentMl: "50",
    note: "Sedación cooperativa. Vigilar bradicardia e hipotensión.",
  },
  {
    name: "Fentanilo",
    unit: "mcg/kg/h",
    defaultDose: "1",
    defaultDrugMg: "0.5",
    defaultDiluentMl: "100",
    note: "Analgesia/sedoanalgesia. Ajustar a respuesta clínica.",
  },
  {
    name: "Propofol",
    unit: "mg/kg/h",
    defaultDose: "1",
    defaultDrugMg: "1000",
    defaultDiluentMl: "100",
    note: "Sedación. Vigilar hipotensión, TG y síndrome de infusión.",
  },
  {
    name: "Midazolam",
    unit: "mg/kg/h",
    defaultDose: "0.05",
    defaultDrugMg: "50",
    defaultDiluentMl: "50",
    note: "Sedación. Vigilar acumulación, especialmente en ERC/ancianos.",
  },
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals).replace(/\.00$/, "");
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </span>
      <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#061527] focus-within:border-cyan-300/60">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
        />
        {suffix ? (
          <span className="flex items-center border-l border-white/10 px-3 text-xs text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function ResultCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p> : null}
    </div>
  );
}

function InfusionCalculator() {
  const [drugName, setDrugName] = useState("Norepinefrina");
  const selectedDrug =
    infusionDrugs.find((drug) => drug.name === drugName) ?? infusionDrugs[0];

  const [weight, setWeight] = useState("70");
  const [dose, setDose] = useState(selectedDrug.defaultDose);
  const [drugMg, setDrugMg] = useState(selectedDrug.defaultDrugMg);
  const [diluentMl, setDiluentMl] = useState(selectedDrug.defaultDiluentMl);

  function changeDrug(name: string) {
    const drug = infusionDrugs.find((item) => item.name === name) ?? infusionDrugs[0];
    setDrugName(drug.name);
    setDose(drug.defaultDose);
    setDrugMg(drug.defaultDrugMg);
    setDiluentMl(drug.defaultDiluentMl);
  }

  const result = useMemo(() => {
    const kg = toNumber(weight);
    const numericDose = toNumber(dose);
    const mg = toNumber(drugMg);
    const ml = toNumber(diluentMl);

    const concentrationMcgMl = ml > 0 ? (mg * 1000) / ml : 0;

    let mcgHour = 0;

    if (selectedDrug.unit === "mcg/kg/min") {
      mcgHour = kg * numericDose * 60;
    }

    if (selectedDrug.unit === "mcg/kg/h") {
      mcgHour = kg * numericDose;
    }

    if (selectedDrug.unit === "mg/kg/h") {
      mcgHour = kg * numericDose * 1000;
    }

    const mlHour = concentrationMcgMl > 0 ? mcgHour / concentrationMcgMl : 0;

    return {
      concentrationMcgMl,
      mcgHour,
      mlHour,
    };
  }, [weight, dose, drugMg, diluentMl, selectedDrug.unit]);

  return (
    <section id="infusiones" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Infusiones automáticas</h2>
        <p className="mt-1 text-sm text-slate-400">
          Selecciona fármaco, peso, dosis y dilución. Calcula ml/h automáticamente.
        </p>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-5">
        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-300">
            Fármaco
          </span>
          <select
            value={drugName}
            onChange={(event) => changeDrug(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
          >
            {infusionDrugs.map((drug) => (
              <option key={drug.name} value={drug.name}>
                {drug.name}
              </option>
            ))}
          </select>
        </label>

        <Field label="Peso" value={weight} onChange={setWeight} suffix="kg" />
        <Field label="Dosis" value={dose} onChange={setDose} suffix={selectedDrug.unit} />
        <Field label="Fármaco" value={drugMg} onChange={setDrugMg} suffix="mg" />
        <Field label="Diluyente" value={diluentMl} onChange={setDiluentMl} suffix="ml" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ResultCard
          title="Concentración"
          value={`${round(result.concentrationMcgMl)} mcg/ml`}
        />
        <ResultCard
          title="Dosis total"
          value={`${round(result.mcgHour)} mcg/h`}
        />
        <ResultCard
          title="Velocidad"
          value={`${round(result.mlHour)} ml/h`}
          helper={selectedDrug.note}
        />
      </div>
    </section>
  );
}

function ElectrolyteCalculator() {
  const [na, setNa] = useState("130");
  const [glu, setGlu] = useState("300");
  const [cl, setCl] = useState("100");
  const [hco3, setHco3] = useState("18");
  const [bun, setBun] = useState("20");
  const [albumin, setAlbumin] = useState("4");

  const result = useMemo(() => {
    const sodium = toNumber(na);
    const glucose = toNumber(glu);
    const chloride = toNumber(cl);
    const bicarb = toNumber(hco3);
    const bloodUreaNitrogen = toNumber(bun);
    const alb = toNumber(albumin);

    const correctedNa = sodium + 1.6 * ((glucose - 100) / 100);
    const anionGap = sodium - (chloride + bicarb);
    const correctedAg = anionGap + 2.5 * (4 - alb);
    const osmolarity = 2 * sodium + glucose / 18 + bloodUreaNitrogen / 2.8;

    return { correctedNa, anionGap, correctedAg, osmolarity };
  }, [na, glu, cl, hco3, bun, albumin]);

  return (
    <section id="electrolitos" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Electrolitos y metabolismo</h2>
        <p className="mt-1 text-sm text-slate-400">
          Na corregido, anion gap, anion gap corregido y osmolaridad.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Field label="Na" value={na} onChange={setNa} suffix="mEq/L" />
        <Field label="Glu" value={glu} onChange={setGlu} suffix="mg/dl" />
        <Field label="Cl" value={cl} onChange={setCl} suffix="mEq/L" />
        <Field label="HCO3" value={hco3} onChange={setHco3} suffix="mEq/L" />
        <Field label="BUN" value={bun} onChange={setBun} suffix="mg/dl" />
        <Field label="Albúmina" value={albumin} onChange={setAlbumin} suffix="g/dl" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <ResultCard title="Na corregido" value={`${round(result.correctedNa, 1)}`} />
        <ResultCard title="Anion gap" value={`${round(result.anionGap, 1)}`} />
        <ResultCard title="AG corregido" value={`${round(result.correctedAg, 1)}`} />
        <ResultCard title="Osm calculada" value={`${round(result.osmolarity, 1)}`} />
      </div>
    </section>
  );
}

function ElectrolyteReplacementCalculator() {
  const [potassium, setPotassium] = useState("3.0");
  const [magnesium, setMagnesium] = useState("1.6");
  const [phosphorus, setPhosphorus] = useState("2.0");
  const [renalRisk, setRenalRisk] = useState(false);

  const result = useMemo(() => {
    const k = toNumber(potassium);
    const mg = toNumber(magnesium);
    const p = toNumber(phosphorus);

    const kPlan =
      k <= 2.5
        ? "KCl 40–60 mEq IV con monitorización; repetir control."
        : k < 3
          ? "KCl 40 mEq IV/VO y control posterior."
          : k < 3.5
            ? "KCl 20–40 mEq VO/IV según tolerancia."
            : "Sin reposición urgente.";

    const mgPlan =
      mg < 1.2
        ? "MgSO4 4 g IV y control posterior."
        : mg < 1.6
          ? "MgSO4 2–4 g IV según contexto."
          : mg < 1.8
            ? "MgSO4 1–2 g si riesgo arrítmico o hipokalemia."
            : "Sin reposición urgente.";

    const pPlan =
      p < 1
        ? "Fósforo severo: considerar KPO4/NaPO4 IV con vigilancia."
        : p < 2
          ? "Reposición de fósforo IV/VO según gravedad y síntomas."
          : p < 2.5
            ? "Reposición oral si tolera; revisar nutrición y causas."
            : "Sin reposición urgente.";

    const warning = renalRisk
      ? "ERC/oliguria: reducir dosis, evitar sobrecorrección y controlar niveles con más frecuencia."
      : "Ajustar a función renal, ECG, síntomas, vía disponible y protocolo local.";

    return { kPlan, mgPlan, pPlan, warning };
  }, [potassium, magnesium, phosphorus, renalRisk]);

  return (
    <section id="reposicion" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Reposición de electrolitos</h2>
        <p className="mt-1 text-sm text-slate-400">
          Sugerencias rápidas para KCl, MgSO4 y fósforo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label="K" value={potassium} onChange={setPotassium} suffix="mEq/L" />
        <Field label="Mg" value={magnesium} onChange={setMagnesium} suffix="mg/dl" />
        <Field label="P" value={phosphorus} onChange={setPhosphorus} suffix="mg/dl" />
        <label
          className={`flex cursor-pointer items-center rounded-2xl border p-4 text-sm font-semibold transition ${
            renalRisk
              ? "border-amber-300/50 bg-amber-400/15 text-amber-100"
              : "border-white/10 bg-[#061527] text-slate-300 hover:bg-white/10"
          }`}
        >
          <input
            type="checkbox"
            checked={renalRisk}
            onChange={(event) => setRenalRisk(event.target.checked)}
            className="mr-2"
          />
          ERC / oliguria
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ResultCard title="Potasio" value={result.kPlan} />
        <ResultCard title="Magnesio" value={result.mgPlan} />
        <ResultCard title="Fósforo" value={result.pPlan} />
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        {result.warning}
      </div>
    </section>
  );
}

function RenalAnticoagulationCalculator() {
  const [age, setAge] = useState("65");
  const [weight, setWeight] = useState("70");
  const [creatinine, setCreatinine] = useState("1.2");
  const [sex, setSex] = useState("M");

  const result = useMemo(() => {
    const years = toNumber(age);
    const kg = toNumber(weight);
    const cr = toNumber(creatinine);
    const base = cr > 0 ? ((140 - years) * kg) / (72 * cr) : 0;
    const crcl = sex === "F" ? base * 0.85 : base;
    const prophylaxis = crcl < 30 ? "30 mg SC cada 24 h" : "40 mg SC cada 24 h";
    const therapeutic = crcl < 30 ? "1 mg/kg SC cada 24 h" : "1 mg/kg SC cada 12 h";

    return { crcl, prophylaxis, therapeutic };
  }, [age, weight, creatinine, sex]);

  return (
    <section id="renal" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Función renal y anticoagulación</h2>
        <p className="mt-1 text-sm text-slate-400">
          Cockcroft-Gault y ajuste rápido de enoxaparina.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Field label="Edad" value={age} onChange={setAge} suffix="años" />
        <Field label="Peso" value={weight} onChange={setWeight} suffix="kg" />
        <Field label="Creatinina" value={creatinine} onChange={setCreatinine} suffix="mg/dl" />

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Sexo</span>
          <select
            value={sex}
            onChange={(event) => setSex(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ResultCard title="CrCl estimada" value={`${round(result.crcl, 1)} ml/min`} />
        <ResultCard title="Profilaxis" value={result.prophylaxis} />
        <ResultCard title="Terapéutica" value={result.therapeutic} />
      </div>
    </section>
  );
}

function MechanicalVentilationCalculator() {
  const [sex, setSex] = useState("M");
  const [height, setHeight] = useState("170");
  const [vt, setVt] = useState("420");
  const [rr, setRr] = useState("18");
  const [plateau, setPlateau] = useState("24");
  const [peep, setPeep] = useState("8");
  const [pao2, setPao2] = useState("80");
  const [fio2, setFio2] = useState("40");

  const result = useMemo(() => {
    const cm = toNumber(height);
const pbw =
  sex === "M"
    ? 50 + 0.91 * (cm - 152.4)
    : 45.5 + 0.91 * (cm - 152.4);
    const vt4 = pbw * 4;
    const vt6 = pbw * 6;
    const vt8 = pbw * 8;
    const tidalVolume = toNumber(vt);
    const respiratoryRate = toNumber(rr);
    const minuteVentilation = (tidalVolume * respiratoryRate) / 1000;
    const drivingPressure = toNumber(plateau) - toNumber(peep);
    const fractionInspiredOxygen = toNumber(fio2) > 1 ? toNumber(fio2) / 100 : toNumber(fio2);
    const pfRatio = fractionInspiredOxygen > 0 ? toNumber(pao2) / fractionInspiredOxygen : 0;

    let ardsSeverity = "Sin clasificar";
    if (pfRatio <= 100) ardsSeverity = "SDRA severo si PEEP ≥5";
    else if (pfRatio <= 200) ardsSeverity = "SDRA moderado si PEEP ≥5";
    else if (pfRatio <= 300) ardsSeverity = "SDRA leve si PEEP ≥5";
    else ardsSeverity = "Oxigenación conservada o sin SDRA por P/F";

    return {
      pbw,
      vt4,
      vt6,
      vt8,
      minuteVentilation,
      drivingPressure,
      pfRatio,
      ardsSeverity,
    };
  }, [sex, height, vt, rr, plateau, peep, pao2, fio2]);

  return (
    <section id="vmi" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Ventilación mecánica invasiva</h2>
        <p className="mt-1 text-sm text-slate-400">
          PBW, volumen tidal protector, ventilación minuto, driving pressure y relación P/F.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Sexo</span>
          <select
            value={sex}
            onChange={(event) => setSex(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </label>
        <Field label="Talla" value={height} onChange={setHeight} suffix="cm" />
        <Field label="VT actual" value={vt} onChange={setVt} suffix="ml" />
        <Field label="FR" value={rr} onChange={setRr} suffix="rpm" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Field label="Pplat" value={plateau} onChange={setPlateau} suffix="cmH2O" />
        <Field label="PEEP" value={peep} onChange={setPeep} suffix="cmH2O" />
        <Field label="PaO2" value={pao2} onChange={setPao2} suffix="mmHg" />
        <Field label="FiO2" value={fio2} onChange={setFio2} suffix="%" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <ResultCard title="PBW" value={`${round(result.pbw, 1)} kg`} />
        <ResultCard title="VT 4 ml/kg" value={`${round(result.vt4, 0)} ml`} />
        <ResultCard title="VT 6 ml/kg" value={`${round(result.vt6, 0)} ml`} />
        <ResultCard title="VT 8 ml/kg" value={`${round(result.vt8, 0)} ml`} />
        <ResultCard title="VM" value={`${round(result.minuteVentilation, 1)} L/min`} />
        <ResultCard title="DP" value={`${round(result.drivingPressure, 1)} cmH2O`} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ResultCard
          title="Relación P/F"
          value={`${round(result.pfRatio, 0)}`}
          helper="Usa FiO2 en porcentaje, por ejemplo 40 para 40%."
        />
        <ResultCard
          title="Interpretación"
          value={result.ardsSeverity}
          helper="Contextualizar con PEEP ≥5, infiltrados bilaterales, origen no cardiogénico y temporalidad clínica."
        />
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        En SDRA, prioriza VT protector 4–6 ml/kg de peso predicho, Pplat idealmente ≤30 cmH2O y driving pressure preferentemente ≤15 cmH2O, ajustando a gasometría, mecánica pulmonar y contexto hemodinámico.
      </div>
    </section>
  );
}

function QuickScores() {
  const [curbConfusion, setCurbConfusion] = useState(false);
  const [curbUrea, setCurbUrea] = useState(false);
  const [curbRr, setCurbRr] = useState(false);
  const [curbBp, setCurbBp] = useState(false);
  const [curbAge65, setCurbAge65] = useState(false);

  const [chadsChf, setChadsChf] = useState(false);
  const [chadsHtn, setChadsHtn] = useState(false);
  const [chadsAge75, setChadsAge75] = useState(false);
  const [chadsDm, setChadsDm] = useState(false);
  const [chadsStroke, setChadsStroke] = useState(false);
  const [chadsVascular, setChadsVascular] = useState(false);
  const [chadsAge65, setChadsAge65] = useState(false);
  const [chadsFemale, setChadsFemale] = useState(false);

  const [hasHtn, setHasHtn] = useState(false);
  const [hasRenal, setHasRenal] = useState(false);
  const [hasLiver, setHasLiver] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [hasBleed, setHasBleed] = useState(false);
  const [hasLabile, setHasLabile] = useState(false);
  const [hasElderly, setHasElderly] = useState(false);
  const [hasDrugs, setHasDrugs] = useState(false);
  const [hasAlcohol, setHasAlcohol] = useState(false);

  const [pesiAge, setPesiAge] = useState("65");
  const [pesiMale, setPesiMale] = useState(false);
  const [pesiCancer, setPesiCancer] = useState(false);
  const [pesiHeartFailure, setPesiHeartFailure] = useState(false);
  const [pesiChronicLung, setPesiChronicLung] = useState(false);
  const [pesiHr, setPesiHr] = useState(false);
  const [pesiSbp, setPesiSbp] = useState(false);
  const [pesiRr, setPesiRr] = useState(false);
  const [pesiTemp, setPesiTemp] = useState(false);
  const [pesiAltered, setPesiAltered] = useState(false);
  const [pesiO2, setPesiO2] = useState(false);

  const curb65 = [curbConfusion, curbUrea, curbRr, curbBp, curbAge65].filter(Boolean).length;
  const curbInterpretation =
    curb65 <= 1
      ? "Bajo riesgo"
      : curb65 === 2
        ? "Riesgo intermedio"
        : "Alto riesgo; valorar hospitalización/UTI según contexto";

  const chadsvasc =
    Number(chadsChf) +
    Number(chadsHtn) +
    Number(chadsAge75) * 2 +
    Number(chadsDm) +
    Number(chadsStroke) * 2 +
    Number(chadsVascular) +
    Number(chadsAge65) +
    Number(chadsFemale);
  const chadsInterpretation =
    chadsvasc === 0
      ? "Riesgo bajo"
      : chadsvasc === 1
        ? "Riesgo intermedio; individualizar"
        : "Riesgo elevado; valorar anticoagulación si no hay contraindicación";

  const hasBled =
    Number(hasHtn) +
    Number(hasRenal) +
    Number(hasLiver) +
    Number(hasStroke) +
    Number(hasBleed) +
    Number(hasLabile) +
    Number(hasElderly) +
    Number(hasDrugs) +
    Number(hasAlcohol);
  const hasInterpretation =
    hasBled >= 3
      ? "Riesgo alto de sangrado; corregir factores modificables"
      : "Riesgo no alto; vigilar según contexto";

  const pesiScore =
    toNumber(pesiAge) +
    Number(pesiMale) * 10 +
    Number(pesiCancer) * 30 +
    Number(pesiHeartFailure) * 10 +
    Number(pesiChronicLung) * 10 +
    Number(pesiHr) * 20 +
    Number(pesiSbp) * 30 +
    Number(pesiRr) * 20 +
    Number(pesiTemp) * 20 +
    Number(pesiAltered) * 60 +
    Number(pesiO2) * 20;

  const pesiClass =
    pesiScore <= 65
      ? "Clase I"
      : pesiScore <= 85
        ? "Clase II"
        : pesiScore <= 105
          ? "Clase III"
          : pesiScore <= 125
            ? "Clase IV"
            : "Clase V";

  const pesiInterpretation =
    pesiScore <= 65
      ? "Riesgo muy bajo, mortalidad aproximada ~1%."
      : pesiScore <= 85
        ? "Riesgo bajo."
        : pesiScore <= 105
          ? "Riesgo intermedio."
          : pesiScore <= 125
            ? "Riesgo alto."
            : "Riesgo muy alto; considerar vigilancia estrecha/UCI según contexto.";

  const ScoreCheck = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <label
      className={`cursor-pointer rounded-2xl border p-4 text-sm font-semibold transition ${
        checked
          ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
          : "border-white/10 bg-[#061527] text-slate-300 hover:bg-white/10"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mr-2"
      />
      {label}
    </label>
  );

  return (
    <section id="escalas" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Escalas rápidas</h2>
        <p className="mt-1 text-sm text-slate-400">
          Puntajes interactivos frecuentes para guardia, pase de visita y decisiones iniciales.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">CURB-65</h3>
              <p className="text-sm text-slate-400">Neumonía adquirida en la comunidad.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {curb65} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <ScoreCheck label="Confusión" checked={curbConfusion} onChange={setCurbConfusion} />
            <ScoreCheck label="Urea elevada" checked={curbUrea} onChange={setCurbUrea} />
            <ScoreCheck label="FR ≥30" checked={curbRr} onChange={setCurbRr} />
            <ScoreCheck label="TA baja" checked={curbBp} onChange={setCurbBp} />
            <ScoreCheck label="Edad ≥65" checked={curbAge65} onChange={setCurbAge65} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="CURB-65" value={`${curb65} punto(s)`} />
            <ResultCard title="Interpretación" value={curbInterpretation} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">CHA2DS2-VASc</h3>
              <p className="text-sm text-slate-400">Riesgo embólico en fibrilación auricular.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {chadsvasc} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <ScoreCheck label="IC" checked={chadsChf} onChange={setChadsChf} />
            <ScoreCheck label="HTA" checked={chadsHtn} onChange={setChadsHtn} />
            <ScoreCheck label="Edad ≥75 +2" checked={chadsAge75} onChange={setChadsAge75} />
            <ScoreCheck label="DM" checked={chadsDm} onChange={setChadsDm} />
            <ScoreCheck label="EVC/TIA +2" checked={chadsStroke} onChange={setChadsStroke} />
            <ScoreCheck label="Vascular" checked={chadsVascular} onChange={setChadsVascular} />
            <ScoreCheck label="Edad 65–74" checked={chadsAge65} onChange={setChadsAge65} />
            <ScoreCheck label="Sexo femenino" checked={chadsFemale} onChange={setChadsFemale} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="CHA2DS2-VASc" value={`${chadsvasc} punto(s)`} />
            <ResultCard title="Interpretación" value={chadsInterpretation} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">HAS-BLED</h3>
              <p className="text-sm text-slate-400">Riesgo de sangrado en anticoagulación.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {hasBled} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ScoreCheck label="HTA" checked={hasHtn} onChange={setHasHtn} />
            <ScoreCheck label="Renal" checked={hasRenal} onChange={setHasRenal} />
            <ScoreCheck label="Hepático" checked={hasLiver} onChange={setHasLiver} />
            <ScoreCheck label="EVC" checked={hasStroke} onChange={setHasStroke} />
            <ScoreCheck label="Sangrado" checked={hasBleed} onChange={setHasBleed} />
            <ScoreCheck label="INR lábil" checked={hasLabile} onChange={setHasLabile} />
            <ScoreCheck label="Edad >65" checked={hasElderly} onChange={setHasElderly} />
            <ScoreCheck label="Fármacos" checked={hasDrugs} onChange={setHasDrugs} />
            <ScoreCheck label="Alcohol" checked={hasAlcohol} onChange={setHasAlcohol} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="HAS-BLED" value={`${hasBled} punto(s)`} />
            <ResultCard title="Interpretación" value={hasInterpretation} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">PESI</h3>
              <p className="text-sm text-slate-400">
                Cálculo automático de riesgo en tromboembolia pulmonar.
              </p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {pesiScore} punto(s)
            </span>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Field label="Edad" value={pesiAge} onChange={setPesiAge} suffix="años" />
            <ScoreCheck label="Masculino +10" checked={pesiMale} onChange={setPesiMale} />
            <ScoreCheck label="Cáncer +30" checked={pesiCancer} onChange={setPesiCancer} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <ScoreCheck label="Insuficiencia cardiaca +10" checked={pesiHeartFailure} onChange={setPesiHeartFailure} />
            <ScoreCheck label="Enfermedad pulmonar crónica +10" checked={pesiChronicLung} onChange={setPesiChronicLung} />
            <ScoreCheck label="FC ≥110 +20" checked={pesiHr} onChange={setPesiHr} />
            <ScoreCheck label="PAS <100 +30" checked={pesiSbp} onChange={setPesiSbp} />
            <ScoreCheck label="FR ≥30 +20" checked={pesiRr} onChange={setPesiRr} />
            <ScoreCheck label="Temp <36°C +20" checked={pesiTemp} onChange={setPesiTemp} />
            <ScoreCheck label="Estado mental alterado +60" checked={pesiAltered} onChange={setPesiAltered} />
            <ScoreCheck label="SatO2 <90% +20" checked={pesiO2} onChange={setPesiO2} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="PESI" value={`${pesiScore} puntos · ${pesiClass}`} />
            <ResultCard title="Interpretación" value={pesiInterpretation} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CalcPage() {
  return (
    <main className="min-h-screen bg-[#071A2F] p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                SynapMed Calc
              </p>
              <h1 className="mt-2 text-4xl font-bold">Calculadoras automáticas</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Módulo práctico para guardia: infusiones, electrolitos, función renal,
                anticoagulación y escalas rápidas.
              </p>
            </div>

            <Link
              href="/"
              className="w-fit rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Volver al dashboard
            </Link>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#061527] p-2">
            {[
              ["Infusiones", "#infusiones"],
              ["Electrolitos", "#electrolitos"],
              ["Reposición", "#reposicion"],
              ["Renal/ACO", "#renal"],
              ["VMI", "#vmi"],
              ["Escalas", "#escalas"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Apoyo clínico para residentes. Ajusta siempre a protocolo local, contexto del paciente,
          metas clínicas, función renal y criterio médico.
        </section>

        <div className="space-y-6">
          <InfusionCalculator />
          <ElectrolyteCalculator />
          <ElectrolyteReplacementCalculator />
          <RenalAnticoagulationCalculator />
          <MechanicalVentilationCalculator />
          <QuickScores />
        </div>
      </div>
    </main>
  );
}
