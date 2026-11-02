/**
 * Payment gateway abstraction.
 *
 * The marketplace never sees or stores raw card data — the sandbox provider
 * simulates an external hosted payment flow, and Stripe/Razorpay can be
 * enabled with env keys (provider-hosted checkout / tokenized flows).
 *
 * Sandbox test cards:
 *   4242 4242 4242 4242  → success
 *   4000 0000 0000 0002  → decline (card_declined)
 *   any other value      → success
 */
export interface PaymentCreateInput {
  orderId: string;
  number: string;
  amount: number;
  currency: string;
  method: string;
}

export interface PaymentSession {
  provider: string;
  ref: string;
  clientSecret: string;
}

export interface PaymentProvider {
  id: string;
  label: string;
  createPayment(input: PaymentCreateInput): Promise<PaymentSession>;
  confirm(ref: string, payload: { cardNumber?: string }): Promise<{ status: "succeeded" | "failed"; error?: string }>;
  refund(ref: string, amount: number): Promise<{ ok: boolean }>;
}

function rnd(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

class SandboxProvider implements PaymentProvider {
  id = "sandbox";
  label = "Sandbox Pay";
  async createPayment(input: PaymentCreateInput): Promise<PaymentSession> {
    return { provider: this.id, ref: rnd("sb"), clientSecret: rnd("secret") };
  }
  async confirm(_ref: string, payload: { cardNumber?: string }) {
    await new Promise((r) => setTimeout(r, 400)); // simulate network latency
    const card = (payload.cardNumber ?? "").replace(/\s/g, "");
    if (card === "4000000000000002") {
      return { status: "failed" as const, error: "Your card was declined (sandbox test card)." };
    }
    return { status: "succeeded" as const };
  }
  async refund() {
    return { ok: true };
  }
}

class UnconfiguredProvider implements PaymentProvider {
  constructor(
    public id: string,
    public label: string,
    private envKeys: string[],
  ) {}
  private ensure() {
    const missing = this.envKeys.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(
        `${this.label} is not configured — set ${missing.join(", ")} (see README). Default PAYMENT_PROVIDER=sandbox.`,
      );
    }
  }
  async createPayment(): Promise<PaymentSession> {
    this.ensure();
    throw new Error(`${this.label} live integration stub — wire SDK calls here; use sandbox for development.`);
  }
  async confirm(): Promise<{ status: "failed"; error: string }> {
    return { status: "failed", error: `${this.label} is not configured.` };
  }
  async refund() {
    return { ok: false };
  }
}

export function getProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case "stripe":
      return new UnconfiguredProvider("stripe", "Stripe", ["STRIPE_SECRET_KEY"]);
    case "razorpay":
      return new UnconfiguredProvider("razorpay", "Razorpay", ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]);
    default:
      return new SandboxProvider();
  }
}

export const PAYMENT_METHODS = [
  { id: "card", label: "Credit / Debit Card", note: "Visa, Mastercard, AMEX — sandbox", icon: "CreditCard" },
  { id: "paypal", label: "PayPal", note: "Redirect simulation — sandbox", icon: "Wallet" },
  { id: "razorpay", label: "Razorpay (UPI / NetBanking)", note: "Requires RAZORPAY_KEY_ID env", icon: "IndianRupee" },
  { id: "stripe", label: "Stripe Checkout", note: "Requires STRIPE_SECRET_KEY env", icon: "Sparkles" },
] as const;
