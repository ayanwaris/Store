"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard, Wallet, IndianRupee, Sparkles, Lock, Tag,
  CheckCircle2, AlertTriangle, RotateCcw, ArrowLeft, Loader2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn, fmtEUR } from "@/lib/utils";

const METHODS = [
  { id: "card", label: "Credit / Debit Card", note: "Visa · Mastercard · AMEX — sandbox", icon: CreditCard, enabled: true },
  { id: "paypal", label: "PayPal", note: "Simulated redirect flow — sandbox", icon: Wallet, enabled: true },
  { id: "razorpay", label: "Razorpay · UPI / NetBanking", note: "Wire RAZORPAY_KEY_ID to enable", icon: IndianRupee, enabled: false },
  { id: "stripe", label: "Stripe Checkout", note: "Wire STRIPE_SECRET_KEY to enable", icon: Sparkles, enabled: false },
];

type Item = { itemId: string; title: string; platform: string; sellerName: string; price: number; quantity: number };

export default function CheckoutClient({ userName, items, totals, couponCode }: {
  userName: string;
  items: Item[];
  totals: { subtotal: number; discount: number; fee: number; total: number };
  couponCode?: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState("card");
  const [summaryOpen, setSummaryOpen] = useState(false); // phones: order summary starts collapsed
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [phase, setPhase] = useState<"form" | "processing" | "failed">("form");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const pay = async () => {
    setPhase("processing");
    setError("");
    try {
      // 1. create order (server computes totals, reserves keys)
      const createRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? "Could not create order");

      const id = createJson.data.orderId as string;
      const number = createJson.data.number as string;
      setOrderId(id);

      // 2. confirm/capture through the provider (sandbox)
      const confirmRes = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, cardNumber: method === "card" ? card : undefined }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok || !confirmJson.ok) {
        setPhase("failed");
        setError(confirmJson.error ?? "Payment was declined.");
        return;
      }
      toast.success("Payment successful!");
      router.push(`/order/${number}?paid=1`);
    } catch (e) {
      setPhase("form");
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    }
  };

  const cancelOrder = async () => {
    if (!orderId) return;
    await fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    toast("Order cancelled — stock released back to your cart options.");
    router.push("/cart");
  };

  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const summaryBody = (
    <>
          <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.itemId} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}{i.quantity > 1 ? ` ×${i.quantity}` : ""}</p>
                  <p className="text-[11px] text-faint">{i.platform} · {i.sellerName}</p>
                </div>
                <span className="shrink-0 font-semibold">{fmtEUR(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{fmtEUR(totals.subtotal)}</dd></div>
            {couponCode && totals.discount > 0 && (
              <div className="flex justify-between text-mint">
                <dt className="flex items-center gap-1"><Tag size={12} /> {couponCode}</dt>
                <dd>−{fmtEUR(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-mute">Service fee</dt><dd>{fmtEUR(totals.fee)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="font-bold">Total</dt>
              <dd className="font-display text-xl font-bold text-brand-bright">{fmtEUR(totals.total)}</dd>
            </div>
          </dl>
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
      {/* left: payment */}
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Secure checkout</h1>
        <p className="mt-1 text-sm text-mute">
          Welcome back, {userName}. This is a sandbox payment environment — no real money moves.
        </p>

        {/* phones: collapsed order summary (the full card stays in the right column on desktop) */}
        <div className="card mt-4 p-4 lg:hidden">
          <button type="button" className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={summaryOpen} onClick={() => setSummaryOpen((v) => !v)}>
            <span className="text-sm font-bold">Order summary <span className="font-normal text-faint">· {itemCount} item{itemCount === 1 ? "" : "s"}</span></span>
            <span className="flex items-center gap-2">
              <span className="font-display font-bold text-brand-bright">{fmtEUR(totals.total)}</span>
              <ChevronDown size={16} className={cn("text-faint transition", summaryOpen && "rotate-180")} />
            </span>
          </button>
          {summaryOpen && summaryBody}
        </div>

        {/* payment methods */}
        <div className="mt-6 space-y-2.5">
          {METHODS.map((m) => (
            <button
              key={m.id}
              disabled={!m.enabled || phase === "processing"}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition",
                method === m.id ? "border-brand/60 bg-brand/5" : "border-line bg-card hover:border-line/80 hover:bg-raised/40",
                !m.enabled && "opacity-45 cursor-not-allowed",
              )}
            >
              <span className={cn("grid h-10 w-10 place-items-center rounded-lg", method === m.id ? "bg-brand/15 text-brand" : "bg-raised text-mute")}>
                <m.icon size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{m.label}</span>
                <span className="block text-xs text-faint">{m.note}</span>
              </span>
              <span className={cn("h-4 w-4 rounded-full border-2", method === m.id ? "border-brand bg-brand" : "border-line")} />
            </button>
          ))}
        </div>

        {/* card fields (sandbox) */}
        {method === "card" && phase === "form" && (
          <div className="card mt-4 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">Card details</p>
              <span className="chip max-w-full whitespace-normal text-left text-[10px]">Test: 4242 4242 4242 4242 · declines: 4000 0000 0000 0002</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_110px_110px]">
              <input
                className="input col-span-2 font-mono tracking-wider sm:col-span-1"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                value={card}
                onChange={(e) => setCard(fmtCard(e.target.value))}
                aria-label="Card number"
              />
              <input
                className="input font-mono"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="12/28"
                value={expiry}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                }}
                aria-label="Expiry"
              />
              <input
                className="input font-mono"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                aria-label="CVC"
              />
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-faint">
              <Lock size={11} /> Card numbers are processed by the payment provider and never stored.
            </p>
          </div>
        )}

        {phase === "failed" && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-200">
              <AlertTriangle size={15} /> Payment failed
            </p>
            <p className="mt-1 text-sm text-rose-200/80">{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => setPhase("form")}>
                <RotateCcw size={13} /> Try again
              </button>
              <button className="btn btn-danger btn-sm" onClick={cancelOrder}>Cancel order &amp; release stock</button>
            </div>
          </div>
        )}

        {phase === "form" && (
          <button
            className="btn btn-primary btn-lg mt-6 w-full sm:w-auto"
            onClick={pay}
            disabled={method === "card" && card.replace(/\s/g, "").length < 16}
          >
            <Lock size={16} /> Pay {fmtEUR(totals.total)}
          </button>
        )}
        <p className="mt-3 flex items-start gap-2 text-xs text-faint lg:hidden">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-mint" />
          Keys are reserved while you pay. Delivery is instant after payment.
        </p>

        <Link href="/cart" className="btn btn-ghost btn-sm mt-4">
          <ArrowLeft size={14} /> Back to cart
        </Link>
      </div>

      {/* right: summary */}
      <div className="h-fit lg:sticky lg:top-36">
        <div className="card hidden p-5 lg:block">
          <h2 className="font-display font-bold">Your order</h2>
          {summaryBody}
        </div>
        <div className="card mt-3 hidden items-start gap-2.5 p-4 text-xs text-mute lg:flex">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-mint" />
          Keys are reserved for you while you pay. Delivery is instant: they appear in your library
          right after the payment succeeds.
        </div>

        {phase === "processing" && (
          <div className="card mt-3 p-5 text-center">
            <Loader2 size={26} className="mx-auto animate-spin text-brand" />
            <p className="mt-3 text-sm font-semibold">Contacting the payment provider…</p>
            <p className="mt-1 text-xs text-faint">Encrypting, authorizing, capturing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
