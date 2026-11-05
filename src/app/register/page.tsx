import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";
import { resolveNext, sanitizeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  // Validate server-side: never redirect to (or hand the client) an unsafe destination.
  const next = sanitizeNext(rawNext) ?? undefined;
  if (await getSessionUser()) redirect(resolveNext(next));
  return (
    <div className="container-x flex justify-center py-8 sm:py-16">
      <div className="w-full max-w-md"><RegisterForm next={next} /></div>
    </div>
  );
}
