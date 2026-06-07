"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SynapseProButton({
  patientId,
  patient,
  latestLabs,
  labTrends,
  timeline,
  notes,
}: any) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSynapsePro() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/synapse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          patient,
          latestLabs,
          labTrends,
          timeline,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo generar Synapse Pro");
      }

      router.refresh();

      if (data?.noteId) {
        router.push(`/patients/${patientId}/notes/${data.noteId}`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={generateSynapsePro}
        disabled={isLoading}
        className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Generando..." : "Generar análisis"}
      </button>

      {error ? <p className="max-w-xs text-right text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
