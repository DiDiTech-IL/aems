import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/simulate(.*)',
  '/cases(.*)',
  '/protocols(.*)',
  '/analytics(.*)',
]);

/**
 * Clerk middleware — handles auth for every request.
 * Protected routes redirect to Clerk's sign-in page when the user is not authenticated.
 * Public routes (/, /login, /sign-in, static assets) pass through freely.
 */
export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
