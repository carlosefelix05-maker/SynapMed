"use client";

export default function ConfirmSubmitButton({
  children,
  message,
  className,
  formAction,
  name,
  value,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  // Permite que un mismo formulario tenga varias acciones (suspender, reanudar,
  // borrar) sin anidar formularios, que el HTML no permite.
  formAction?: (formData: FormData) => Promise<void>;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
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
