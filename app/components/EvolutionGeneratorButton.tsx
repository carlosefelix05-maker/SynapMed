

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EvolutionGeneratorButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateEvolution() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo generar la evolución");
      }

      if (data?.noteUrl) {
        router.push(data.noteUrl);
        return;
      }

      if (data?.noteId) {
        router.push(`/patients/${patientId}/notes/${data.noteId}`);
        return;
      }

      router.refresh();
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
        onClick={generateEvolution}
        disabled={isLoading}
        className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Generando evolución..." : "Generar evolución"}
      </button>

      {error ? (
        <p className="max-w-xs text-right text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  );
}