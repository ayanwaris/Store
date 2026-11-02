import Link from "next/link";
import { Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-raised text-faint">
        <Ghost size={36} />
      </span>
      <h1 className="mt-6 font-display text-4xl font-bold">404 — lost in the vault</h1>
      <p className="mt-2 max-w-md text-sm text-mute">
        This page never existed, was moved, or its key has already been redeemed.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-primary">Back to homepage</Link>
        <Link href="/search" className="btn btn-outline">Browse the catalog</Link>
      </div>
    </div>
  );
}
