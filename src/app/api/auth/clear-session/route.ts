import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/** Drop a session cookie Auth.js cannot decrypt, then send the user to log in. */
export function GET(request: Request) {
  const login = new URL("/login", request.url);
  const response = NextResponse.redirect(login);
  for (const name of SESSION_COOKIES) {
    const secure = name.startsWith("__Secure-");
    response.cookies.set(name, "", { path: "/", maxAge: 0, secure, httpOnly: true, sameSite: "lax" });
    for (let index = 0; index < 4; index += 1) {
      response.cookies.set(`${name}.${index}`, "", {
        path: "/",
        maxAge: 0,
        secure,
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }
  return response;
}
