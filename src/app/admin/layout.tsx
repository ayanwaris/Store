import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="container-x py-6 md:py-8">
      <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold font-display text-lg font-bold text-on-brand">
          KH
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold">Admin console</h1>
          <p className="truncate text-xs text-faint sm:text-sm">Signed in as {user.name} · every action is audit-logged</p>
        </div>
        <Link href="/" className="btn btn-outline btn-sm ml-auto shrink-0"><ArrowLeft size={14} /> <span className="hidden sm:inline">Marketplace</span><span className="sm:hidden">Shop</span></Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[230px_1fr] lg:gap-8">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
