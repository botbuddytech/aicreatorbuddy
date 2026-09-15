import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";
import { isGoogleAuthEnabled } from "@/lib/auth/google";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your AI Creator Buddy multi-channel workspace.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleAuthEnabled()} />;
}
