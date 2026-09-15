/** Env-only helper — keep this free of Prisma so static pages can import it. */
export function isGoogleAuthEnabled(): boolean {
  return (
    Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET)
  );
}
