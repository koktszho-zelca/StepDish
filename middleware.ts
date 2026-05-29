import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/recipes(.*)',
  '/api/steps(.*)',
  '/api/import(.*)',
])

// Uses the async clerkMiddleware signature with auth.protect() —
// compatible with @clerk/nextjs ^6.x (installed in this project).
// The spec shows the legacy auth().protect() pattern from v5; v6 exposes
// protect() directly on the auth object without calling it as a function.
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
}
