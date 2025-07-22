// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
//
// export async function middleware(request: NextRequest) {
//   const token = request.cookies.get("token");
//   console.log("Token:", token);
//
//   // Define protected paths
//   const protectedPaths = ["/space"];
//
//   const isProtectedPath = protectedPaths.some((path) =>
//     request.nextUrl.pathname.startsWith(path),
//   );
//
//   if (isProtectedPath && !token) {
//     const loginUrl = new URL("/auth/login", request.url);
//     loginUrl.searchParams.set(
//       "redirect",
//       request.nextUrl.pathname + request.nextUrl.search,
//     );
//     return NextResponse.redirect(loginUrl);
//   }
//
//   return NextResponse.next();
// }
//
// export const config = {
//   matcher: ["/space/:path*"],
// };
