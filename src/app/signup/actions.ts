"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@/generated/prisma/client";
import { signIn } from "@/lib/auth";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

export type SignUpState = {
  error?: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: SignUpState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Name is required.";
  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!EMAIL_RE.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }
  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "Email already used." } };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { fieldErrors: { email: "Email already used." } };
    }
    return { error: "Could not create your account. Please try again." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    throw error;
  }

  return {};
}
