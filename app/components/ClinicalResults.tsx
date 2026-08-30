import type { Derived } from "@/lib/clinical";

// Sin "use client" a propósito: lo usan tanto el expediente (servidor) como los
// formularios de captura (cliente).

export function ResultChip({ result }: { result: Derived }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        result.alert
          ? "border-amber-300/40 bg-amber-400/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-slate-300">{result.label}</span>
        {result.calculated ? (
          <span className="text-[10px] uppercase tracking-wide text-cyan-300">
            calculado
          </span>
        ) : null}
      </div>

      <p
        className={`mt-1 text-lg font-bold ${
          result.alert ? "text-amber-200" : "text-white"
        }`}
      >
        {result.value}
      </p>

      {result.helper ? (
        <p className="mt-1 text-[11px] leading-4 text-slate-400">{result.helper}</p>
      ) : null}
    </div>
  );
}

export default function ClinicalResults({
  results,
  columns = "sm:grid-cols-3 lg:grid-cols-4",
}: {
  results: Derived[];
  columns?: string;
}) {
  if (!results.length) return null;

  return (
    <div className={`grid gap-3 ${columns}`}>
      {results.map((result) => (
        <ResultChip key={result.key} result={result} />
      ))}
    </div>
  );
}
