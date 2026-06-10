"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role: "medico",
      });
    }

    setLoading(false);
    setMessage("Cuenta creada. Ahora puedes iniciar sesión.");
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061325] p-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-cyan-300">SynapMed</p>
          <h1 className="mt-2 text-3xl font-bold">Crear cuenta</h1>
          <p className="mt-2 text-sm text-slate-400">
            Registra tu correo para solicitar acceso al equipo
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="correo@hospital.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#071A2F] px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {message ? (
            <p className="rounded-xl bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
