// Cálculos clínicos derivados de laboratorios, gasometría y ventilación mecánica.
//
// Todo se guarda como texto en Supabase (igual que el resto del censo), así que
// aquí se parsea con tolerancia: cualquier valor no numérico se trata como
// ausente y el cálculo que dependa de él simplemente no se muestra.

export function toNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const clean = String(value).replace(",", ".").trim();
  if (!clean) return null;

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// FiO2 se captura como porcentaje (40) o como fracción (0.4): se normaliza a fracción.
function fio2Fraction(value: unknown): number | null {
  const raw = toNum(value);
  if (raw === null || raw <= 0) return null;
  return raw > 1 ? raw / 100 : raw;
}

export type Derived = {
  key: string;
  label: string;
  value: string;
  helper?: string;
  // true cuando el valor no venía reportado y lo calculamos nosotros.
  calculated?: boolean;
  alert?: boolean;
};

// ---------------------------------------------------------------------------
// Laboratorios
// ---------------------------------------------------------------------------

export type PatientContext = {
  age?: number | null;
  sex?: string | null;
};

export function derivedLabs(
  labs: Record<string, unknown>,
  patient: PatientContext = {}
): Derived[] {
  const out: Derived[] = [];

  const glu = toNum(labs.glu);
  const bun = toNum(labs.bun);
  const cr = toNum(labs.cr);
  const na = toNum(labs.na);
  const k = toNum(labs.k);
  const cl = toNum(labs.cl);
  const ca = toNum(labs.ca);
  const alb = toNum(labs.alb);
  const bt = toNum(labs.bt);
  const bd = toNum(labs.bd);
  const pt = toNum(labs.prot_totales);
  const hb = toNum(labs.hb);
  const hto = toNum(labs.hto);
  const eri = toNum(labs.eri);
  const hco3 = toNum(labs.hco3);
  const age = toNum(patient.age);
  const sex = String(patient.sex || "").toUpperCase().startsWith("F") ? "F" : "M";

  // Bilirrubina indirecta
  if (toNum(labs.bi) === null && bt !== null && bd !== null) {
    out.push({
      key: "bi",
      label: "BI",
      value: String(round(bt - bd, 2)),
      helper: "BT − BD",
      calculated: true,
    });
  }

  // Globulinas y relación A/G
  const glob = toNum(labs.glob) ?? (pt !== null && alb !== null ? pt - alb : null);

  if (toNum(labs.glob) === null && glob !== null) {
    out.push({
      key: "glob",
      label: "Globulinas",
      value: String(round(glob, 2)),
      helper: "PT − Alb",
      calculated: true,
    });
  }

  if (toNum(labs.ag_ratio) === null && alb !== null && glob !== null && glob !== 0) {
    out.push({
      key: "ag",
      label: "A/G",
      value: String(round(alb / glob, 2)),
      helper: "Alb ÷ Globulinas",
      calculated: true,
    });
  }

  // Índices eritrocitarios (Eri en millones/µL)
  if (toNum(labs.vcm) === null && hto !== null && eri !== null && eri !== 0) {
    out.push({
      key: "vcm",
      label: "VCM",
      value: String(round((hto * 10) / eri, 1)),
      helper: "Hto × 10 ÷ Eri",
      calculated: true,
    });
  }

  if (toNum(labs.hcm) === null && hb !== null && eri !== null && eri !== 0) {
    out.push({
      key: "hcm",
      label: "HCM",
      value: String(round((hb * 10) / eri, 1)),
      helper: "Hb × 10 ÷ Eri",
      calculated: true,
    });
  }

  if (toNum(labs.chcm) === null && hb !== null && hto !== null && hto !== 0) {
    out.push({
      key: "chcm",
      label: "CHCM",
      value: String(round((hb * 100) / hto, 1)),
      helper: "Hb × 100 ÷ Hto",
      calculated: true,
    });
  }

  // Anion gap
  if (na !== null && cl !== null && hco3 !== null) {
    const ag = na - (cl + hco3);

    out.push({
      key: "anion-gap",
      label: "Anion gap",
      value: String(round(ag, 1)),
      helper: "Na − (Cl + HCO₃)",
      alert: ag > 12,
    });

    if (alb !== null) {
      const agc = ag + 2.5 * (4 - alb);
      out.push({
        key: "anion-gap-corregido",
        label: "AG corregido",
        value: String(round(agc, 1)),
        helper: "Corregido por albúmina",
        alert: agc > 12,
      });
    }
  }

  // Sodio corregido por glucosa
  if (na !== null && glu !== null && glu > 100) {
    out.push({
      key: "na-corregido",
      label: "Na corregido",
      value: String(round(na + (1.6 * (glu - 100)) / 100, 1)),
      helper: "Corregido por hiperglucemia",
    });
  }

  // Calcio corregido por albúmina
  if (ca !== null && alb !== null) {
    out.push({
      key: "ca-corregido",
      label: "Ca corregido",
      value: String(round(ca + 0.8 * (4 - alb), 2)),
      helper: "Corregido por albúmina",
    });
  }

  // Osmolaridad calculada
  if (na !== null && glu !== null && bun !== null) {
    out.push({
      key: "osm",
      label: "Osmolaridad",
      value: String(round(2 * na + glu / 18 + bun / 2.8, 1)),
      helper: "2·Na + Glu/18 + BUN/2.8",
    });
  }

  // Relación BUN/Cr
  if (bun !== null && cr !== null && cr !== 0) {
    const ratio = bun / cr;
    out.push({
      key: "bun-cr",
      label: "BUN/Cr",
      value: String(round(ratio, 1)),
      helper: ratio > 20 ? "Sugiere componente prerrenal" : undefined,
      alert: ratio > 20,
    });
  }

  // TFG por CKD-EPI 2021 (sin ajuste por raza)
  if (cr !== null && cr > 0 && age !== null && age > 0 && patient.sex) {
    const female = sex === "F";
    const kappa = female ? 0.7 : 0.9;
    const alpha = female ? -0.241 : -0.302;

    const egfr =
      142 *
      Math.min(cr / kappa, 1) ** alpha *
      Math.max(cr / kappa, 1) ** -1.2 *
      0.9938 ** age *
      (female ? 1.012 : 1);

    out.push({
      key: "tfg",
      label: "TFG (CKD-EPI)",
      value: `${round(egfr, 1)} ml/min/1.73m²`,
      helper: kdigoStage(egfr),
      alert: egfr < 60,
    });
  }

  // Potasio: aviso simple, es el que cambia conducta en el pase
  if (k !== null && (k < 3.5 || k > 5.5)) {
    out.push({
      key: "k-alerta",
      label: "Potasio",
      value: k < 3.5 ? "Hipokalemia" : "Hiperkalemia",
      helper: `K ${k}`,
      alert: true,
    });
  }

  return out;
}

function kdigoStage(egfr: number): string {
  if (egfr >= 90) return "G1";
  if (egfr >= 60) return "G2";
  if (egfr >= 45) return "G3a";
  if (egfr >= 30) return "G3b";
  if (egfr >= 15) return "G4";
  return "G5";
}

// ---------------------------------------------------------------------------
// Gasometría
// ---------------------------------------------------------------------------

export type AcidBase = {
  results: Derived[];
  interpretation: string;
};

export function interpretGases(
  labs: Record<string, unknown>,
  patient: PatientContext = {}
): AcidBase | null {
  const ph = toNum(labs.ph);
  const pco2 = toNum(labs.pco2);
  const hco3 = toNum(labs.hco3);
  const po2 = toNum(labs.po2);
  const lactato = toNum(labs.lactato);
  const fio2 = fio2Fraction(labs.fio2);
  const age = toNum(patient.age);
  const na = toNum(labs.na);
  const cl = toNum(labs.cl);

  if (ph === null && pco2 === null && hco3 === null && po2 === null) return null;

  const results: Derived[] = [];

  // Cada bloque aporta una oración; al final se arman en un solo párrafo.
  let acidoBase = "";
  let oxigenacion = "";
  let ventilacion = "";
  let perfusion = "";

  // --- Trastorno primario y compensación ---
  if (ph !== null && pco2 !== null && hco3 !== null) {
    const acidemia = ph < 7.35;
    const alcalemia = ph > 7.45;

    let primary = "";
    let expected: number | null = null;
    let expectedLabel = "";

    if (acidemia && hco3 < 22) {
      primary = "acidosis metabólica";
      expected = 1.5 * hco3 + 8; // Winter
      expectedLabel = `pCO₂ esperada ${round(expected, 0)} ± 2 (Winter)`;
    } else if (acidemia && pco2 > 45) {
      primary = "acidosis respiratoria";
      expectedLabel = "HCO₃ sube ~1 por cada 10 de pCO₂ sobre 40 (aguda), ~3.5 (crónica)";
    } else if (alcalemia && hco3 > 26) {
      primary = "alcalosis metabólica";
      expected = 0.7 * hco3 + 21;
      expectedLabel = `pCO₂ esperada ${round(expected, 0)} ± 2`;
    } else if (alcalemia && pco2 < 35) {
      primary = "alcalosis respiratoria";
      expectedLabel = "HCO₃ baja ~2 por cada 10 de pCO₂ bajo 40 (aguda), ~4 (crónica)";
    } else if (!acidemia && !alcalemia) {
      primary =
        pco2 > 45 || pco2 < 35 || hco3 > 26 || hco3 < 22
          ? "pH compensado, con trastorno subyacente"
          : "equilibrio ácido-base sin alteraciones";
    } else {
      primary = "trastorno ácido-base no clasificable con los datos disponibles";
    }

    results.push({
      key: "trastorno",
      label: "Trastorno primario",
      value: primary.charAt(0).toUpperCase() + primary.slice(1),
      helper: expectedLabel || undefined,
      alert: acidemia || alcalemia,
    });

    if (expected !== null) {
      const diff = pco2 - expected;
      const compensada = Math.abs(diff) <= 2;

      results.push({
        key: "compensacion",
        label: "Compensación",
        value: compensada
          ? "Adecuada"
          : diff > 0
            ? "Insuficiente: acidosis respiratoria agregada"
            : "Excesiva: alcalosis respiratoria agregada",
        helper: `pCO₂ medida ${pco2} vs esperada ${round(expected, 0)}`,
        alert: !compensada,
      });

      acidoBase = compensada
        ? `Gasometría compatible con ${primary} con compensación respiratoria adecuada`
        : `Gasometría compatible con ${primary} con compensación respiratoria ${diff > 0 ? "insuficiente, sugerente de componente respiratorio agregado" : "excesiva, sugerente de alcalosis respiratoria agregada"}`;
    } else {
      acidoBase = `Gasometría compatible con ${primary}`;
    }

    // Delta-delta, solo útil si hay AG elevado
    if (na !== null && cl !== null) {
      const ag = na - (cl + hco3);
      if (ag > 12) {
        const deltaRatio = (ag - 12) / (24 - hco3);
        if (Number.isFinite(deltaRatio) && 24 - hco3 !== 0) {
          results.push({
            key: "delta-delta",
            label: "Delta-delta",
            value: String(round(deltaRatio, 2)),
            helper:
              deltaRatio < 1
                ? "Sugiere acidosis hiperclorémica asociada"
                : deltaRatio > 2
                  ? "Sugiere alcalosis metabólica asociada"
                  : "Acidosis con AG elevado pura",
          });
        }
      }
    }
  }

  // --- Oxigenación ---
  if (po2 !== null && fio2 !== null) {
    const pf = po2 / fio2;

    results.push({
      key: "pf",
      label: "Relación P/F",
      value: String(round(pf, 0)),
      helper: ardsLabel(pf),
      alert: pf <= 300,
    });

    oxigenacion =
      pf > 300
        ? "Oxigenación adecuada para el aporte de oxígeno actual"
        : `Oxigenación comprometida, con relación P/F de ${round(pf, 0)}, en rango de ${ardsLabel(pf)}`;

    // Gradiente alvéolo-arterial, a nivel del mar
    if (pco2 !== null) {
      const aa = fio2 * (760 - 47) - pco2 / 0.8 - po2;
      const esperado = age !== null ? age / 4 + 4 : null;

      results.push({
        key: "aa",
        label: "Gradiente A-a",
        value: String(round(aa, 0)),
        helper: esperado !== null ? `Esperado para la edad: ${round(esperado, 0)}` : undefined,
        alert: esperado !== null ? aa > esperado : false,
      });
    }
  }

  // --- Ventilación ---
  if (pco2 !== null) {
    ventilacion =
      pco2 > 45
        ? "hipercapnia que traduce ventilación insuficiente"
        : pco2 < 35
          ? "hipocapnia por hiperventilación"
          : "ventilación adecuada por pCO₂";
  }

  // --- Perfusión ---
  if (lactato !== null) {
    results.push({
      key: "lactato",
      label: "Lactato",
      value: String(lactato),
      helper: lactato > 4 ? "Hipoperfusión grave" : lactato > 2 ? "Hipoperfusión" : "Sin hipoperfusión",
      alert: lactato > 2,
    });

    perfusion =
      lactato > 4
        ? "Elevación importante de lactato que traduce hipoperfusión tisular grave"
        : lactato > 2
          ? "Lactato elevado, sugerente de hipoperfusión tisular"
          : "Sin datos de hipoperfusión tisular por lactato";
  }

  // Oxigenación y ventilación van juntas: describen el mismo intercambio gaseoso.
  const respiratoria = [oxigenacion, ventilacion].filter(Boolean).join(", con ");

  const oraciones = [acidoBase, respiratoria, perfusion].filter(Boolean);

  return {
    results,
    interpretation: oraciones.length ? `${oraciones.join(". ")}.` : "",
  };
}

function ardsLabel(pf: number): string {
  if (pf <= 100) return "SDRA severo si PEEP ≥5";
  if (pf <= 200) return "SDRA moderado si PEEP ≥5";
  if (pf <= 300) return "SDRA leve si PEEP ≥5";
  return "Oxigenación conservada por P/F";
}

// ---------------------------------------------------------------------------
// Ventilación mecánica invasiva
// ---------------------------------------------------------------------------

export function predictedBodyWeight(sex: string, heightCm: number): number {
  const base = String(sex || "").toUpperCase().startsWith("F") ? 45.5 : 50;
  return base + 0.91 * (heightCm - 152.4);
}

export function derivedVentilation(input: {
  sex?: string | null;
  heightCm?: unknown;
  vt?: unknown;
  fr?: unknown;
  peep?: unknown;
  fio2?: unknown;
  pplat?: unknown;
  ppico?: unknown;
  pao2?: unknown;
}): Derived[] {
  const out: Derived[] = [];

  const height = toNum(input.heightCm);
  const vt = toNum(input.vt);
  const fr = toNum(input.fr);
  const peep = toNum(input.peep);
  const pplat = toNum(input.pplat);
  const ppico = toNum(input.ppico);
  const pao2 = toNum(input.pao2);
  const fio2 = fio2Fraction(input.fio2);

  let pbw: number | null = null;

  if (height !== null && height > 0) {
    pbw = predictedBodyWeight(input.sex || "M", height);

    out.push({
      key: "pbw",
      label: "PBW",
      value: `${round(pbw, 1)} kg`,
      helper: "Peso predicho por talla y sexo",
    });

    out.push({
      key: "vt-objetivo",
      label: "VT protector",
      value: `${round(pbw * 4, 0)}–${round(pbw * 6, 0)} ml`,
      helper: "4–6 ml/kg de peso predicho",
    });
  }

  if (vt !== null && pbw !== null && pbw > 0) {
    const mlkg = vt / pbw;

    out.push({
      key: "vt-mlkg",
      label: "VT actual",
      value: `${round(mlkg, 1)} ml/kg`,
      helper: mlkg > 8 ? "Por arriba del rango protector" : "Dentro de rango protector",
      alert: mlkg > 8,
    });
  }

  if (vt !== null && fr !== null) {
    out.push({
      key: "vm",
      label: "Ventilación minuto",
      value: `${round((vt * fr) / 1000, 1)} L/min`,
      helper: "VT × FR",
    });
  }

  if (pplat !== null && peep !== null) {
    const dp = pplat - peep;

    out.push({
      key: "dp",
      label: "Driving pressure",
      value: `${round(dp, 1)} cmH₂O`,
      helper: dp > 15 ? "Por arriba de 15: mayor riesgo" : "Dentro de meta (≤15)",
      alert: dp > 15,
    });
  }

  if (pplat !== null) {
    out.push({
      key: "pplat",
      label: "Presión meseta",
      value: `${round(pplat, 1)} cmH₂O`,
      helper: pplat > 30 ? "Por arriba de la meta de 30" : "Dentro de meta (≤30)",
      alert: pplat > 30,
    });
  }

  if (ppico !== null && pplat !== null) {
    out.push({
      key: "resistiva",
      label: "Presión resistiva",
      value: `${round(ppico - pplat, 1)} cmH₂O`,
      helper: "Ppico − Pplat: componente de vía aérea",
      alert: ppico - pplat > 15,
    });
  }

  if (vt !== null && pplat !== null && peep !== null && pplat - peep > 0) {
    out.push({
      key: "compliance",
      label: "Distensibilidad",
      value: `${round(vt / (pplat - peep), 1)} ml/cmH₂O`,
      helper: "VT ÷ driving pressure",
      alert: vt / (pplat - peep) < 30,
    });
  }

  if (pao2 !== null && fio2 !== null) {
    const pf = pao2 / fio2;

    out.push({
      key: "pf",
      label: "Relación P/F",
      value: String(round(pf, 0)),
      helper: ardsLabel(pf),
      alert: pf <= 300,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Alertas para el censo
// ---------------------------------------------------------------------------
// Versión corta y priorizada de lo anterior: en la portada no cabe el panel
// completo, lo que importa es a quién hay que ver primero.

export type CensusAlert = {
  label: string;
  severity: "alta" | "media";
};

export function censusAlerts(
  lab: Record<string, unknown> | null | undefined,
  patient: PatientContext = {}
): CensusAlert[] {
  if (!lab) return [];

  const alerts: CensusAlert[] = [];

  const add = (
    value: number | null,
    label: string,
    alta: (v: number) => boolean,
    media: (v: number) => boolean
  ) => {
    if (value === null) return;
    if (alta(value)) alerts.push({ label, severity: "alta" });
    else if (media(value)) alerts.push({ label, severity: "media" });
  };

  const k = toNum(lab.k);
  add(k, `K ${k}`, (v) => v > 6 || v < 3, (v) => v > 5.5 || v < 3.5);

  const na = toNum(lab.na);
  add(na, `Na ${na}`, (v) => v < 125 || v > 155, (v) => v < 130 || v > 150);

  const glu = toNum(lab.glu);
  add(glu, `Glu ${glu}`, (v) => v > 300 || v < 60, (v) => v > 250 || v < 70);

  const hb = toNum(lab.hb);
  add(hb, `Hb ${hb}`, (v) => v < 7, (v) => v < 8);

  const plt = toNum(lab.plt);
  add(plt, `Plaq ${plt}`, (v) => v < 30, (v) => v < 50);

  const lactato = toNum(lab.lactato);
  add(lactato, `Lactato ${lactato}`, (v) => v > 4, (v) => v > 2);

  const ph = toNum(lab.ph);
  add(ph, `pH ${ph}`, (v) => v < 7.25 || v > 7.55, (v) => v < 7.3 || v > 7.5);

  // Función renal: se avisa por TFG, no por creatinina cruda, porque la misma
  // creatinina significa cosas distintas según edad y sexo.
  const cr = toNum(lab.cr);
  const age = toNum(patient.age);

  if (cr !== null && cr > 0 && age !== null && age > 0 && patient.sex) {
    const female = String(patient.sex).toUpperCase().startsWith("F");
    const kappa = female ? 0.7 : 0.9;
    const alpha = female ? -0.241 : -0.302;

    const egfr =
      142 *
      Math.min(cr / kappa, 1) ** alpha *
      Math.max(cr / kappa, 1) ** -1.2 *
      0.9938 ** age *
      (female ? 1.012 : 1);

    add(egfr, `TFG ${round(egfr, 0)}`, (v) => v < 15, (v) => v < 30);
  }

  const po2 = toNum(lab.po2);
  const fio2raw = toNum(lab.fio2);
  const fio2 = fio2raw === null || fio2raw <= 0 ? null : fio2raw > 1 ? fio2raw / 100 : fio2raw;

  if (po2 !== null && fio2 !== null) {
    const pf = po2 / fio2;
    add(pf, `P/F ${round(pf, 0)}`, (v) => v <= 100, (v) => v <= 200);
  }

  // Lo grave primero: en el pase se lee de izquierda a derecha y se corta.
  return alerts.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "alta" ? -1 : 1
  );
}
