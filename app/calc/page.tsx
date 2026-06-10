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
    const inchesOverFiveFeet = Math.max(0, cm / 2.54 - 60);
    const pbw =
      sex === "M"
        ? 50 + 2.3 * inchesOverFiveFeet
        : 45.5 + 2.3 * inchesOverFiveFeet;
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
  const [confusion, setConfusion] = useState(false);
  const [urea, setUrea] = useState(false);
  const [rr, setRr] = useState(false);
  const [bp, setBp] = useState(false);
  const [age65, setAge65] = useState(false);

  const curb65 = [confusion, urea, rr, bp, age65].filter(Boolean).length;
  const interpretation =
    curb65 <= 1
      ? "Bajo riesgo"
      : curb65 === 2
        ? "Riesgo intermedio"
        : "Alto riesgo; valorar hospitalización/UTI según contexto";

  const checks = [
    ["Confusión", confusion, setConfusion],
    ["Urea elevada", urea, setUrea],
    ["FR ≥30", rr, setRr],
    ["TA baja", bp, setBp],
    ["Edad ≥65", age65, setAge65],
  ] as const;

  return (
    <section id="escalas" className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Escalas rápidas</h2>
        <p className="mt-1 text-sm text-slate-400">CURB-65 interactivo para NAC.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {checks.map(([label, checked, setter]) => (
          <label
            key={label}
            className={`cursor-pointer rounded-2xl border p-4 text-sm font-semibold transition ${
              checked
                ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-[#061527] text-slate-300 hover:bg-white/10"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setter(event.target.checked)}
              className="mr-2"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ResultCard title="CURB-65" value={`${curb65} punto(s)`} />
        <ResultCard title="Interpretación" value={interpretation} />
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
          <RenalAnticoagulationCalculator />
          <MechanicalVentilationCalculator />
          <QuickScores />
        </div>
      </div>
    </main>
  );
}
