"use client";

import Link from "next/link";
import { ServerCrash } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-rose-400/10 text-rose-300">
        <ServerCrash size={36} />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold">Something broke in the vault</h1>
      <p className="mt-2 max-w-md text-sm text-mute">
        {error.message || "An unexpected error occurred."} {error.digest ? `(ref ${error.digest})` : ""}
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline">Go home</Link>
      </div>
    </div>
  );
}
