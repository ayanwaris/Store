import { requireUser } from "@/lib/auth";
import AccountNav from "@/components/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-x py-6 md:py-8">
      <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold text-white sm:h-14 sm:w-14"
          style={{ background: `hsl(${user.avatarHue} 65% 42%)` }}
        >
          {user.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold">{user.name}</h1>
          <p className="truncate text-sm text-faint">{user.email}{user.role === "admin" ? " · administrator" : ""}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-8">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
