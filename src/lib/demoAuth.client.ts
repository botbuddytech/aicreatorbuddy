import { AUTH_STORAGE_KEY } from "@/lib/dashboardContent";

/**
 * Demo login lives in localStorage; mirror it into a cookie so server code
 * (OAuth routes, server actions) can gate access. See demoAuth.server.ts.
 */
export function setDemoAuth() {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "1");
  document.cookie = `${AUTH_STORAGE_KEY}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearDemoAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
