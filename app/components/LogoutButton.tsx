"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserContext = {
  name: string;
  email: string;
  role: string;
  team: string;
};

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUserContext() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();

      const { data: membership } = await supabase
        .from("team_members")
        .select("role, teams(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      const teamData = membership?.teams as { name?: string } | null;

      if (!mounted) return;

      setUserContext({
        name: profile?.full_name || user.email || "Usuario",
        email: profile?.email || user.email || "",
        role: membership?.role || profile?.role || "medico",
        team: teamData?.name || "Sin equipo",
      });
    }

    loadUserContext();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#071A2F]/90 px-4 py-3 text-sm shadow-lg backdrop-blur">
      <div className="hidden text-right md:block">
        <p className="font-semibold text-slate-100">
          {userContext?.name || "SynapMed"}
        </p>
        <p className="text-xs text-slate-400">
          {userContext?.role || "verificando"} · {userContext?.team || "equipo"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/20 disabled:opacity-60"
      >
        {loading ? "Cerrando..." : "Cerrar sesión"}
      </button>
    </div>
  );
}