import { NextResponse } from "next/server";

// Define protected routes and their required roles
const protectedRoutes = {
  "/admin": "admin",
  "/admin/*": "admin",
  "/dashboard": "consumer",
  "/dashboard/*": "consumer",
  "/provider-dashboard": "provider",
  "/provider-dashboard/*": "provider",
};

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
];

// API routes that should be handled by backend
const apiRoutes = ["/api/*"];

function matchRoute(pathname, pattern) {
  if (pattern.endsWith("/*")) {
    const basePattern = pattern.slice(0, -2);
    return pathname.startsWith(basePattern);
  }
  return pathname === pattern;
}

function isPublicRoute(pathname) {
  return publicRoutes.some((route) => matchRoute(pathname, route));
}

function isApiRoute(pathname) {
  return apiRoutes.some((route) => matchRoute(pathname, route));
}

function getRequiredRole(pathname) {
  for (const [route, role] of Object.entries(protectedRoutes)) {
    if (matchRoute(pathname, route)) {
      return role;
    }
  }
  return null;
}

function isTokenValid(token) {
  if (!token) return false;

  try {
    // Decode JWT token
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;

    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      return false;
    }

    return { valid: true, payload };
  } catch (error) {
    return false;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const requiredRole = getRequiredRole(pathname);

  if (requiredRole) {
    // Get token from cookies or headers
    const token =
      request.cookies.get("authToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    const tokenValidation = isTokenValid(token);

    if (!tokenValidation || !tokenValidation.valid) {
      // Invalid or missing token - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { payload } = tokenValidation;
    const userRole = payload.role;

    // Check if user has required role
    if (userRole !== requiredRole && userRole !== "admin") {
      // User doesn't have required role - redirect to their dashboard
      let redirectPath = "/";
      switch (userRole) {
        case "admin":
          redirectPath = "/admin";
          break;
        case "consumer":
          redirectPath = "/dashboard";
          break;
        case "provider":
          redirectPath = "/provider-dashboard";
          break;
      }

      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes should trigger the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
