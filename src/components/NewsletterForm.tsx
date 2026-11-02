"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  return (
    <form
      className="flex w-full max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("Enter a valid email address.");
        toast.success("Subscribed! Watch your inbox for the next drop.");
        setEmail("");
      }}
    >
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="input flex-1"
        type="email"
        aria-label="Email address"
      />
      <button className="btn btn-primary" type="submit">
        <MailCheck size={16} /> Subscribe
      </button>
    </form>
  );
}
