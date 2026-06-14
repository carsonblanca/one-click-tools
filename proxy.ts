import { NextResponse, type NextRequest } from "next/server";

function getLocaleFromPathname(pathname: string) {
  if (pathname === "/zh-cn" || pathname.startsWith("/zh-cn/")) {
    return "zh-CN";
  }

  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) {
    return "zh-TW";
  }

  return "en";
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-oneclick-locale",
    getLocaleFromPathname(request.nextUrl.pathname),
  );

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
