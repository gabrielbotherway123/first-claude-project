import { auth } from "@/auth";

// Public routes that unauthenticated users may reach.
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up"];

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Unauthenticated user hitting a protected route → send to sign-in.
  // We deliberately do NOT bounce authenticated users away from the auth pages:
  // a token whose user no longer exists must be able to reach /sign-in without
  // an infinite redirect loop (protected page → /sign-in → home → …). The auth
  // form redirects home itself once a fresh, valid session is established.
  if (!isLoggedIn && !isPublic) {
    const url = new URL("/sign-in", req.nextUrl);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  // Run on all routes except API, Next internals, and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
