// Campos de laboratorio en el orden exacto del formato de la nota.
// Vive fuera del componente para que la server action pueda recorrer la misma
// lista al guardar y no se desincronicen.

export type LabField = { name: string; label: string; placeholder?: string };

// El orden es el del formato de la nota: no lo cambies sin querer.
export const QUIMICA: LabField[] = [
  { name: "glu", label: "Glu" },
  { name: "ure", label: "Ure" },
  { name: "bun", label: "Bun" },
  { name: "cr", label: "Cr" },
  { name: "au", label: "AU" },
  { name: "col", label: "Col" },
  { name: "tg", label: "TG" },
  { name: "bt", label: "BT" },
  { name: "bd", label: "BD" },
  { name: "bi", label: "BI" },
  { name: "prot_totales", label: "PT" },
  { name: "glob", label: "Glob" },
  { name: "ag_ratio", label: "A/G" },
  { name: "alb", label: "Alb" },
  { name: "ast", label: "AST" },
  { name: "alt", label: "ALT" },
  { name: "fa", label: "FA" },
  { name: "dhl", label: "DHL" },
  { name: "ggt", label: "GGT" },
  { name: "ca", label: "Ca" },
  { name: "p", label: "P" },
  { name: "cl", label: "Cl" },
  { name: "k", label: "K" },
  { name: "na", label: "Na" },
  { name: "mg", label: "Mg" },
  { name: "pcr", label: "PCR" },
  { name: "pct", label: "PCT" },
  { name: "bnp", label: "BNP" },
];

export const BIOMETRIA: LabField[] = [
  { name: "leu", label: "Leu" },
  { name: "eri", label: "Eri" },
  { name: "hb", label: "Hb" },
  { name: "hto", label: "Hto" },
  { name: "vcm", label: "VCM" },
  { name: "hcm", label: "HCM" },
  { name: "chcm", label: "CHCM" },
  { name: "rdw", label: "RDW" },
  { name: "plt", label: "Plaq" },
];

export const COAGULACION: LabField[] = [
  { name: "tp", label: "TP" },
  { name: "inr", label: "INR" },
  { name: "tpt", label: "TPT" },
  { name: "fibrinogeno", label: "Fibrinógeno" },
  { name: "dimero_d", label: "Dímero D" },
];

export const GASOMETRIA: LabField[] = [
  { name: "ph", label: "pH" },
  { name: "pco2", label: "pCO₂" },
  { name: "po2", label: "pO₂" },
  { name: "hco3", label: "HCO₃" },
  { name: "hco3std", label: "HCO₃std" },
  { name: "tco2", label: "TCO₂" },
  { name: "beecf", label: "BEecf" },
  { name: "beb", label: "BEb" },
  { name: "so2", label: "SO₂" },
  { name: "lactato", label: "Lactato" },
  { name: "fio2", label: "FiO₂", placeholder: "%" },
];

export const LAB_FIELD_NAMES = [
  ...QUIMICA,
  ...BIOMETRIA,
  ...COAGULACION,
  ...GASOMETRIA,
].map((field) => field.name);


// Arma la línea de laboratorios en el formato exacto de la nota:
// "Glu 110, Ure 40, Bun 19, Cr 0.9, ..." — sin unidades, sin rangos, en orden,
// omitiendo lo que no está reportado.
export function formatLabsText(labs: Record<string, unknown> | null | undefined): string {
  if (!labs) return "";

  const parts = [...QUIMICA, ...BIOMETRIA, ...COAGULACION]
    .filter((field) => field.name !== "fio2")
    .map((field) => {
      const value = labs[field.name];
      const clean = value === null || value === undefined ? "" : String(value).trim();
      return clean ? `${field.label} ${clean}` : null;
    })
    .filter(Boolean);

  const otros = String(labs.otros ?? "").trim();
  if (otros) parts.push(`Otros: ${otros}`);

  return parts.join(", ");
}

// Gasometría en su propio párrafo, igual que en la nota.
export function formatGasesText(labs: Record<string, unknown> | null | undefined): string {
  if (!labs) return "";

  // FiO2 se captura para calcular P/F y el gradiente A-a, pero no forma parte
  // del formato de la nota: la línea va de pH a Lactato.
  const parts = GASOMETRIA.filter((field) => field.name !== "fio2").map((field) => {
    const value = labs[field.name];
    const clean = value === null || value === undefined ? "" : String(value).trim();
    return clean ? `${field.label} ${clean}` : null;
  }).filter(Boolean);

  if (!parts.length) return "";

  const tipo = String(labs.gaso_tipo ?? "arterial").trim() || "arterial";
  return `Gasometría ${tipo}: ${parts.join(", ")}.`;
}

// Lee un reporte de laboratorio pegado como texto libre y lo reparte en los
// campos del formato. Tolera "Glu 110", "GLU: 110", "glu=110" y separadores por
// coma o salto de línea.
//
// El orden importa: las etiquetas largas se buscan antes que las cortas para
// que "HCO3std" no lo capture "HCO3", ni "TGO" lo capture "TG".
const PARSE_PATTERNS: Array<[string, string[]]> = [
  ["hco3std", ["HCO3STD", "HCO3 STD", "BICARBONATO ESTANDAR"]],
  ["fio2", ["FIO2"]],
  ["prot_totales", ["PROTEINAS TOTALES", "PROT TOTALES", "PT"]],
  ["dimero_d", ["DIMERO D", "DIMERO-D", "DD"]],
  ["fibrinogeno", ["FIBRINOGENO", "FIB"]],
  ["ag_ratio", ["A/G"]],
  ["glob", ["GLOBULINAS", "GLOB"]],
  ["lactato", ["LACTATO", "LAC"]],
  ["beecf", ["BEECF", "BE ECF"]],
  ["beb", ["BEB", "BE B"]],
  ["tco2", ["TCO2"]],
  ["hco3", ["HCO3", "BICARBONATO"]],
  ["pco2", ["PCO2", "PACO2"]],
  ["po2", ["PO2", "PAO2"]],
  ["so2", ["SO2", "SAT", "SATO2"]],
  ["ph", ["PH"]],
  ["chcm", ["CHCM"]],
  ["vcm", ["VCM"]],
  ["hcm", ["HCM"]],
  ["rdw", ["RDW"]],
  ["plt", ["PLAQUETAS", "PLAQ", "PLT"]],
  ["hto", ["HEMATOCRITO", "HTO"]],
  ["hb", ["HEMOGLOBINA", "HB"]],
  ["eri", ["ERITROCITOS", "ERI"]],
  ["leu", ["LEUCOCITOS", "LEU"]],
  ["tpt", ["TPT", "TTPA"]],
  ["inr", ["INR"]],
  ["tp", ["TP"]],
  ["pct", ["PCT", "PROCALCITONINA"]],
  ["pcr", ["PCR"]],
  ["ggt", ["GGT"]],
  ["dhl", ["DHL", "LDH"]],
  ["fa", ["FOSFATASA ALCALINA", "FA"]],
  ["alt", ["ALT", "TGP"]],
  ["ast", ["AST", "TGO"]],
  ["alb", ["ALBUMINA", "ALB"]],
  ["bi", ["BI"]],
  ["bd", ["BD"]],
  ["bt", ["BT"]],
  ["tg", ["TRIGLICERIDOS", "TG"]],
  ["col", ["COLESTEROL", "COL"]],
  ["au", ["ACIDO URICO", "AU"]],
  ["cr", ["CREATININA", "CRE", "CR"]],
  ["bun", ["BUN"]],
  ["ure", ["UREA", "URE"]],
  ["glu", ["GLUCOSA", "GLU"]],
  ["mg", ["MAGNESIO", "MG"]],
  ["na", ["SODIO", "NA"]],
  ["k", ["POTASIO", "K"]],
  ["cl", ["CLORO", "CL"]],
  ["ca", ["CALCIO", "CA"]],
  ["p", ["FOSFORO", "P"]],
  ["bnp", ["NT-PROBNP", "PROBNP", "BNP"]],
];

export function parseLabsText(text: string): Record<string, string> {
  const found: Record<string, string> = {};
  if (!text || !text.trim()) return found;

  // Se quitan acentos para que "Fibrinógeno" o "Dímero D" empaten con las
  // etiquetas, y se va consumiendo el texto: lo ya capturado por una etiqueta
  // larga no vuelve a ofrecerse a una corta.
  let remaining = ` ${text} `.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const [field, labels] of PARSE_PATTERNS) {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
      const pattern = new RegExp(`(^|[^A-Za-zÁÉÍÓÚÑ0-9])${escaped}\\s*[:=]?\\s*(-?\\d+(?:[.,]\\d+)?)`, "i");
      const match = remaining.match(pattern);

      if (match?.[2]) {
        found[field] = match[2].replace(",", ".");
        remaining = remaining.replace(match[0], " ");
        break;
      }
    }
  }

  return found;
}
