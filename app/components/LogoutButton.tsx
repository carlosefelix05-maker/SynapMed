

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="fixed right-4 top-4 z-50 rounded-xl border border-white/10 bg-[#071A2F]/90 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur hover:bg-white/10 disabled:opacity-60"
    >
      {loading ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}