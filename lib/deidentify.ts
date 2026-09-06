// Qué del paciente ve la IA.
//
// Las rutas mandaban el renglón completo de patients con JSON.stringify, y eso
// incluye nombre y apellidos. El modelo no los necesita para redactar: lo que
// usa es edad, sexo, diagnósticos y subespecialidad. Aquí se arma ese
// subconjunto y se deja fuera todo lo que identifica.
//
// Fuera a propósito: full_name, id, bed, team_id, created_by, attending_id,
// assigned_resident_id, assigned_doctor_id, assigned_attending_id, resident.

export type ClinicalPatient = {
  edad: number | null;
  sexo: string | null;
  diagnosticos: string | null;
  subespecialidad: string | null;
  prioridad: string | null;
  ventilacion_mecanica_invasiva: boolean;
  talla_cm: number | null;
};

export function clinicalPatient(
  patient: Record<string, unknown> | null | undefined
): ClinicalPatient | null {
  if (!patient) return null;

  const numberOrNull = (value: unknown) =>
    value === null || value === undefined || value === "" ? null : Number(value);

  const textOrNull = (value: unknown) =>
    value === null || value === undefined ? null : String(value);

  return {
    edad: numberOrNull(patient.age),
    sexo: textOrNull(patient.sex),
    diagnosticos: textOrNull(patient.diagnosis),
    subespecialidad: textOrNull(patient.subspecialty),
    prioridad: textOrNull(patient.priority),
    ventilacion_mecanica_invasiva: Boolean(patient.on_vmi),
    talla_cm: numberOrNull(patient.height_cm),
  };
}
