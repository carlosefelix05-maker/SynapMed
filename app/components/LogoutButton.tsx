"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_TEAM_ID } from "@/lib/team";

type UserContext = {
  name: string;
  email: string;
  role: string;
  team: string;
};

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
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

      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("role, team_id")
        .eq("user_id", user.id)
        .eq("team_id", CURRENT_TEAM_ID)
        .maybeSingle();

      if (membershipError) {
        console.error("Error leyendo membresía:", membershipError);
      }

      let teamName = "SynapMed HGZ 49";

      if (membership?.team_id) {
        const { data: team, error: teamError } = await supabase
          .from("teams")
          .select("name")
          .eq("id", membership.team_id)
          .maybeSingle();

        if (teamError) {
          console.error("Error leyendo equipo:", teamError);
        }

        teamName = team?.name || "SynapMed HGZ 49";
      }

      if (!mounted) return;

      setUserContext({
        name: profile?.full_name || user.email || "Usuario",
        email: profile?.email || user.email || "",
        role: membership?.role || profile?.role || "medico",
        team: teamName,
      });
    }

    loadUserContext();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    setLoading(true);

    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Logout timeout")), 3000)
        ),
      ]);
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            localStorage.removeItem(key);
          }
        });

        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.error("Error limpiando sesión local:", storageError);
      }

      setLoading(false);
      window.location.replace("/login");
    }
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