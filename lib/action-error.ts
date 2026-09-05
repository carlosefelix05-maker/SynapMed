// Cómo se comunican los fallos de las server actions.
//
// Antes cada acción hacía console.error y return: el usuario le daba a guardar,
// no pasaba nada y no había forma de saber por qué. En un expediente eso es
// peligroso, porque uno cree que quedó registrado.

export type ActionState = { message: string };

export const NO_ACTION_ERROR: ActionState = { message: "" };

type SupabaseLikeError = {
  message?: string | null;
  code?: string | null;
} | null;

// Postgrest a veces devuelve el error sin mensaje: pasa, por ejemplo, mientras
// su caché de esquema todavía no ve una tabla recién creada.
export function describeError(error: SupabaseLikeError, context: string): string {
  const detail = error?.message || error?.code || "";

  return detail
    ? `${context}: ${detail}`
    : `${context}. El servidor no devolvió detalle; espera unos segundos y vuelve a intentar.`;
}

// Para las acciones que redirigen: regresa a la misma página con el aviso.
export function withError(path: string, message: string): string {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}error=${encodeURIComponent(message)}`;
}
