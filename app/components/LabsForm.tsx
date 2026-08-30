"use client";

import { useMemo, useState } from "react";
import {
  derivedLabs,
  interpretGases,
  type PatientContext,
} from "@/lib/clinical";
import ClinicalResults from "@/app/components/ClinicalResults";
import {
  QUIMICA,
  BIOMETRIA,
  COAGULACION,
  GASOMETRIA,
  type LabField,
} from "@/lib/labs-fields";


function Section({
  title,
  hint,
  fields,
  values,
  onChange,
}: {
  title: string;
  hint?: string;
  fields: LabField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-cyan-300">{title}</h2>
        {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              {field.label}
            </span>
            <input
              name={field.name}
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
              placeholder={field.placeholder}
              inputMode="decimal"
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function LabsForm({
  createLabs,
  patient,
  cancelHref,
  defaultDate,
}: {
  createLabs: (formData: FormData) => Promise<void>;
  patient: PatientContext;
  cancelHref: string;
  defaultDate: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  function update(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  const derived = useMemo(() => derivedLabs(values, patient), [values, patient]);
  const gases = useMemo(() => interpretGases(values, patient), [values, patient]);

  return (
    <form action={createLabs} className="space-y-8">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-400">
          Fecha de toma
        </span>
        <input
          type="date"
          name="sampled_on"
          defaultValue={defaultDate}
          className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Cámbiala para capturar laboratorios anteriores. El historial se ordena
          por esta fecha.
        </span>
      </label>

      <Section
        title="Química sanguínea"
        fields={QUIMICA}
        values={values}
        onChange={update}
      />

      <Section
        title="Biometría hemática"
        hint="VCM, HCM y CHCM se calculan solos si dejas el campo vacío y capturas Hb, Hto y Eri."
        fields={BIOMETRIA}
        values={values}
        onChange={update}
      />

      <Section
        title="Coagulación"
        fields={COAGULACION}
        values={values}
        onChange={update}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-cyan-300">Gasometría</h2>
            <p className="text-xs text-slate-400">
              Con pH, pCO₂ y HCO₃ se interpreta sola el trastorno ácido-base.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              Tipo
            </span>
            <select
              name="gaso_tipo"
              value={values.gaso_tipo ?? "arterial"}
              onChange={(event) => update("gaso_tipo", event.target.value)}
              className="rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none"
            >
              <option value="arterial">Arterial</option>
              <option value="venosa">Venosa</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {GASOMETRIA.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">
                {field.label}
              </span>
              <input
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={(event) => update(field.name, event.target.value)}
                placeholder={field.placeholder}
                inputMode="decimal"
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-cyan-300">Otros</h2>
        <textarea
          name="otros"
          rows={3}
          value={values.otros ?? ""}
          onChange={(event) => update("otros", event.target.value)}
          placeholder="Cualquier parámetro que no tenga campo propio"
          className="w-full rounded-2xl border border-white/10 bg-[#071A2F] p-4 text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {derived.length > 0 || gases ? (
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <h2 className="mb-1 text-lg font-bold text-cyan-300">
            Cálculos automáticos
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Se recalculan mientras capturas. No se guardan: se derivan de los
            valores, así que siempre corresponden a lo que está en el expediente.
          </p>

          {derived.length > 0 ? (
            <ClinicalResults results={derived} />
          ) : null}

          {gases ? (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-bold text-cyan-300">Gasometría</h3>

              <ClinicalResults
                results={gases.results}
                columns="sm:grid-cols-2 lg:grid-cols-3"
              />

              {gases.interpretation ? (
                <p className="mt-3 rounded-2xl bg-[#071A2F] p-4 text-sm leading-6 text-slate-200">
                  {gases.interpretation}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Guardar laboratorios
        </button>

        <a
          href={cancelHref}
          className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-slate-200 hover:bg-white/20"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
