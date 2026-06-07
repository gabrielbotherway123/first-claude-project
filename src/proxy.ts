import { auth } from "@/auth";

// Public routes that unauthenticated users may reach.
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up"];

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Unauthenticated user hitting a protected route → send to sign-in.
  if (!isLoggedIn && !isPublic) {
    const url = new URL("/sign-in", req.nextUrl);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  // Authenticated user on an auth page → send home.
  if (isLoggedIn && isPublic) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  // Run on all routes except API, Next internals, and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
