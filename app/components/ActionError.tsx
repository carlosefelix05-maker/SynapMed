// Aviso de error de una server action. Sin "use client": lo pintan páginas de
// servidor a partir del parámetro ?error=, y también los formularios de
// cliente con el estado de useActionState.

export default function ActionError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className="mb-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-200"
    >
      {message}
    </p>
  );
}
