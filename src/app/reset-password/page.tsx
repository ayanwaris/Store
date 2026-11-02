import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "New password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-x flex justify-center py-16">
      <div className="w-full max-w-md">
        {token ? (
          <ResetForm token={token} />
        ) : (
          <div className="card p-6 text-center">
            <p className="font-display font-bold">Missing reset token</p>
            <p className="mt-2 text-sm text-mute">Request a fresh password reset link.</p>
            <Link href="/forgot-password" className="btn btn-primary mt-4">Reset password</Link>
          </div>
        )}
      </div>
    </div>
  );
}
