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

  const parts = GASOMETRIA.map((field) => {
    const value = labs[field.name];
    const clean = value === null || value === undefined ? "" : String(value).trim();
    return clean ? `${field.label} ${clean}` : null;
  }).filter(Boolean);

  if (!parts.length) return "";

  const tipo = String(labs.gaso_tipo ?? "arterial").trim() || "arterial";
  return `Gasometría ${tipo}: ${parts.join(", ")}.`;
}
