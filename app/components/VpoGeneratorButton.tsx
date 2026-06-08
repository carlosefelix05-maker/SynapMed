

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VpoGeneratorButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateVpo() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/vpo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "No se pudo generar la VPO");
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
        onClick={generateVpo}
        disabled={isLoading}
        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Generando VPO..." : "Generar VPO"}
      </button>

      {error ? (
        <p className="max-w-xs text-right text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  );
}