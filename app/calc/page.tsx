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
      <p className="mt-2 break-words text-2xl font-bold text-white md:text-3xl">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p> : null}
    </div>
  );
}

function ScoreCheck({
  label,
  checked,
  onChange,
  compact = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`cursor-pointer rounded-2xl border text-sm font-semibold transition ${
        compact ? "px-4 py-3" : "p-4"
      } ${
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
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
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
    <section id="infusiones" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
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
    <section id="electrolitos" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
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
    <section id="reposicion" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
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
  const [renalMode, setRenalMode] = useState<"ckd" | "aki">("ckd");

  const [age, setAge] = useState("65");
  const [creatinine, setCreatinine] = useState("1.2");
  const [sex, setSex] = useState("M");

  const [baselineCreatinine, setBaselineCreatinine] = useState("1.0");
  const [currentCreatinine, setCurrentCreatinine] = useState("1.5");
  const [urineOutput, setUrineOutput] = useState("0.6");
  const [oliguriaHours, setOliguriaHours] = useState("6");

  const ckdResult = useMemo(() => {
    const years = toNumber(age);
    const cr = toNumber(creatinine);
    const kappa = sex === "F" ? 0.7 : 0.9;
    const alpha = sex === "F" ? -0.241 : -0.302;

    const egfr =
      cr > 0
        ? 142 *
          Math.min(cr / kappa, 1) ** alpha *
          Math.max(cr / kappa, 1) ** -1.2 *
          0.9938 ** years *
          (sex === "F" ? 1.012 : 1)
        : 0;

    let kdigo = "ERC G1";
    if (egfr < 15) kdigo = "ERC G5";
    else if (egfr < 30) kdigo = "ERC G4";
    else if (egfr < 45) kdigo = "ERC G3b";
    else if (egfr < 60) kdigo = "ERC G3a";
    else if (egfr < 90) kdigo = "ERC G2";

    const prophylaxis = egfr < 30 ? "30 mg SC cada 24 h" : "40 mg SC cada 24 h";
    const therapeutic = egfr < 30 ? "1 mg/kg SC cada 24 h" : "1 mg/kg SC cada 12 h";

    return { egfr, kdigo, prophylaxis, therapeutic };
  }, [age, creatinine, sex]);

  const akiResult = useMemo(() => {
    const baseline = toNumber(baselineCreatinine);
    const current = toNumber(currentCreatinine);
    const uresis = toNumber(urineOutput);
    const hours = toNumber(oliguriaHours);

    const ratio = baseline > 0 ? current / baseline : 0;
    const absoluteRise = current - baseline;

    let stageByCreatinine = 0;
    if (current >= 4 || ratio >= 3) stageByCreatinine = 3;
    else if (ratio >= 2) stageByCreatinine = 2;
    else if (ratio >= 1.5 || absoluteRise >= 0.3) stageByCreatinine = 1;

    let stageByUrine = 0;
    if (uresis <= 0 && hours >= 12) stageByUrine = 3;
    else if (uresis < 0.3 && hours >= 24) stageByUrine = 3;
    else if (uresis < 0.5 && hours >= 12) stageByUrine = 2;
    else if (uresis < 0.5 && hours >= 6) stageByUrine = 1;

    const stage = Math.max(stageByCreatinine, stageByUrine);
    const label = stage === 0 ? "Sin criterios KDIGO" : `KDIGO ${stage}`;
    const interpretation =
      stage === 0
        ? "No cumple criterios con los datos ingresados; vigilar tendencia y contexto clínico."
        : stage === 1
          ? "DRA leve. Vigilar creatinina, diuresis, volemia y nefrotóxicos."
          : stage === 2
            ? "DRA moderada. Buscar causa, optimizar perfusión renal y vigilancia estrecha."
            : "DRA severa. Valorar complicaciones, urgencia dialítica e interconsulta a Nefrología.";

    return { ratio, absoluteRise, stage, stageByCreatinine, stageByUrine, label, interpretation };
  }, [baselineCreatinine, currentCreatinine, urineOutput, oliguriaHours]);

  return (
    <section id="renal" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Función renal</h2>
          <p className="mt-1 text-sm text-slate-400">
            Alterna entre CKD-EPI/KDIGO ERC para función renal crónica y KDIGO DRA para lesión renal aguda.
          </p>
        </div>

        <div className="flex rounded-2xl border border-white/10 bg-[#061527] p-1">
          <button
            type="button"
            onClick={() => setRenalMode("ckd")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              renalMode === "ckd"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            CKD-EPI / ACO
          </button>
          <button
            type="button"
            onClick={() => setRenalMode("aki")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              renalMode === "aki"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            KDIGO DRA
          </button>
        </div>
      </div>

      {renalMode === "ckd" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Edad" value={age} onChange={setAge} suffix="años" />
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

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ResultCard title="CKD-EPI" value={`${round(ckdResult.egfr, 1)} ml/min/1.73m²`} />
            <ResultCard title="KDIGO ERC" value={ckdResult.kdigo} />
            <ResultCard title="Profilaxis" value={ckdResult.prophylaxis} />
            <ResultCard title="Terapéutica" value={ckdResult.therapeutic} />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Cr basal" value={baselineCreatinine} onChange={setBaselineCreatinine} suffix="mg/dl" />
            <Field label="Cr actual" value={currentCreatinine} onChange={setCurrentCreatinine} suffix="mg/dl" />
            <Field label="Diuresis" value={urineOutput} onChange={setUrineOutput} suffix="ml/kg/h" />
            <Field label="Horas" value={oliguriaHours} onChange={setOliguriaHours} suffix="h" />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ResultCard title="Relación Cr" value={`${round(akiResult.ratio, 2)}x`} />
            <ResultCard title="Aumento absoluto" value={`${round(akiResult.absoluteRise, 2)} mg/dl`} />
            <ResultCard title="Estadio" value={akiResult.label} />
            <ResultCard title="Interpretación" value={akiResult.interpretation} />
          </div>

          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            Creatinina: KDIGO {akiResult.stageByCreatinine}. Diuresis: KDIGO {akiResult.stageByUrine}. Confirmar temporalidad, tendencia, volemia, nefrotóxicos, obstrucción, EGO/sedimento y contexto hemodinámico.
          </div>
        </>
      )}
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
    <section id="vmi" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
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
    <section id="escalas" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
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
  const calculatorSections = [
    ["Favoritos", "#favoritos"],
    ["Infusiones", "#infusiones"],
    ["Electrolitos", "#electrolitos"],
    ["Reposición", "#reposicion"],
    ["Renal/ACO", "#renal"],
    ["VMI", "#vmi"],
    ["Escalas", "#escalas"],
    ["Urgencias", "#urgencias"],
    ["UCI", "#uci-scores"],
    ["Cardiología", "#cardio-scores"],
    ["Gastro", "#gastro-scores"],
  ];
  const [calculatorSearch, setCalculatorSearch] = useState("");
  const normalizedSearch = calculatorSearch.trim().toLowerCase();

  function showCalculator(...terms: string[]) {
    if (!normalizedSearch) return true;
    return terms.some((term) => term.toLowerCase().includes(normalizedSearch));
  }

  const visibleCalculatorSections = calculatorSections.filter(([label]) =>
    showCalculator(label)
  );

  const hasVisibleCalculator = [
    showCalculator("favoritos guardia quick access accesos rapidos"),
    showCalculator("infusiones vasoactivos norepinefrina noradrenalina dobutamina dopamina adrenalina sedacion dexmedetomidina fentanilo propofol midazolam"),
    showCalculator("electrolitos sodio corregido na anion gap osmolaridad glucosa bun albumina"),
    showCalculator("reposicion electrolitos potasio kcl magnesio mgso4 fosforo kpo4"),
    showCalculator("renal funcion renal ckd epi kdigo erc dra creatinina diuresis enoxaparina anticoagulacion"),
    showCalculator("vmi ventilacion mecanica invasiva pbw peso predicho volumen tidal pplat peep fio2 pao2 pf driving pressure sdr a"),
    showCalculator("escalas curb chads hasbled pesi tromboembolia pulmonar fibrilacion neumonia anticoagulacion"),
    showCalculator("urgencias glasgow sirs asa calcio corregido"),
    showCalculator("uci news2 sofa psi apache sepsis neumonia cuidados intensivos"),
    showCalculator("cardiologia killip shock index rcri lee chads timi grace prevent riesgo cardiovascular"),
    showCalculator("gastro meld meld na child pugh cirrosis hepatopatia sangrado hepatico"),
  ].some(Boolean);
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
                Módulo práctico para guardia y pase de visita: infusiones, electrolitos, función renal, ventilación mecánica y escalas clínicas agrupadas por área.
              </p>
            </div>

            <Link
              href="/"
              className="w-fit rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Volver al dashboard
            </Link>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#061527] p-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                Buscar calculadora
              </span>
              <input
                type="search"
                value={calculatorSearch}
                onChange={(event) => setCalculatorSearch(event.target.value)}
                placeholder="Buscar: VMI, norepinefrina, KDIGO, PESI, potasio..."
                className="w-full rounded-2xl border border-white/10 bg-[#071A2F] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </label>
          </div>
      <nav aria-label="Navegación rápida de calculadoras" className="sticky top-3 z-20 mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#061527]/95 p-2 shadow-xl backdrop-blur lg:hidden">
        {visibleCalculatorSections.map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white focus:bg-cyan-400/10 focus:text-cyan-100 focus:outline-none"
          >
            {label}
          </a>
        ))}
      </nav>
        </header>

        <section className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Apoyo clínico para residentes. Las fórmulas y puntajes orientan decisiones, pero deben ajustarse a protocolo local, contexto del paciente, metas clínicas, función renal y criterio médico.
        </section>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                Categorías
              </p>
              <nav aria-label="Categorías de calculadoras" className="space-y-1">
                {visibleCalculatorSections.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    aria-label={`Ir a ${label}`}
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white focus:bg-cyan-400/10 focus:text-cyan-100 focus:outline-none"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-8 scroll-smooth">
            {!hasVisibleCalculator ? (
              <section className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-6 text-amber-100">
                <h2 className="text-xl font-bold">Sin resultados</h2>
                <p className="mt-2 text-sm leading-6">
                  No encontré calculadoras con ese término. Prueba con VMI, KDIGO, electrolitos, PESI, norepinefrina, NEWS2, SOFA, TIMI o MELD.
                </p>
              </section>
            ) : null}
            {showCalculator("favoritos guardia quick access accesos rapidos") ? (
            <section id="favoritos" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
              <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Favoritos de guardia</h2>
                  <p className="text-sm text-slate-400">
                    Accesos rápidos a las calculadoras que más se usan en piso, urgencias y UCI.
                  </p>
                </div>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
                  Quick access
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Norepinefrina / infusiones", "#infusiones"],
                  ["Na corregido / AG / Osm", "#electrolitos"],
                  ["CKD-EPI / KDIGO ERC", "#renal"],
                  ["PBW / P-F / VMI", "#vmi"],
                  ["Glasgow / SIRS / ASA", "#urgencias"],
                  ["NEWS2 / SOFA", "#uci-scores"],
                  ["TIMI / GRACE / PREVENT", "#cardio-scores"],
                  ["MELD-Na / Child-Pugh", "#gastro-scores"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-4 text-sm font-bold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/20 focus:border-cyan-300/60 focus:outline-none"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </section>
            ) : null}
            {showCalculator("infusiones vasoactivos norepinefrina noradrenalina dobutamina dopamina adrenalina sedacion dexmedetomidina fentanilo propofol midazolam") ? <InfusionCalculator /> : null}
            {showCalculator("electrolitos sodio corregido na anion gap osmolaridad glucosa bun albumina") ? <ElectrolyteCalculator /> : null}
            {showCalculator("reposicion electrolitos potasio kcl magnesio mgso4 fosforo kpo4") ? <ElectrolyteReplacementCalculator /> : null}
            {showCalculator("renal funcion renal ckd epi kdigo erc dra creatinina diuresis enoxaparina anticoagulacion") ? <RenalAnticoagulationCalculator /> : null}
            {showCalculator("vmi ventilacion mecanica invasiva pbw peso predicho volumen tidal pplat peep fio2 pao2 pf driving pressure sdr a") ? <MechanicalVentilationCalculator /> : null}
            {showCalculator("escalas curb chads hasbled pesi tromboembolia pulmonar fibrilacion neumonia anticoagulacion") ? <QuickScores /> : null}
            {showCalculator("urgencias glasgow sirs asa calcio corregido") ? <UrgencyScoresCalculator /> : null}
            {showCalculator("uci news2 sofa psi apache sepsis neumonia cuidados intensivos") ? <IcuScoresCalculator /> : null}
            {showCalculator("cardiologia killip shock index rcri lee chads timi grace prevent riesgo cardiovascular") ? <CardiologyScoresCalculator /> : null}
            {showCalculator("gastro meld meld na child pugh cirrosis hepatopatia sangrado hepatico") ? <GastroScoresCalculator /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function UrgencyScoresCalculator() {
  // Glasgow
  const [glasgowEye, setGlasgowEye] = useState("4");
  const [glasgowVerbal, setGlasgowVerbal] = useState("5");
  const [glasgowMotor, setGlasgowMotor] = useState("6");
  const glasgowTotal = useMemo(() => {
    return (
      toNumber(glasgowEye) +
      toNumber(glasgowVerbal) +
      toNumber(glasgowMotor)
    );
  }, [glasgowEye, glasgowVerbal, glasgowMotor]);
  const glasgowInterp =
    glasgowTotal <= 8
      ? "Grave (≤8)"
      : glasgowTotal <= 12
      ? "Moderado (9-12)"
      : "Leve (13-15)";

  // SIRS
  const [sirsTemp, setSirsTemp] = useState(false);
  const [sirsFc, setSirsFc] = useState(false);
  const [sirsFr, setSirsFr] = useState(false);
  const [sirsLeucos, setSirsLeucos] = useState(false);
  const sirsScore = [sirsTemp, sirsFc, sirsFr, sirsLeucos].filter(Boolean).length;
  const sirsInterp =
    sirsScore >= 2 ? "Cumple criterios SIRS (≥2)" : "No cumple SIRS (<2)";

  // ASA
  const [asa, setAsa] = useState("I");
  const [asaUrgent, setAsaUrgent] = useState(false);
  const asaDisplay = asa + (asaUrgent ? "-E" : "");

  // Calcio corregido
  const [calciumTotal, setCalciumTotal] = useState("8.0");
  const [albumin, setAlbumin] = useState("3.0");
  const calcioCorr = useMemo(() => {
    const ca = toNumber(calciumTotal);
    const alb = toNumber(albumin);
    return ca + 0.8 * (4 - alb);
  }, [calciumTotal, albumin]);
  let calcioInterp = "";
  if (calcioCorr < 8.5) calcioInterp = "Hipocalcemia";
  else if (calcioCorr > 10.5) calcioInterp = "Hipercalcemia";
  else calcioInterp = "Normal";

  // Checkbox style
  function ScoreCheck({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }) {
    return (
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
          onChange={(e) => onChange(e.target.checked)}
          className="mr-2"
        />
        {label}
      </label>
    );
  }

  return (
    <section
      id="urgencias"
      className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl"
    >
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Urgencias</h2>
        <p className="mt-1 text-sm text-slate-400">
          Escalas clave para valoración inicial y urgencias: Glasgow, SIRS, ASA y calcio corregido.
        </p>
      </div>
      <div className="space-y-6">
        {/* Glasgow */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">Glasgow</h3>
              <p className="text-sm text-slate-400">
                Escala de coma de Glasgow (E+V+M).
              </p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {glasgowTotal} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Ocular
              </span>
              <select
                value={glasgowEye}
                onChange={e => setGlasgowEye(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                <option value="4">4 Espontánea</option>
                <option value="3">3 Al habla</option>
                <option value="2">2 Al dolor</option>
                <option value="1">1 Ninguna</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Verbal
              </span>
              <select
                value={glasgowVerbal}
                onChange={e => setGlasgowVerbal(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                <option value="5">5 Orientado</option>
                <option value="4">4 Confuso</option>
                <option value="3">3 Palabras inapropiadas</option>
                <option value="2">2 Sonidos incomprensibles</option>
                <option value="1">1 Ninguna</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                Motora
              </span>
              <select
                value={glasgowMotor}
                onChange={e => setGlasgowMotor(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                <option value="6">6 Obedece órdenes</option>
                <option value="5">5 Localiza dolor</option>
                <option value="4">4 Retira al dolor</option>
                <option value="3">3 Flexión anormal</option>
                <option value="2">2 Extensión anormal</option>
                <option value="1">1 Ninguna</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="Total" value={`${glasgowTotal} punto(s)`} />
            <ResultCard title="Interpretación" value={glasgowInterp} />
          </div>
        </div>
        {/* SIRS */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">SIRS</h3>
              <p className="text-sm text-slate-400">
                Criterios de respuesta inflamatoria sistémica.
              </p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {sirsScore} criterio(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <ScoreCheck label="Temperatura anormal" checked={sirsTemp} onChange={setSirsTemp} />
            <ScoreCheck label="FC &gt;90" checked={sirsFc} onChange={setSirsFc} />
            <ScoreCheck label="FR &gt;20 o PaCO₂ &lt;32" checked={sirsFr} onChange={setSirsFr} />
            <ScoreCheck label="Leucos anormales" checked={sirsLeucos} onChange={setSirsLeucos} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="SIRS" value={`${sirsScore} criterio(s)`} />
            <ResultCard title="Interpretación" value={sirsInterp} />
          </div>
        </div>
        {/* ASA */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">ASA</h3>
              <p className="text-sm text-slate-400">
                Clasificación de riesgo anestésico (ASA).
              </p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {asaDisplay}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                ASA
              </span>
              <select
                value={asa}
                onChange={e => setAsa(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
                <option value="V">V</option>
                <option value="VI">VI</option>
              </select>
            </label>
            <label
              className={`flex cursor-pointer items-center rounded-2xl border p-4 text-sm font-semibold transition ${
                asaUrgent
                  ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-[#061527] text-slate-300 hover:bg-white/10"
              }`}
            >
              <input
                type="checkbox"
                checked={asaUrgent}
                onChange={e => setAsaUrgent(e.target.checked)}
                className="mr-2"
              />
              Cirugía de urgencia
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="ASA" value={asaDisplay} />
          </div>
        </div>
        {/* Calcio corregido */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">Calcio corregido</h3>
              <p className="text-sm text-slate-400">
                Corrección por albúmina: Ca corregido = Ca + 0.8 × (4 - albúmina)
              </p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {round(calcioCorr, 2)} mg/dl
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Ca total" value={calciumTotal} onChange={setCalciumTotal} suffix="mg/dl" />
            <Field label="Albúmina" value={albumin} onChange={setAlbumin} suffix="g/dl" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="Ca corregido" value={`${round(calcioCorr, 2)} mg/dl`} />
            <ResultCard title="Interpretación" value={calcioInterp} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CardiologyScoresCalculator() {
  const [killip, setKillip] = useState("I");

  const [shockHr, setShockHr] = useState("90");
  const [shockSbp, setShockSbp] = useState("120");

  const [rcriHighRisk, setRcriHighRisk] = useState(false);
  const [rcriCad, setRcriCad] = useState(false);
  const [rcriChf, setRcriChf] = useState(false);
  const [rcriCva, setRcriCva] = useState(false);
  const [rcriInsulin, setRcriInsulin] = useState(false);
  const [rcriCr, setRcriCr] = useState(false);

  const [chads2Chf, setChads2Chf] = useState(false);
  const [chads2Htn, setChads2Htn] = useState(false);
  const [chads2Age, setChads2Age] = useState(false);
  const [chads2Dm, setChads2Dm] = useState(false);
  const [chads2Stroke, setChads2Stroke] = useState(false);

  const [timiNstemiAge, setTimiNstemiAge] = useState(false);
  const [timiNstemiRiskFactors, setTimiNstemiRiskFactors] = useState(false);
  const [timiNstemiCad, setTimiNstemiCad] = useState(false);
  const [timiNstemiAspirin, setTimiNstemiAspirin] = useState(false);
  const [timiNstemiAngina, setTimiNstemiAngina] = useState(false);
  const [timiNstemiSt, setTimiNstemiSt] = useState(false);
  const [timiNstemiMarkers, setTimiNstemiMarkers] = useState(false);

  const [timiStemiAge, setTimiStemiAge] = useState("0");
  const [timiStemiDmHtnAngina, setTimiStemiDmHtnAngina] = useState(false);
  const [timiStemiSbp, setTimiStemiSbp] = useState(false);
  const [timiStemiHr, setTimiStemiHr] = useState(false);
  const [timiStemiKillip, setTimiStemiKillip] = useState(false);
  const [timiStemiWeight, setTimiStemiWeight] = useState(false);
  const [timiStemiAnteriorLbbb, setTimiStemiAnteriorLbbb] = useState(false);
  const [timiStemiDelay, setTimiStemiDelay] = useState(false);

  const [graceAge, setGraceAge] = useState("65");
  const [graceHr, setGraceHr] = useState("90");
  const [graceSbp, setGraceSbp] = useState("120");
  const [graceCr, setGraceCr] = useState("1.0");
  const [graceKillip, setGraceKillip] = useState("I");
  const [graceArrest, setGraceArrest] = useState(false);
  const [graceSt, setGraceSt] = useState(false);
  const [graceTroponin, setGraceTroponin] = useState(false);
  // PREVENT state variables
  const [preventAge, setPreventAge] = useState("55");
  const [preventSex, setPreventSex] = useState("male");
  const [preventSbp, setPreventSbp] = useState("120");
  const [preventTotalChol, setPreventTotalChol] = useState("180");
  const [preventHdl, setPreventHdl] = useState("50");
  const [preventEgfr, setPreventEgfr] = useState("90");
  const [preventDiabetes, setPreventDiabetes] = useState(false);
  const [preventSmoker, setPreventSmoker] = useState(false);
  const [preventBpTreatment, setPreventBpTreatment] = useState(false);
  const [preventStatin, setPreventStatin] = useState(false);

  const shockIndex = useMemo(() => {
    const hr = toNumber(shockHr);
    const sbp = toNumber(shockSbp);
    return sbp > 0 ? hr / sbp : 0;
  }, [shockHr, shockSbp]);

  const shockInterpretation =
    shockIndex >= 1
      ? "Alto riesgo / choque probable"
      : shockIndex >= 0.7
        ? "Riesgo intermedio"
        : "Bajo riesgo hemodinámico";

  const rcri = [rcriHighRisk, rcriCad, rcriChf, rcriCva, rcriInsulin, rcriCr].filter(Boolean).length;

  const rcriRisk =
    rcri === 0
      ? "Riesgo bajo"
      : rcri === 1
        ? "Riesgo intermedio"
        : rcri === 2
          ? "Riesgo elevado"
          : "Riesgo alto";

  const chads2 =
    Number(chads2Chf) +
    Number(chads2Htn) +
    Number(chads2Age) +
    Number(chads2Dm) +
    Number(chads2Stroke) * 2;

  const chads2Risk = chads2 === 0 ? "Bajo" : chads2 === 1 ? "Intermedio" : "Alto";

  const timiNstemi = [
    timiNstemiAge,
    timiNstemiRiskFactors,
    timiNstemiCad,
    timiNstemiAspirin,
    timiNstemiAngina,
    timiNstemiSt,
    timiNstemiMarkers,
  ].filter(Boolean).length;

  const timiNstemiRisk = timiNstemi <= 2 ? "Bajo" : timiNstemi <= 4 ? "Intermedio" : "Alto";

  const timiStemi =
    toNumber(timiStemiAge) +
    Number(timiStemiDmHtnAngina) +
    Number(timiStemiSbp) * 3 +
    Number(timiStemiHr) * 2 +
    Number(timiStemiKillip) * 2 +
    Number(timiStemiWeight) +
    Number(timiStemiAnteriorLbbb) +
    Number(timiStemiDelay);

  const timiStemiRisk = timiStemi <= 2 ? "Bajo" : timiStemi <= 5 ? "Intermedio" : "Alto";

  const grace = useMemo(() => {
    const age = toNumber(graceAge);
    const hr = toNumber(graceHr);
    const sbp = toNumber(graceSbp);
    const cr = toNumber(graceCr);

    const agePts = age >= 90 ? 100 : age >= 80 ? 91 : age >= 70 ? 73 : age >= 60 ? 55 : age >= 50 ? 36 : age >= 40 ? 18 : 0;
    const hrPts = hr >= 200 ? 46 : hr >= 150 ? 43 : hr >= 110 ? 23 : hr >= 70 ? 9 : hr >= 50 ? 3 : 0;
    const sbpPts = sbp < 80 ? 63 : sbp < 100 ? 58 : sbp < 120 ? 47 : sbp < 140 ? 37 : sbp < 160 ? 26 : sbp < 200 ? 11 : 0;
    const crPts = cr >= 4 ? 28 : cr >= 2 ? 21 : cr >= 1.6 ? 13 : cr >= 1.2 ? 10 : cr >= 0.8 ? 4 : 1;
    const killipPts = graceKillip === "IV" ? 59 : graceKillip === "III" ? 39 : graceKillip === "II" ? 20 : 0;
    const arrestPts = graceArrest ? 39 : 0;
    const stPts = graceSt ? 28 : 0;
    const tropPts = graceTroponin ? 14 : 0;
    const total = agePts + hrPts + sbpPts + crPts + killipPts + arrestPts + stPts + tropPts;
    const risk = total < 109 ? "Bajo" : total <= 140 ? "Intermedio" : "Alto";
    return { total, risk };
  }, [graceAge, graceHr, graceSbp, graceCr, graceKillip, graceArrest, graceSt, graceTroponin]);

  // PREVENT-style risk estimator
  const prevent = useMemo(() => {
    let score = 0;
    const age = toNumber(preventAge);
    // Age points
    if (age < 40) score += 0;
    else if (age < 50) score += 2;
    else if (age < 60) score += 4;
    else if (age < 70) score += 6;
    else score += 8;
    // SBP points
    const sbp = toNumber(preventSbp);
    if (sbp < 120) score += 0;
    else if (sbp < 140) score += 1;
    else if (sbp < 160) score += 2;
    else score += 3;
    // Total cholesterol
    const chol = toNumber(preventTotalChol);
    if (chol >= 240) score += 2;
    else if (chol >= 200) score += 1;
    // HDL
    const hdl = toNumber(preventHdl);
    if (hdl < 40) score += 2;
    else if (hdl < 50) score += 1;
    // eGFR
    const egfr = toNumber(preventEgfr);
    if (egfr < 45) score += 2;
    else if (egfr < 60) score += 1;
    // Diabetes
    if (preventDiabetes) score += 3;
    // Smoker
    if (preventSmoker) score += 3;
    // BP treatment
    if (preventBpTreatment) score += 1;
    // No statin
    if (!preventStatin) score += 1;
    // Map score to 10-year risk
    let risk10 = 3;
    if (score <= 3) risk10 = 3;
    else if (score <= 6) risk10 = 6;
    else if (score <= 9) risk10 = 12;
    else if (score <= 12) risk10 = 20;
    else risk10 = 30;
    // 30-year risk
    let risk30 = Math.min(risk10 * 2.5, 60);
    // Category
    let category = "";
    if (risk10 < 5) category = "Bajo";
    else if (risk10 < 10) category = "Limítrofe";
    else if (risk10 < 20) category = "Intermedio";
    else category = "Alto";
    return { score, risk10, risk30, category };
  }, [
    preventAge,
    preventSex,
    preventSbp,
    preventTotalChol,
    preventHdl,
    preventEgfr,
    preventDiabetes,
    preventSmoker,
    preventBpTreatment,
    preventStatin,
  ]);

  const killipDescription =
    killip === "I"
      ? "Sin datos de insuficiencia cardiaca"
      : killip === "II"
        ? "Estertores/S3/ingurgitación yugular"
        : killip === "III"
          ? "Edema agudo pulmonar"
          : "Choque cardiogénico";

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
    <section id="cardio-scores" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Cardiología</h2>
        <p className="mt-1 text-sm text-slate-400">
          Killip-Kimball, Shock Index, RCRI/Lee, CHADS2, TIMI NSTEMI/STEMI y GRACE.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">Killip-Kimball</h3>
              <p className="text-sm text-slate-400">Clasificación clínica en síndrome coronario agudo.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">Killip {killip}</span>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">Clase</span>
            <select value={killip} onChange={(event) => setKillip(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60">
              <option value="I">I: sin insuficiencia cardiaca</option>
              <option value="II">II: estertores/S3/ingurgitación yugular</option>
              <option value="III">III: edema agudo pulmonar</option>
              <option value="IV">IV: choque cardiogénico</option>
            </select>
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="Killip" value={`Clase ${killip}`} />
            <ResultCard title="Interpretación" value={killipDescription} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-xl font-bold text-cyan-300">Shock Index</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="FC" value={shockHr} onChange={setShockHr} suffix="lpm" />
            <Field label="TAS" value={shockSbp} onChange={setShockSbp} suffix="mmHg" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="Shock Index" value={`${round(shockIndex, 2)}`} />
            <ResultCard title="Interpretación" value={shockInterpretation} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-xl font-bold text-cyan-300">RCRI / Lee</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <ScoreCheck label="Cirugía de alto riesgo" checked={rcriHighRisk} onChange={setRcriHighRisk} />
            <ScoreCheck label="Cardiopatía isquémica" checked={rcriCad} onChange={setRcriCad} />
            <ScoreCheck label="Insuficiencia cardiaca" checked={rcriChf} onChange={setRcriChf} />
            <ScoreCheck label="EVC/TIA" checked={rcriCva} onChange={setRcriCva} />
            <ScoreCheck label="DM con insulina" checked={rcriInsulin} onChange={setRcriInsulin} />
            <ScoreCheck label="Creatinina >2 mg/dl" checked={rcriCr} onChange={setRcriCr} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="RCRI" value={`${rcri} punto(s)`} />
            <ResultCard title="Interpretación" value={rcriRisk} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-xl font-bold text-cyan-300">CHADS2</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <ScoreCheck label="IC" checked={chads2Chf} onChange={setChads2Chf} />
            <ScoreCheck label="HTA" checked={chads2Htn} onChange={setChads2Htn} />
            <ScoreCheck label="Edad ≥75" checked={chads2Age} onChange={setChads2Age} />
            <ScoreCheck label="DM" checked={chads2Dm} onChange={setChads2Dm} />
            <ScoreCheck label="EVC/TIA +2" checked={chads2Stroke} onChange={setChads2Stroke} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="CHADS2" value={`${chads2} punto(s)`} />
            <ResultCard title="Riesgo" value={chads2Risk} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-xl font-bold text-cyan-300">TIMI NSTEMI / Angina inestable</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <ScoreCheck label="Edad ≥65 años" checked={timiNstemiAge} onChange={setTimiNstemiAge} />
            <ScoreCheck label="≥3 factores de riesgo CAD" checked={timiNstemiRiskFactors} onChange={setTimiNstemiRiskFactors} />
            <ScoreCheck label="Estenosis coronaria conocida ≥50%" checked={timiNstemiCad} onChange={setTimiNstemiCad} />
            <ScoreCheck label="AAS en últimos 7 días" checked={timiNstemiAspirin} onChange={setTimiNstemiAspirin} />
            <ScoreCheck label="≥2 episodios angina/24 h" checked={timiNstemiAngina} onChange={setTimiNstemiAngina} />
            <ScoreCheck label="Desviación ST" checked={timiNstemiSt} onChange={setTimiNstemiSt} />
            <ScoreCheck label="Marcadores positivos" checked={timiNstemiMarkers} onChange={setTimiNstemiMarkers} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="TIMI NSTEMI" value={`${timiNstemi} punto(s)`} />
            <ResultCard title="Riesgo" value={timiNstemiRisk} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-xl font-bold text-cyan-300">TIMI STEMI</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Edad</span>
              <select value={timiStemiAge} onChange={(event) => setTimiStemiAge(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60">
                <option value="0">Menor de 65 años</option>
                <option value="2">65–74 años</option>
                <option value="3">≥75 años</option>
              </select>
            </label>
            <ScoreCheck label="DM/HTA/angina" checked={timiStemiDmHtnAngina} onChange={setTimiStemiDmHtnAngina} />
            <ScoreCheck label="TAS <100" checked={timiStemiSbp} onChange={setTimiStemiSbp} />
            <ScoreCheck label="FC >100" checked={timiStemiHr} onChange={setTimiStemiHr} />
            <ScoreCheck label="Killip II–IV" checked={timiStemiKillip} onChange={setTimiStemiKillip} />
            <ScoreCheck label="Peso <67 kg" checked={timiStemiWeight} onChange={setTimiStemiWeight} />
            <ScoreCheck label="IAM anterior o BRIHH" checked={timiStemiAnteriorLbbb} onChange={setTimiStemiAnteriorLbbb} />
            <ScoreCheck label="Tratamiento >4 h" checked={timiStemiDelay} onChange={setTimiStemiDelay} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="TIMI STEMI" value={`${timiStemi} punto(s)`} />
            <ResultCard title="Riesgo" value={timiStemiRisk} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-xl font-bold text-cyan-300">GRACE</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Edad" value={graceAge} onChange={setGraceAge} suffix="años" />
            <Field label="FC" value={graceHr} onChange={setGraceHr} suffix="lpm" />
            <Field label="TAS" value={graceSbp} onChange={setGraceSbp} suffix="mmHg" />
            <Field label="Creatinina" value={graceCr} onChange={setGraceCr} suffix="mg/dl" />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Killip</span>
              <select value={graceKillip} onChange={(event) => setGraceKillip(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60">
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </label>
            <ScoreCheck label="Paro al ingreso" checked={graceArrest} onChange={setGraceArrest} />
            <ScoreCheck label="Desviación ST" checked={graceSt} onChange={setGraceSt} />
            <ScoreCheck label="Troponina positiva" checked={graceTroponin} onChange={setGraceTroponin} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="GRACE" value={`${grace.total} punto(s)`} helper="Estimación práctica por rangos; validar con calculadora oficial si se requiere precisión fina." />
            <ResultCard title="Riesgo" value={grace.risk} />
          </div>
        </div>
      </div>
      {/* PREVENT (AHA 2024) */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 mt-6">
        <h3 className="mb-4 text-xl font-bold text-cyan-300">PREVENT (AHA 2024)</h3>
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="Edad" value={preventAge} onChange={setPreventAge} suffix="años" />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">Sexo</span>
            <select
              value={preventSex}
              onChange={(event) => setPreventSex(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
            >
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </label>
          <Field label="PAS" value={preventSbp} onChange={setPreventSbp} suffix="mmHg" />
          <Field label="Colesterol total" value={preventTotalChol} onChange={setPreventTotalChol} suffix="mg/dl" />
          <Field label="HDL" value={preventHdl} onChange={setPreventHdl} suffix="mg/dl" />
          <Field label="eGFR" value={preventEgfr} onChange={setPreventEgfr} suffix="ml/min" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <ScoreCheck label="Diabetes" checked={preventDiabetes} onChange={setPreventDiabetes} />
          <ScoreCheck label="Tabaquismo" checked={preventSmoker} onChange={setPreventSmoker} />
          <ScoreCheck label="Tratamiento antihipertensivo" checked={preventBpTreatment} onChange={setPreventBpTreatment} />
          <ScoreCheck label="Uso de estatina" checked={preventStatin} onChange={setPreventStatin} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <ResultCard title="PREVENT Score" value={`${prevent.score} punto(s)`} />
          <ResultCard title="Riesgo 10 años" value={`${prevent.risk10}%`} />
          <ResultCard title="Riesgo 30 años" value={`${prevent.risk30}%`} />
          <ResultCard title="Categoría" value={prevent.category} />
        </div>
      </div>
    </section>
  );
}

function IcuScoresCalculator() {
  const [newsRr, setNewsRr] = useState("18");
  const [newsSpo2, setNewsSpo2] = useState("96");
  const [newsO2, setNewsO2] = useState(false);
  const [newsTemp, setNewsTemp] = useState("36.8");
  const [newsSbp, setNewsSbp] = useState("120");
  const [newsHr, setNewsHr] = useState("80");
  const [newsAvpu, setNewsAvpu] = useState("A");

  const [sofaPf, setSofaPf] = useState("300");
  const [sofaPlatelets, setSofaPlatelets] = useState("200");
  const [sofaBilirubin, setSofaBilirubin] = useState("0.8");
  const [sofaCardio, setSofaCardio] = useState("0");
  const [sofaGcs, setSofaGcs] = useState("15");
  const [sofaCreatinine, setSofaCreatinine] = useState("1.0");

  const [psiAge, setPsiAge] = useState("65");
  const [psiMale, setPsiMale] = useState(true);
  const [psiNursing, setPsiNursing] = useState(false);
  const [psiCancer, setPsiCancer] = useState(false);
  const [psiLiver, setPsiLiver] = useState(false);
  const [psiChf, setPsiChf] = useState(false);
  const [psiCva, setPsiCva] = useState(false);
  const [psiRenal, setPsiRenal] = useState(false);
  const [psiMental, setPsiMental] = useState(false);
  const [psiRr, setPsiRr] = useState(false);
  const [psiSbp, setPsiSbp] = useState(false);
  const [psiTemp, setPsiTemp] = useState(false);
  const [psiHr, setPsiHr] = useState(false);
  const [psiPh, setPsiPh] = useState(false);
  const [psiBun, setPsiBun] = useState(false);
  const [psiNa, setPsiNa] = useState(false);
  const [psiGlu, setPsiGlu] = useState(false);
  const [psiHto, setPsiHto] = useState(false);
  const [psiO2, setPsiO2] = useState(false);
  const [psiEffusion, setPsiEffusion] = useState(false);

  const [apacheAge, setApacheAge] = useState("65");
  const [apacheTemp, setApacheTemp] = useState("37");
  const [apacheMap, setApacheMap] = useState("80");
  const [apacheHr, setApacheHr] = useState("90");
  const [apacheRr, setApacheRr] = useState("18");
  const [apacheNa, setApacheNa] = useState("140");
  const [apacheK, setApacheK] = useState("4");
  const [apacheCr, setApacheCr] = useState("1");
  const [apacheHto, setApacheHto] = useState("40");
  const [apacheWbc, setApacheWbc] = useState("10");
  const [apacheGcs, setApacheGcs] = useState("15");
  const [apacheChronic, setApacheChronic] = useState(false);

  const ScoreCheck = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
    <label
      className={`cursor-pointer rounded-2xl border p-4 text-sm font-semibold transition ${
        checked
          ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
          : "border-white/10 bg-[#061527] text-slate-300 hover:bg-white/10"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mr-2" />
      {label}
    </label>
  );

  const news2 = useMemo(() => {
    const rr = toNumber(newsRr);
    const spo2 = toNumber(newsSpo2);
    const temp = toNumber(newsTemp);
    const sbp = toNumber(newsSbp);
    const hr = toNumber(newsHr);
    let score = 0;
    score += rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
    score += spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
    score += newsO2 ? 2 : 0;
    score += temp <= 35 ? 3 : temp <= 36 ? 1 : temp <= 38 ? 0 : temp <= 39 ? 1 : 2;
    score += sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
    score += hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
    score += newsAvpu === "A" ? 0 : 3;
    const risk = score >= 7 ? "Alto" : score >= 5 ? "Medio" : score >= 1 ? "Bajo" : "Sin alarma";
    return { score, risk };
  }, [newsRr, newsSpo2, newsO2, newsTemp, newsSbp, newsHr, newsAvpu]);

  const sofa = useMemo(() => {
    const pf = toNumber(sofaPf);
    const platelets = toNumber(sofaPlatelets);
    const bilirubin = toNumber(sofaBilirubin);
    const cardio = Math.min(Math.max(Math.round(toNumber(sofaCardio)), 0), 4);
    const gcs = toNumber(sofaGcs);
    const cr = toNumber(sofaCreatinine);
    const resp = pf < 100 ? 4 : pf < 200 ? 3 : pf < 300 ? 2 : pf < 400 ? 1 : 0;
    const coag = platelets < 20 ? 4 : platelets < 50 ? 3 : platelets < 100 ? 2 : platelets < 150 ? 1 : 0;
    const liver = bilirubin >= 12 ? 4 : bilirubin >= 6 ? 3 : bilirubin >= 2 ? 2 : bilirubin >= 1.2 ? 1 : 0;
    const neuro = gcs < 6 ? 4 : gcs < 10 ? 3 : gcs < 13 ? 2 : gcs < 15 ? 1 : 0;
    const renal = cr >= 5 ? 4 : cr >= 3.5 ? 3 : cr >= 2 ? 2 : cr >= 1.2 ? 1 : 0;
    const score = resp + coag + liver + cardio + neuro + renal;
    return { score, resp, coag, liver, cardio, neuro, renal };
  }, [sofaPf, sofaPlatelets, sofaBilirubin, sofaCardio, sofaGcs, sofaCreatinine]);

  const psiScore =
    toNumber(psiAge) -
    (psiMale ? 0 : 10) +
    Number(psiNursing) * 10 +
    Number(psiCancer) * 30 +
    Number(psiLiver) * 20 +
    Number(psiChf) * 10 +
    Number(psiCva) * 10 +
    Number(psiRenal) * 10 +
    Number(psiMental) * 20 +
    Number(psiRr) * 20 +
    Number(psiSbp) * 20 +
    Number(psiTemp) * 15 +
    Number(psiHr) * 10 +
    Number(psiPh) * 30 +
    Number(psiBun) * 20 +
    Number(psiNa) * 20 +
    Number(psiGlu) * 10 +
    Number(psiHto) * 10 +
    Number(psiO2) * 10 +
    Number(psiEffusion) * 10;
  const psiClass = psiScore <= 70 ? "Clase II" : psiScore <= 90 ? "Clase III" : psiScore <= 130 ? "Clase IV" : "Clase V";

  const apache = useMemo(() => {
    const age = toNumber(apacheAge);
    const temp = toNumber(apacheTemp);
    const map = toNumber(apacheMap);
    const hr = toNumber(apacheHr);
    const rr = toNumber(apacheRr);
    const na = toNumber(apacheNa);
    const k = toNumber(apacheK);
    const cr = toNumber(apacheCr);
    const hto = toNumber(apacheHto);
    const wbc = toNumber(apacheWbc);
    const gcs = toNumber(apacheGcs);
    const agePts = age >= 75 ? 6 : age >= 65 ? 5 : age >= 55 ? 3 : age >= 45 ? 2 : 0;
    const tempPts = temp >= 41 ? 4 : temp >= 39 ? 3 : temp >= 38.5 ? 1 : temp >= 36 ? 0 : temp >= 34 ? 1 : temp >= 32 ? 2 : temp >= 30 ? 3 : 4;
    const mapPts = map >= 160 ? 4 : map >= 130 ? 3 : map >= 110 ? 2 : map >= 70 ? 0 : map >= 50 ? 2 : 4;
    const hrPts = hr >= 180 ? 4 : hr >= 140 ? 3 : hr >= 110 ? 2 : hr >= 70 ? 0 : hr >= 55 ? 2 : hr >= 40 ? 3 : 4;
    const rrPts = rr >= 50 ? 4 : rr >= 35 ? 3 : rr >= 25 ? 1 : rr >= 12 ? 0 : rr >= 10 ? 1 : rr >= 6 ? 2 : 4;
    const naPts = na >= 180 ? 4 : na >= 160 ? 3 : na >= 155 ? 2 : na >= 150 ? 1 : na >= 130 ? 0 : na >= 120 ? 2 : na >= 111 ? 3 : 4;
    const kPts = k >= 7 ? 4 : k >= 6 ? 3 : k >= 5.5 ? 1 : k >= 3.5 ? 0 : k >= 3 ? 1 : k >= 2.5 ? 2 : 4;
    const crPts = cr >= 3.5 ? 4 : cr >= 2 ? 3 : cr >= 1.5 ? 2 : cr >= 0.6 ? 0 : 2;
    const htoPts = hto >= 60 ? 4 : hto >= 50 ? 2 : hto >= 46 ? 1 : hto >= 30 ? 0 : hto >= 20 ? 2 : 4;
    const wbcPts = wbc >= 40 ? 4 : wbc >= 20 ? 2 : wbc >= 15 ? 1 : wbc >= 3 ? 0 : wbc >= 1 ? 2 : 4;
    const gcsPts = 15 - gcs;
    const chronicPts = apacheChronic ? 5 : 0;
    const total =
      agePts +
      tempPts +
      mapPts +
      hrPts +
      rrPts +
      naPts +
      kPts +
      crPts +
      htoPts +
      wbcPts +
      gcsPts +
      chronicPts;
    return { total };
  }, [apacheAge, apacheTemp, apacheMap, apacheHr, apacheRr, apacheNa, apacheK, apacheCr, apacheHto, apacheWbc, apacheGcs, apacheChronic]);

  return (
    <section id="uci-scores" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl mt-10">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Escalas UCI</h2>
        <p className="mt-1 text-sm text-slate-400">
          NEWS2, SOFA, PSI y APACHE II. Revisa contexto clínico y protocolo local.
        </p>
      </div>
      <div className="space-y-6">
        {/* NEWS2 */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">NEWS2</h3>
              <p className="text-sm text-slate-400">Early warning score.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {news2.score} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-7">
            <Field label="FR" value={newsRr} onChange={setNewsRr} suffix="rpm" />
            <Field label="SpO2" value={newsSpo2} onChange={setNewsSpo2} suffix="%" />
            <ScoreCheck label="O2 suplementario" checked={newsO2} onChange={setNewsO2} />
            <Field label="Temp" value={newsTemp} onChange={setNewsTemp} suffix="°C" />
            <Field label="TAS" value={newsSbp} onChange={setNewsSbp} suffix="mmHg" />
            <Field label="FC" value={newsHr} onChange={setNewsHr} suffix="lpm" />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">AVPU</span>
              <select
                value={newsAvpu}
                onChange={(event) => setNewsAvpu(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                <option value="A">Alerta</option>
                <option value="V">Verbal</option>
                <option value="P">Dolor</option>
                <option value="U">No responde</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="NEWS2" value={`${news2.score} punto(s)`} />
            <ResultCard title="Riesgo" value={news2.risk} />
          </div>
        </div>
        {/* SOFA */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">SOFA</h3>
              <p className="text-sm text-slate-400">Disfunción orgánica secuencial.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {sofa.score} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <Field label="P/F" value={sofaPf} onChange={setSofaPf} suffix="mmHg" />
            <Field label="Plaquetas" value={sofaPlatelets} onChange={setSofaPlatelets} suffix="mil/mm³" />
            <Field label="BT" value={sofaBilirubin} onChange={setSofaBilirubin} suffix="mg/dl" />
            <Field label="Cardio" value={sofaCardio} onChange={setSofaCardio} suffix="0–4" />
            <Field label="GCS" value={sofaGcs} onChange={setSofaGcs} suffix="" />
            <Field label="Creatinina" value={sofaCreatinine} onChange={setSofaCreatinine} suffix="mg/dl" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="SOFA" value={`${sofa.score} punto(s)`} />
            <ResultCard
              title="Detalle"
              value={`Resp: ${sofa.resp}, Coag: ${sofa.coag}, Hígado: ${sofa.liver}, Cardio: ${sofa.cardio}, Neuro: ${sofa.neuro}, Renal: ${sofa.renal}`}
            />
          </div>
        </div>
        {/* PSI */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">PSI</h3>
              <p className="text-sm text-slate-400">
                Neumonía: índice de severidad (Pneumonia Severity Index).
              </p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {psiScore} punto(s)
            </span>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Field label="Edad" value={psiAge} onChange={setPsiAge} suffix="años" />
            <ScoreCheck label="Masculino" checked={psiMale} onChange={setPsiMale} />
            <ScoreCheck label="Residencia" checked={psiNursing} onChange={setPsiNursing} />
            <ScoreCheck label="Cáncer" checked={psiCancer} onChange={setPsiCancer} />
            <ScoreCheck label="Hepático" checked={psiLiver} onChange={setPsiLiver} />
            <ScoreCheck label="IC" checked={psiChf} onChange={setPsiChf} />
            <ScoreCheck label="EVC" checked={psiCva} onChange={setPsiCva} />
            <ScoreCheck label="Renal" checked={psiRenal} onChange={setPsiRenal} />
            <ScoreCheck label="Mental alterado" checked={psiMental} onChange={setPsiMental} />
            <ScoreCheck label="FR ≥30" checked={psiRr} onChange={setPsiRr} />
            <ScoreCheck label="PAS <90" checked={psiSbp} onChange={setPsiSbp} />
            <ScoreCheck label="Temp <35 o >40" checked={psiTemp} onChange={setPsiTemp} />
            <ScoreCheck label="FC ≥125" checked={psiHr} onChange={setPsiHr} />
            <ScoreCheck label="pH <7.35" checked={psiPh} onChange={setPsiPh} />
            <ScoreCheck label="BUN ≥30" checked={psiBun} onChange={setPsiBun} />
            <ScoreCheck label="Na <130" checked={psiNa} onChange={setPsiNa} />
            <ScoreCheck label="Glu ≥250" checked={psiGlu} onChange={setPsiGlu} />
            <ScoreCheck label="Hto <30" checked={psiHto} onChange={setPsiHto} />
            <ScoreCheck label="SatO2 <90%" checked={psiO2} onChange={setPsiO2} />
            <ScoreCheck label="Derrame pleural" checked={psiEffusion} onChange={setPsiEffusion} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="PSI" value={`${psiScore} puntos · ${psiClass}`} />
          </div>
        </div>
        {/* APACHE II */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">APACHE II</h3>
              <p className="text-sm text-slate-400">Índice de severidad en UCI.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {apache.total} punto(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <Field label="Edad" value={apacheAge} onChange={setApacheAge} suffix="años" />
            <Field label="Temp" value={apacheTemp} onChange={setApacheTemp} suffix="°C" />
            <Field label="PAM" value={apacheMap} onChange={setApacheMap} suffix="mmHg" />
            <Field label="FC" value={apacheHr} onChange={setApacheHr} suffix="lpm" />
            <Field label="FR" value={apacheRr} onChange={setApacheRr} suffix="rpm" />
            <Field label="Na" value={apacheNa} onChange={setApacheNa} suffix="mEq/L" />
            <Field label="K" value={apacheK} onChange={setApacheK} suffix="mEq/L" />
            <Field label="Cr" value={apacheCr} onChange={setApacheCr} suffix="mg/dl" />
            <Field label="Hto" value={apacheHto} onChange={setApacheHto} suffix="%" />
            <Field label="Leucos" value={apacheWbc} onChange={setApacheWbc} suffix="mil/mm³" />
            <Field label="GCS" value={apacheGcs} onChange={setApacheGcs} />
            <ScoreCheck label="Enfermedad crónica grave" checked={apacheChronic} onChange={setApacheChronic} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="APACHE II" value={`${apache.total} punto(s)`} />
          </div>
        </div>
      </div>
    </section>
  );
}
function GastroScoresCalculator() {
  const [gbsBun, setGbsBun] = useState("18");
  const [gbsHb, setGbsHb] = useState("13");
  const [gbsSbp, setGbsSbp] = useState("120");
  const [gbsPulse, setGbsPulse] = useState(false);
  const [gbsMelena, setGbsMelena] = useState(false);
  const [gbsSyncope, setGbsSyncope] = useState(false);
  const [gbsHepatic, setGbsHepatic] = useState(false);
  const [gbsHeartFailure, setGbsHeartFailure] = useState(false);

  const [childBilirubin, setChildBilirubin] = useState("1.0");
  const [childAlbumin, setChildAlbumin] = useState("3.5");
  const [childInr, setChildInr] = useState("1.2");
  const [childAscites, setChildAscites] = useState("1");
  const [childEncephalopathy, setChildEncephalopathy] = useState("1");

  const [meldBilirubin, setMeldBilirubin] = useState("1.0");
  const [meldInr, setMeldInr] = useState("1.2");
  const [meldCreatinine, setMeldCreatinine] = useState("1.0");
  const [meldSodium, setMeldSodium] = useState("137");
  const [meldDialysis, setMeldDialysis] = useState(false);

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

  const gbs = useMemo(() => {
    const bun = toNumber(gbsBun);
    const hb = toNumber(gbsHb);
    const sbp = toNumber(gbsSbp);

    const bunPts = bun >= 70 ? 6 : bun >= 56 ? 4 : bun >= 28 ? 3 : bun >= 22.4 ? 2 : bun >= 18.2 ? 1 : 0;
    const hbPts = hb < 10 ? 6 : hb < 12 ? 3 : hb < 13 ? 1 : 0;
    const sbpPts = sbp < 90 ? 3 : sbp < 100 ? 2 : sbp < 110 ? 1 : 0;
    const pulsePts = gbsPulse ? 1 : 0;
    const melenaPts = gbsMelena ? 1 : 0;
    const syncopePts = gbsSyncope ? 2 : 0;
    const hepaticPts = gbsHepatic ? 2 : 0;
    const heartFailurePts = gbsHeartFailure ? 2 : 0;
    const total = bunPts + hbPts + sbpPts + pulsePts + melenaPts + syncopePts + hepaticPts + heartFailurePts;
    const risk = total === 0 ? "Muy bajo" : total <= 5 ? "Bajo-intermedio" : "Alto";
    return { total, risk };
  }, [gbsBun, gbsHb, gbsSbp, gbsPulse, gbsMelena, gbsSyncope, gbsHepatic, gbsHeartFailure]);

  const child = useMemo(() => {
    const bilirubin = toNumber(childBilirubin);
    const albumin = toNumber(childAlbumin);
    const inr = toNumber(childInr);
    const bilirubinPts = bilirubin < 2 ? 1 : bilirubin <= 3 ? 2 : 3;
    const albuminPts = albumin > 3.5 ? 1 : albumin >= 2.8 ? 2 : 3;
    const inrPts = inr < 1.7 ? 1 : inr <= 2.3 ? 2 : 3;
    const ascitesPts = toNumber(childAscites);
    const encephalopathyPts = toNumber(childEncephalopathy);
    const total = bilirubinPts + albuminPts + inrPts + ascitesPts + encephalopathyPts;
    const classification = total <= 6 ? "Child-Pugh A" : total <= 9 ? "Child-Pugh B" : "Child-Pugh C";
    return { total, classification };
  }, [childBilirubin, childAlbumin, childInr, childAscites, childEncephalopathy]);

  const meldNa = useMemo(() => {
    const bilirubin = Math.max(toNumber(meldBilirubin), 1);
    const inr = Math.max(toNumber(meldInr), 1);
    const creatinine = meldDialysis ? 4 : Math.min(Math.max(toNumber(meldCreatinine), 1), 4);
    const sodium = Math.min(Math.max(toNumber(meldSodium), 125), 137);
    const meld = 3.78 * Math.log(bilirubin) + 11.2 * Math.log(inr) + 9.57 * Math.log(creatinine) + 6.43;
    const cappedMeld = Math.min(Math.max(meld, 6), 40);
    const total = cappedMeld + 1.32 * (137 - sodium) - 0.033 * cappedMeld * (137 - sodium);
    const rounded = Math.round(Math.min(Math.max(total, 6), 40));
    const risk = rounded < 10 ? "Bajo" : rounded < 20 ? "Intermedio" : rounded < 30 ? "Alto" : "Muy alto";
    return { total: rounded, risk };
  }, [meldBilirubin, meldInr, meldCreatinine, meldSodium, meldDialysis]);

  return (
    <section id="gastro-scores" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Gastro / Hepato</h2>
        <p className="mt-1 text-sm text-slate-400">
          Glasgow-Blatchford, Child-Pugh y MELD-Na para guardia y valoración inicial.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">Glasgow-Blatchford</h3>
              <p className="text-sm text-slate-400">Sangrado de tubo digestivo alto.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {gbs.total} punto(s)
            </span>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <Field label="BUN" value={gbsBun} onChange={setGbsBun} suffix="mg/dl" />
            <Field label="Hb" value={gbsHb} onChange={setGbsHb} suffix="g/dl" />
            <Field label="TAS" value={gbsSbp} onChange={setGbsSbp} suffix="mmHg" />
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <ScoreCheck label="Pulso ≥100" checked={gbsPulse} onChange={setGbsPulse} />
            <ScoreCheck label="Melena" checked={gbsMelena} onChange={setGbsMelena} />
            <ScoreCheck label="Síncope" checked={gbsSyncope} onChange={setGbsSyncope} />
            <ScoreCheck label="Hepatopatía" checked={gbsHepatic} onChange={setGbsHepatic} />
            <ScoreCheck label="Falla cardiaca" checked={gbsHeartFailure} onChange={setGbsHeartFailure} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="GBS" value={`${gbs.total} punto(s)`} />
            <ResultCard title="Riesgo" value={gbs.risk} helper="GBS 0 suele identificar muy bajo riesgo; individualizar por contexto clínico." />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">Child-Pugh</h3>
              <p className="text-sm text-slate-400">Clasificación de cirrosis y función hepática.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {child.total} punto(s)
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Field label="Bilirrubina" value={childBilirubin} onChange={setChildBilirubin} suffix="mg/dl" />
            <Field label="Albúmina" value={childAlbumin} onChange={setChildAlbumin} suffix="g/dl" />
            <Field label="INR" value={childInr} onChange={setChildInr} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Ascitis</span>
              <select value={childAscites} onChange={(event) => setChildAscites(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60">
                <option value="1">Ausente</option>
                <option value="2">Leve / controlada</option>
                <option value="3">Moderada-severa</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Encefalopatía</span>
              <select value={childEncephalopathy} onChange={(event) => setChildEncephalopathy(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#061527] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60">
                <option value="1">Ausente</option>
                <option value="2">Grado I-II</option>
                <option value="3">Grado III-IV</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="Child-Pugh" value={`${child.total} punto(s)`} />
            <ResultCard title="Clase" value={child.classification} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-300">MELD-Na</h3>
              <p className="text-sm text-slate-400">Modelo para enfermedad hepática terminal con sodio.</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {meldNa.total} punto(s)
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Field label="Bilirrubina" value={meldBilirubin} onChange={setMeldBilirubin} suffix="mg/dl" />
            <Field label="INR" value={meldInr} onChange={setMeldInr} />
            <Field label="Creatinina" value={meldCreatinine} onChange={setMeldCreatinine} suffix="mg/dl" />
            <Field label="Sodio" value={meldSodium} onChange={setMeldSodium} suffix="mEq/L" />
            <ScoreCheck label="Diálisis" checked={meldDialysis} onChange={setMeldDialysis} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ResultCard title="MELD-Na" value={`${meldNa.total} punto(s)`} />
            <ResultCard title="Riesgo" value={meldNa.risk} helper="Cálculo aproximado con límites estándar: Cr 1–4, Na 125–137, MELD 6–40." />
          </div>
        </div>
      </div>
    </section>
  );
}