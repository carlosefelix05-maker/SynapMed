"use client";

import { useActionState, useState } from "react";

export type PresentationFormState = { message: string };

export default function PresentationEditor({
  patientId,
  savePresentation,
  defaultContent,
  defaultDate,
  cancelHref,
}: {
  patientId: string;
  savePresentation: (
    state: PresentationFormState,
    formData: FormData
  ) => Promise<PresentationFormState>;
  defaultContent: string;
  defaultDate: string;
  cancelHref: string;
}) {
  const [content, setContent] = useState(defaultContent);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El texto vive en el estado del cliente: si el guardado falla, no se pierde.
  const [saveState, formAction, isSaving] = useActionState(savePresentation, {
    message: "",
  });

  async function generatePresentation() {
    if (
      content.trim() &&
      !window.confirm(
        "Ya hay texto escrito. La presentación generada lo va a reemplazar. ¿Continuar?"
      )
    ) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo generar la presentación");
      }

      setContent(data?.content || "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <label className="mb-2 block text-sm text-slate-400">Fecha del pase</label>
          <input
            type="date"
            name="presented_on"
            defaultValue={defaultDate}
            className="rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">
            Si ya existe una presentación de esa fecha, se actualiza.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <button
            type="button"
            onClick={generatePresentation}
            disabled={isGenerating}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Generando presentación..." : "🧠 Generar con IA"}
          </button>

          {error ? (
            <p className="max-w-xs text-xs text-red-300 md:text-right">{error}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Presentación</label>
        <textarea
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={18}
          placeholder="Motivo de ingreso, antecedentes, resumen clínico, evolución…"
          className="w-full rounded-2xl border border-white/10 bg-[#071A2F] p-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
        />
        <p className="mt-2 text-xs text-slate-500">
          Lo que genera la IA queda editable: revísalo antes de guardar.
        </p>
      </div>

      {saveState.message ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
        >
          {saveState.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar presentación"}
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
