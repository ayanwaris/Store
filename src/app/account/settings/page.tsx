import { requireUser } from "@/lib/auth";
import { SettingsForm } from "@/components/SettingsForm";
import { formatDate } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Account settings</h2>
        <p className="mt-0.5 text-sm text-faint">
          Member since {formatDate(user.createdAt)} · {user.emailVerified ? "Email verified" : "Email unverified"}
        </p>
      </div>
      <SettingsForm name={user.name} email={user.email} />
    </div>
  );
}
