import { supabase } from "@/lib/supabase";

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  diagnosis: string | null;
  bed: string | null;
  priority: string | null;
};

export default async function Home() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("bed", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#071A2F] p-10 text-white">
        <h1 className="text-3xl font-bold">SynapMed</h1>
        <p className="mt-4 text-red-300">Error cargando pacientes.</p>
      </main>
    );
  }

  const list = (patients ?? []) as Patient[];

  return (
    <main className="min-h-screen bg-[#071A2F] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#061527] p-6 lg:block">
          <h1 className="text-2xl font-bold">SynapMed</h1>
          <p className="mb-8 text-xs text-cyan-300">
            Conectando la inteligencia médica
          </p>

          {["Synapse", "Rounds", "Patients", "Notes", "Calc", "Drugs", "Protocols"].map(
            (item) => (
              <button
                key={item}
                className={`mb-2 w-full rounded-xl px-4 py-3 text-left text-sm ${
                  item === "Rounds"
                    ? "bg-cyan-400 font-semibold text-slate-950"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            )
          )}
        </aside>

        <section className="flex-1 p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-slate-400">Buenos días,</p>
              <h2 className="text-3xl font-bold">Dr. Carlos</h2>
            </div>

            <div className="rounded-full bg-white/10 p-1">
              <button className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950">
                Hospital
              </button>
              <button className="px-5 py-2 text-sm text-slate-300">
                Consulta
              </button>
            </div>
          </header>

          <section className="mb-6 rounded-3xl bg-white/10 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">🏥 Rounds</h3>
                <p className="text-slate-300">
                  Medicina Interna · Pacientes desde Supabase
                </p>
              </div>

              <button className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950">
                Iniciar Pase
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Pacientes activos</p>
                <p className="mt-2 text-3xl font-bold">{list.length}</p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Críticos</p>
                <p className="mt-2 text-3xl font-bold text-red-400">
                  {list.filter((p) => p.priority === "Crítico").length}
                </p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Prioritarios</p>
                <p className="mt-2 text-3xl font-bold text-orange-300">
                  {list.filter((p) => p.priority === "Alta").length}
                </p>
              </div>

              <div className="rounded-2xl bg-[#071A2F] p-4">
                <p className="text-sm text-slate-400">Estables</p>
                <p className="mt-2 text-3xl font-bold text-green-300">
                  {list.filter((p) => p.priority === "Estable").length}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-6">
            <h3 className="mb-4 text-xl font-bold">Lista de pacientes</h3>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-5 bg-white/10 px-4 py-3 text-sm text-slate-300">
                <span>Cama</span>
                <span>Paciente</span>
                <span>Edad / Sexo</span>
                <span>Diagnóstico</span>
                <span>Prioridad</span>
              </div>

              {list.map((patient) => (
                <a
  href={`/patients/${patient.id}`}
  key={patient.id}
                  key={patient.id}
                  className="grid grid-cols-5 border-t border-white/10 px-4 py-4 text-sm"
                >
                  <span className="font-semibold">{patient.bed}</span>
                  <span>{patient.full_name}</span>
                  <span className="text-slate-300">
                    {patient.age} · {patient.sex}
                  </span>
                  <span className="text-slate-300">{patient.diagnosis}</span>
                  <span>{patient.priority}</span>
                </a>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}