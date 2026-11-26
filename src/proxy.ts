import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";

/**
 * Sends anyone without a valid session to /login.
 * Public paths: the login page, the tokenized pay page, and PWA assets.
 * Pages and Server Actions check the session again themselves.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const ok = verifySessionToken(token, process.env.SESSION_SECRET ?? "");
  if (ok) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|pay/|offline|_next/|icons/|manifest.webmanifest|sw.js|favicon.ico|icon.png|robots.txt|diary-template.csv).*)",
  ],
};
