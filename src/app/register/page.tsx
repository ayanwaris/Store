import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSessionUser()) redirect(next ?? "/");
  return (
    <div className="container-x flex justify-center py-16">
      <div className="w-full max-w-md"><RegisterForm next={next} /></div>
    </div>
  );
}
