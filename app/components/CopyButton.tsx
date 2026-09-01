"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "Copiar",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // El portapapeles falla en contextos sin permiso o sin https:
      // se copia con una selección temporal.
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();

      try {
        document.execCommand("copy");
      } finally {
        helper.remove();
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      className={
        className ??
        "rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {copied ? "✓ Copiado" : label}
    </button>
  );
}
