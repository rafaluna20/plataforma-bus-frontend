import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

interface SessionPayload {
  role: string;
}

/**
 * Verifica la sesión llamando a GET /api/v1/auth/me en el backend, reenviando
 * las cookies de la petición entrante. El access token vive en una cookie
 * httpOnly puesta por el backend (dominio distinto al del frontend), así que
 * el middleware no puede decodificarla localmente — solo el backend puede
 * validarla. Cualquier fallo (sin cookie, token inválido/expirado, timeout,
 * backend caído) se trata como "no autenticado" (fail-closed): antes esta
 * función confiaba en una cookie `session_role` de puro texto que cualquiera
 * podía escribir desde devtools para saltarse el gate de /admin, /superadmin
 * y /driver.
 */
async function verifySession(request: NextRequest): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const user = await res.json();
    if (typeof user?.role !== "string") return null;
    return { role: user.role };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await verifySession(request);
  const isAuthenticated = !!session;
  const role = session?.role;

  // Verificar si es una ruta pública de empresa (no requiere auth)
  const isPublicEmpresaRoute = PUBLIC_EMPRESA_ROUTES.some(re => re.test(pathname));

  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = !isPublicEmpresaRoute && PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Verificar si es una ruta de auth (login/register)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Si está en una ruta protegida y no está autenticado (o el token es
  // inválido/expiró) → redirigir a login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está autenticado y va a login/register → redirigir según rol
  if (isAuthRoute && isAuthenticated) {
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", request.url));
    } else if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else if (role === "DRIVER") {
      return NextResponse.redirect(new URL("/driver", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Verificar permisos por rol para rutas específicas
  if (isAuthenticated && role) {
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
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
