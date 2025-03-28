import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
];

// Check if the current path is a public route
const isPublicRoute = (path: string) => {
  return publicRoutes.some(route => {
    // Exact match
    if (route === path) return true;
    // API route match (e.g., /api/auth/...)
    if (path.startsWith(route + '/')) return true;
    return false;
  });
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Allow public routes
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }
  
  // Check for authentication token
  // !!! SECURITY WARNING: Ensure NEXTAUTH_SECRET environment variable is set and matches the one in authOptions!
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET, 
  });
  
  // If no token and not a public route, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    // Add the current path as a redirect parameter
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }
  
  // User is authenticated, proceed
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g. robots.txt)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
