

import Link from "next/link";

const vasoactiveCalculators = [
  {
    name: "Norepinefrina",
    formula: "mcg/min = peso × dosis mcg/kg/min",
    use: "Choque séptico, distributivo o vasopléjico. Meta usual: PAM ≥65 mmHg.",
    quick: "Preparación común: 4 mg en 250 ml. Concentración: 16 mcg/ml.",
  },
  {
    name: "Dobutamina",
    formula: "mcg/min = peso × dosis mcg/kg/min",
    use: "Bajo gasto cardiaco con datos de hipoperfusión y presión permisiva.",
    quick: "Dosis habitual: 2.5–20 mcg/kg/min según respuesta clínica.",
  },
  {
    name: "Dopamina",
    formula: "mcg/min = peso × dosis mcg/kg/min",
    use: "Menos preferida; considerar según contexto, bradicardia o disponibilidad.",
    quick: "Vigilar taquiarritmias y respuesta presora.",
  },
];

const electrolyteCalculators = [
  {
    name: "Sodio corregido por glucosa",
    formula: "Na corregido = Na medido + 1.6 × ((Glu - 100) / 100)",
    use: "Útil en hiperglucemia, CAD/EHH y trastornos de sodio.",
  },
  {
    name: "Anion gap",
    formula: "AG = Na - (Cl + HCO3)",
    use: "Detecta acidosis metabólica con brecha aniónica elevada.",
  },
  {
    name: "Osmolaridad sérica calculada",
    formula: "Osm = 2Na + Glu/18 + BUN/2.8",
    use: "Útil en EHH, hipernatremia, hiponatremia y alteración neurológica.",
  },
];

const anticoagulationCalculators = [
  {
    name: "Enoxaparina profiláctica",
    formula: "40 mg SC cada 24 h; ajustar si TFG baja o alto riesgo de sangrado.",
    use: "Profilaxis de ETV en paciente hospitalizado sin contraindicación.",
  },
  {
    name: "Enoxaparina terapéutica",
    formula: "1 mg/kg SC cada 12 h o 1.5 mg/kg cada 24 h según contexto.",
    use: "TEP/TVP, FA u otra indicación anticoagulante. Ajustar a función renal.",
  },
  {
    name: "Heparina no fraccionada",
    formula: "Útil si alto riesgo de sangrado, TFG muy baja o necesidad de reversión rápida.",
    use: "Preferible cuando se requiere control estrecho y suspensión rápida.",
  },
];

const scoreCalculators = [
  {
    name: "CURB-65",
    formula: "Confusión, Urea, FR ≥30, TA baja, Edad ≥65",
    use: "Estratificación inicial de neumonía adquirida en la comunidad.",
  },
  {
    name: "CHA2DS2-VASc",
    formula: "IC, HTA, edad, DM, EVC, vascular, sexo",
    use: "Riesgo embólico en fibrilación auricular.",
  },
  {
    name: "HAS-BLED",
    formula: "HTA, renal/hepático, EVC, sangrado, INR lábil, edad, fármacos/alcohol",
    use: "Riesgo de sangrado en anticoagulación.",
  },
];

function CalculatorSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{ name: string; formula: string; use: string; quick?: string }>;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.name}
            className="rounded-2xl border border-white/10 bg-[#061527] p-5"
          >
            <h3 className="text-lg font-bold text-cyan-300">{item.name}</h3>
            <p className="mt-3 rounded-xl bg-cyan-400/10 p-3 font-mono text-sm text-cyan-100">
              {item.formula}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.use}</p>
            {item.quick ? (
              <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-400">
                {item.quick}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function CalcPage() {
  return (
    <main className="min-h-screen bg-[#071A2F] p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
              SynapMed Calc
            </p>
            <h1 className="mt-2 text-4xl font-bold">Calculadoras de guardia</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Herramientas rápidas para R1–R4: vasoactivos, electrolitos,
              anticoagulación y escalas clínicas frecuentes. Úsalas como apoyo;
              siempre valida con contexto clínico, guías locales y función renal.
            </p>
          </div>

          <Link
            href="/"
            className="w-fit rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/20"
          >
            Volver al dashboard
          </Link>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-cyan-400/10 p-4">
            <p className="text-sm text-slate-400">Módulos</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">4</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-400">Vasoactivos</p>
            <p className="mt-2 text-3xl font-bold text-white">3</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-400">Electrolitos</p>
            <p className="mt-2 text-3xl font-bold text-white">3</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-slate-400">Escalas</p>
            <p className="mt-2 text-3xl font-bold text-white">3</p>
          </div>
        </div>

        <div className="space-y-6">
          <CalculatorSection
            title="Vasoactivos"
            description="Fórmulas rápidas para perfusiones y toma de decisiones en choque."
            items={vasoactiveCalculators}
          />

          <CalculatorSection
            title="Electrolitos y metabolismo"
            description="Cálculos útiles para interpretar sodio, acidosis y osmolaridad."
            items={electrolyteCalculators}
          />

          <CalculatorSection
            title="Anticoagulación"
            description="Recordatorios rápidos para anticoagulación hospitalaria."
            items={anticoagulationCalculators}
          />

          <CalculatorSection
            title="Escalas rápidas"
            description="Puntajes frecuentes para pase, urgencias y toma de decisiones."
            items={scoreCalculators}
          />
        </div>
      </div>
    </main>
  );
}