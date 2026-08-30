// Indicaciones médicas: catálogo de categorías y su redacción en texto para
// alimentar el contexto de las notas de IA.

export type MedicalOrder = {
  id: string;
  category: string;
  description: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  suspended: boolean;
  suspended_at: string | null;
};

export const ORDER_CATEGORIES: Array<{ key: string; label: string; hint: string }> = [
  { key: "dieta", label: "Dieta", hint: "Ayuno, blanda, hiposódica…" },
  {
    key: "soluciones",
    label: "Soluciones e infusiones",
    hint: "Cristaloides, aminas, infusiones continuas",
  },
  {
    key: "inhaloterapia",
    label: "Inhaloterapia",
    hint: "Broncodilatadores, esteroide inhalado, oxígeno",
  },
  { key: "medicamentos", label: "Medicamentos", hint: "Esquema actual" },
];

function orderLine(order: MedicalOrder): string {
  return [order.description, order.dose, order.route, order.frequency]
    .filter(Boolean)
    .join(" ");
}

// Arma el esquema actual por categorías, más lo suspendido, que también importa:
// saber qué se retiró cambia el análisis y el plan.
export function formatOrdersText(
  orders: MedicalOrder[] | null | undefined
): string {
  const list = orders ?? [];
  if (!list.length) return "Sin indicaciones registradas.";

  const parts: string[] = [];

  for (const category of ORDER_CATEGORIES) {
    const activos = list.filter(
      (order) => order.category === category.key && !order.suspended
    );

    if (activos.length) {
      parts.push(`${category.label}: ${activos.map(orderLine).join("; ")}.`);
    }
  }

  const suspendidos = list.filter((order) => order.suspended);

  if (suspendidos.length) {
    parts.push(
      `Suspendidos: ${suspendidos
        .map((order) => {
          const fecha = order.suspended_at
            ? new Date(order.suspended_at).toLocaleDateString("es-MX")
            : null;
          return fecha ? `${orderLine(order)} (el ${fecha})` : orderLine(order);
        })
        .join("; ")}.`
    );
  }

  return parts.length ? parts.join("\n") : "Sin indicaciones registradas.";
}
