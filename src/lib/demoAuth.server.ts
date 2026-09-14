import { cookies } from "next/headers";
import { AUTH_STORAGE_KEY } from "@/lib/dashboardContent";

/**
 * Interim server-side gate. The app still uses the demo localStorage login;
 * LoginForm mirrors it into a same-named cookie so server code can check it.
 * Replace with real auth (Auth.js / Supabase Auth) later.
 */
export async function isDemoAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(AUTH_STORAGE_KEY)?.value === "1";
}

export async function requireDemoAuth(): Promise<void> {
  if (!(await isDemoAuthed())) {
    throw new Error("UNAUTHORIZED");
  }
}
