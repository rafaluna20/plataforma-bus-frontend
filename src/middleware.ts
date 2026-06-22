import { NextRequest, NextResponse } from "next/server";

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ["/admin", "/driver", "/booking", "/superadmin", "/empresa"];

// Rutas exclusivas para roles específicos
const ROLE_ROUTES: Record<string, string[]> = {
  "/superadmin": ["SUPER_ADMIN"],
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/driver": ["DRIVER", "ADMIN", "SUPER_ADMIN"],
};

// Rutas de empresa que son PÚBLICAS (no requieren auth)
const PUBLIC_EMPRESA_ROUTES = [
  /^\/empresa\/[^/]+$/,                    // /empresa/[slug]
  /^\/empresa\/[^/]+\/viaje\/[^/]+$/,      // /empresa/[slug]/viaje/[tripId]
];

// Rutas de autenticación (redirigir si ya está logueado)
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leer el access token del localStorage no es posible en middleware (server-side).
  // En su lugar, usamos una cookie de sesión que el frontend debe establecer.
  // El access token JWT se almacena en localStorage (client-side) y la cookie
  // 'session_role' se establece al hacer login para que el middleware pueda leer el rol.
  const sessionRole = request.cookies.get("session_role")?.value;
  const isAuthenticated = !!sessionRole;

  // Verificar si es una ruta pública de empresa (no requiere auth)
  const isPublicEmpresaRoute = PUBLIC_EMPRESA_ROUTES.some(re => re.test(pathname));

  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = !isPublicEmpresaRoute && PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Verificar si es una ruta de auth (login/register)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Si está en una ruta protegida y no está autenticado → redirigir a login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está autenticado y va a login/register → redirigir según rol
  if (isAuthRoute && isAuthenticated) {
    if (sessionRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", request.url));
    } else if (sessionRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else if (sessionRole === "DRIVER") {
      return NextResponse.redirect(new URL("/driver", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Verificar permisos por rol para rutas específicas
  if (isAuthenticated && sessionRole) {
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(sessionRole)) {
        // Redirigir a página de acceso denegado o al home
        return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos públicos (imágenes, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
