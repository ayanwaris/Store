import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSessionUser()) redirect(next ?? "/");
  return (
    <div className="container-x flex justify-center py-8 sm:py-16">
      <div className="w-full max-w-md"><LoginForm next={next} /></div>
    </div>
  );
}
