"use client";

export default function ConfirmSubmitButton({
  children,
  message,
  className,
  formAction,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  // Permite que un mismo formulario tenga varias acciones (suspender, reanudar,
  // borrar) sin anidar formularios, que el HTML no permite.
  //
  // No acepta name/value a propósito: cuando formAction recibe una función,
  // React usa el name/value del botón para codificar qué acción invocar y
  // sobrescribe el que uno ponga. Los argumentos van con action.bind(null, id).
  formAction?: (formData: FormData) => Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      onClick={(event) => {
        if (!confirm(message)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
