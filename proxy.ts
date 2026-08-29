import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

  // App de pase de visita: archivo estático en /public, con su propio inicio de sesión
  // contra Supabase. Se deja fuera del portal para poder abrirlo desde el iPad.
  const isPaseApp = pathname === "/pase.html" || pathname === "/pase";

  const localEmail = process.env.LOCAL_USER_EMAIL;
  const localPassword = process.env.LOCAL_USER_PASSWORD;

  const localMode =
    process.env.NODE_ENV === "development" &&
    Boolean(localEmail) &&
    Boolean(localPassword);

  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (localMode && !user) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: localEmail!,
      password: localPassword!,
    });

    if (!error && data.user) {
      user = data.user;

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        isLoginPage || isRegisterPage ? "/" : pathname;

      const redirectResponse = NextResponse.redirect(redirectUrl);

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });

      return redirectResponse;
    }
  }

  if (localMode && user && (isLoginPage || isRegisterPage)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  if (!localMode) {
    if (!user && !isLoginPage && !isRegisterPage && !isPaseApp) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";

      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|pase.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};