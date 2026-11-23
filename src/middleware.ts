import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function redirectTo(request: NextRequest, pathname: string) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "127.0.0.1:3000";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" ? "https" : "http";
  return NextResponse.redirect(new URL(pathname, `${proto}://${host}`));
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("sid")?.value;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", path);
  if (!token && path !== "/login" && !path.startsWith("/api/") && !path.startsWith("/models/")) {
    return redirectTo(request, "/login");
  }
  if (token && path === "/login") {
    return redirectTo(request, "/");
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
