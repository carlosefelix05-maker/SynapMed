import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_TEAM_ID } from "@/lib/team";
import {
  QUIMICA,
  BIOMETRIA,
  COAGULACION,
  GASOMETRIA,
  formatLabsText,
  formatGasesText,
  type LabField,
} from "@/lib/labs-fields";
import { derivedLabs, interpretGases } from "@/lib/clinical";
import CopyButton from "@/app/components/CopyButton";

type Lab = Record<string, string | null> & { id: string; sampled_at: string };

function studyDate(lab: Lab) {
  return new Date(lab.sampled_at ?? "").toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// El texto que se copia: la línea del formato más la gasometría en su párrafo.
function copyText(lab: Lab) {
  return [formatLabsText(lab), formatGasesText(lab)].filter(Boolean).join("\n\n");
}

export default async function LabsHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, bed, diagnosis, age, sex")
    .eq("id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .single();

  const { data } = await supabase
    .from("labs")
    .select("*")
    .eq("patient_id", id)
    .eq("team_id", CURRENT_TEAM_ID)
    .order("sampled_at", { ascending: false })
    .limit(12);

  const studies = (data ?? []) as Lab[];
  const patientContext = { age: patient?.age ?? null, sex: patient?.sex ?? null };

  // Los cálculos se derivan por estudio para poder seguir su tendencia.
  const derivedByStudy = studies.map((lab) => {
    const gases = interpretGases(lab, patientContext);
    const all = [...derivedLabs(lab, patientContext), ...(gases?.results ?? [])];

    return new Map(all.map((result) => [result.key, result]));
  });

  const derivedRows: Array<{ key: string; label: string }> = [];

  for (const map of derivedByStudy) {
    for (const [key, result] of map) {
      if (!derivedRows.some((row) => row.key === key)) {
        derivedRows.push({ key, label: result.label });
      }
    }
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#061325] p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm text-cyan-300">
            ← Volver a Rounds
          </Link>
          <p className="mt-8 text-red-300">Paciente no encontrado.</p>
        </div>
      </main>
    );
  }

  const groups: Array<{ title: string; fields: LabField[] }> = [
    { title: "Química sanguínea", fields: QUIMICA },
    { title: "Biometría hemática", fields: BIOMETRIA },
    { title: "Coagulación", fields: COAGULACION },
    { title: "Gasometría", fields: GASOMETRIA },
  ];

  const cell = "whitespace-nowrap px-3 py-2 text-sm";
  const nameCell =
    "sticky left-0 z-10 bg-[#071A2F] px-3 py-2 text-sm font-semibold text-slate-300";

  return (
    <main className="min-h-screen bg-[#061325] p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/patients/${id}`}
          className="mb-8 inline-block text-sm text-cyan-300"
        >
          ← Volver al expediente
        </Link>

        <section className="rounded-3xl bg-white/10 p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-cyan-300">Cama {patient.bed}</p>
              <h1 className="mt-2 text-4xl font-bold">Laboratorios</h1>
              <p className="mt-3 text-slate-300">
                {patient.full_name} ·{" "}
                {patient.diagnosis || "Sin diagnóstico registrado"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {studies.length > 0
                  ? `${studies.length} estudio${studies.length === 1 ? "" : "s"}, del más reciente al más antiguo`
                  : "Sin estudios capturados"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {studies[0] ? (
                <CopyButton
                  text={copyText(studies[0])}
                  label="Copiar el más reciente"
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                />
              ) : null}

              <Link
                href={`/patients/${id}/labs/new`}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/20"
              >
                + Capturar
              </Link>
            </div>
          </div>

          {studies.length === 0 ? (
            <div className="rounded-2xl bg-[#071A2F] p-6 text-sm text-slate-400">
              Todavía no hay laboratorios de este paciente.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[#071A2F]">
                    <th className={`${nameCell} text-left`}>Parámetro</th>

                    {studies.map((lab, index) => (
                      <th
                        key={lab.id}
                        className={`px-3 py-2 text-left text-sm ${
                          index === 0 ? "text-cyan-300" : "text-slate-300"
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{studyDate(lab)}</span>
                          <CopyButton
                            text={copyText(lab)}
                            label="Copiar"
                            className="w-fit rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/20"
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => {
                    const rows = group.fields.filter((field) =>
                      studies.some((lab) => String(lab[field.name] ?? "").trim())
                    );

                    if (!rows.length) return null;

                    return (
                      <Fragment key={group.title}>
                        <tr className="bg-white/5">
                          <td
                            className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-300"
                            colSpan={studies.length + 1}
                          >
                            {group.title}
                          </td>
                        </tr>

                        {rows.map((field) => (
                          <tr key={field.name} className="border-t border-white/5">
                            <td className={nameCell}>{field.label}</td>

                            {studies.map((lab, index) => (
                              <td
                                key={lab.id}
                                className={`${cell} ${
                                  index === 0 ? "font-semibold text-white" : "text-slate-400"
                                }`}
                              >
                                {String(lab[field.name] ?? "").trim() || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}

                  {derivedRows.length > 0 ? (
                    <>
                      <tr className="bg-white/5">
                        <td
                          className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-300"
                          colSpan={studies.length + 1}
                        >
                          Calculados
                        </td>
                      </tr>

                      {derivedRows.map((row) => (
                        <tr key={row.key} className="border-t border-white/5">
                          <td className={nameCell}>{row.label}</td>

                          {derivedByStudy.map((map, index) => {
                            const result = map.get(row.key);

                            return (
                              <td
                                key={studies[index].id}
                                className={`${cell} ${
                                  result?.alert
                                    ? "font-semibold text-amber-200"
                                    : index === 0
                                      ? "font-semibold text-white"
                                      : "text-slate-400"
                                }`}
                              >
                                {result?.value ?? "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
