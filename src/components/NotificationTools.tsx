"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MarkAllReadButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-outline btn-sm"
      onClick={async () => {
        await fetch("/api/notifications/read", { method: "POST" });
        toast.success("All notifications marked as read");
        router.refresh();
      }}
    >
      Mark all read
    </button>
  );
}
