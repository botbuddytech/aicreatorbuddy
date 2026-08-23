import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your AI Creator Buddy multi-channel workspace.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
