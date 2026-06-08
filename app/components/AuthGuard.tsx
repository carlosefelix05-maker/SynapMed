"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  const isPublicRoute = pathname === "/login";

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      if (isPublicRoute) {
        setChecking(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isPublicRoute) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isPublicRoute, router]);

  if (checking && !isPublicRoute) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#061325] p-6 text-white">
        <section className="rounded-3xl border border-white/10 bg-white/10 p-8 text-center">
          <p className="text-sm font-semibold text-cyan-300">SynapMed</p>
          <p className="mt-3 text-slate-300">Verificando sesión...</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}