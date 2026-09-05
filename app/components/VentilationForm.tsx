"use client";

import { useActionState, useMemo, useState } from "react";
import { derivedVentilation } from "@/lib/clinical";
import ClinicalResults from "@/app/components/ClinicalResults";
import ActionError from "@/app/components/ActionError";
import { NO_ACTION_ERROR, type ActionState } from "@/lib/action-error";

const MODOS = [
  "A/C volumen",
  "A/C presión",
  "SIMV",
  "PSV / CPAP",
  "PRVC",
  "Otro",
];

const PARAMS = [
  { name: "vt", label: "VT programado", suffix: "ml" },
  { name: "fr", label: "FR", suffix: "rpm" },
  { name: "peep", label: "PEEP", suffix: "cmH₂O" },
  { name: "fio2", label: "FiO₂", suffix: "%" },
  { name: "pplat", label: "Pplat", suffix: "cmH₂O" },
  { name: "ppico", label: "Ppico", suffix: "cmH₂O" },
  { name: "pao2", label: "PaO₂", suffix: "mmHg" },
];


export default function VentilationForm({
  createVentilation,
  sex,
  heightCm,
  cancelHref,
  editHref,
}: {
  createVentilation: (
    state: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
  sex: string | null;
  heightCm: number | null;
  cancelHref: string;
  editHref: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    modo: MODOS[0],
  });

  const [saveState, formAction, isSaving] = useActionState(
    createVentilation,
    NO_ACTION_ERROR
  );

  function update(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  const derived = useMemo(
    () => derivedVentilation({ ...values, sex, heightCm }),
    [values, sex, heightCm]
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-400">
            Fecha y hora
          </span>
          <input
            type="datetime-local"
            name="recorded_at"
            className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-400">
            Modo ventilatorio
          </span>
          <select
            name="modo"
            value={values.modo}
            onChange={(event) => update("modo", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none"
          >
            {MODOS.map((modo) => (
              <option key={modo} value={modo}>
                {modo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PARAMS.map((param) => (
          <label key={param.name} className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              {param.label} <span className="text-slate-600">({param.suffix})</span>
            </span>
            <input
              name={param.name}
              value={values[param.name] ?? ""}
              onChange={(event) => update(param.name, event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-3 py-2 text-white outline-none focus:border-cyan-300/60"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-400">
          Notas del ventilador
        </span>
        <textarea
          name="notes"
          rows={3}
          value={values.notes ?? ""}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Tolerancia, sedación, plan de destete…"
          className="w-full rounded-2xl border border-white/10 bg-[#071A2F] p-4 text-white outline-none placeholder:text-slate-600"
        />
      </label>

      {heightCm === null ? (
        <p className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Este paciente no tiene talla registrada, así que no se puede calcular el
          peso predicho ni el VT protector.{" "}
          <a href={editHref} className="font-semibold underline">
            Captúrala en los datos del paciente
          </a>
          .
        </p>
      ) : null}

      {derived.length > 0 ? (
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <h2 className="mb-1 text-lg font-bold text-cyan-300">
            Cálculos automáticos
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Se recalculan mientras capturas, con la talla y el sexo del paciente.
          </p>

          <ClinicalResults results={derived} />
        </div>
      ) : null}

      <ActionError message={saveState.message} />

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar parámetros"}
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
