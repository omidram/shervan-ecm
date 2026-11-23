import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ORIGIN = "http://127.0.0.1:3004";

function redirectTo(pathname: string) {
  return NextResponse.redirect(new URL(pathname, ORIGIN));
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("sid")?.value;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", path);
  if (!token && path !== "/login" && !path.startsWith("/api/") && !path.startsWith("/models/")) {
    return redirectTo("/login");
  }
  if (token && path === "/login") {
    return redirectTo("/");
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
