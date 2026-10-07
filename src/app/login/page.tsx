import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/lib/auth";
import { isGoogleAuthEnabled } from "@/lib/auth/google";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your AI Creator Buddy multi-channel workspace.",
  robots: { index: false, follow: false },
};

type LoginSearchParams = Promise<{ next?: string | string[] }>;

function safeNextPath(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user?.id) {
    redirect(safeNextPath(params.next));
  }
  return (
    <LoginForm
      googleEnabled={isGoogleAuthEnabled()}
      nextPath={safeNextPath(params.next)}
    />
  );
}
