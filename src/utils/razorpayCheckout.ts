// Opens Razorpay Checkout (their hosted payment window) for an order the server created. The card, UPI or netbanking details are
// typed into Razorpay's window and never reach this app; we only get back the ids and the signature the server then verifies.

interface RazorpaySuccess { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
interface RazorpayInstance { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void }
declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const el = existing ?? document.createElement("script");
    el.addEventListener("load", () => resolve(true), { once: true });
    el.addEventListener("error", () => resolve(false), { once: true });
    if (!existing) { el.src = SCRIPT; el.async = true; document.body.appendChild(el); }
  });
}

export type CheckoutResult =
  | { status: "paid"; providerOrderId: string; providerPaymentId: string; signature: string }
  | { status: "cancelled" }
  | { status: "failed"; message: string };

export async function openRazorpayCheckout(opts: {
  keyId: string; orderId: string; amount: number; currency: string; name: string; description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<CheckoutResult> {
  if (!(await loadScript()) || !window.Razorpay) return { status: "failed", message: "The payment window could not be loaded. Check your connection and try again." };
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: CheckoutResult) => { if (!settled) { settled = true; resolve(r); } };
    const rzp = new window.Razorpay!({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: "#1F65FF" },
      handler: (r: RazorpaySuccess) => done({ status: "paid", providerOrderId: r.razorpay_order_id, providerPaymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => done({ status: "cancelled" }) },
    });
    rzp.on("payment.failed", (r) => done({ status: "failed", message: r.error?.description || "The payment did not go through." }));
    rzp.open();
  });
}
