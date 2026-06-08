"use client";

export default function ConfirmSubmitButton({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
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
