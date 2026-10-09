import { calculateSuit } from "@/lib/legal/engine";
import { calculationSchema } from "@/lib/legal/validation";
import { CALCULATION_FEE_PAISE, paymentConfigured, publicPaymentKey } from "@/lib/payment";

export async function POST(request: Request) {
  try {
    const input = calculationSchema.parse(await request.json());
    if (!["ka", "tn", "mh", "dl"].includes(input.stateId)) {
      return Response.json({ ok: false, error: "Court-fee calculation is currently available for Karnataka, Tamil Nadu, Maharashtra and Delhi only. No payment has been taken." }, { status: 400 });
    }
    calculateSuit(input);

    if (!paymentConfigured()) {
      return Response.json({
        ok: true,
        mode: "demo",
        keyId: "",
        order: { id: `demo_${crypto.randomUUID()}`, amount: CALCULATION_FEE_PAISE, currency: "INR" },
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const authorization = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    let response: Response;
    try {
      response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: CALCULATION_FEE_PAISE,
          currency: "INR",
          receipt: `suit_${Date.now()}`,
          notes: { product: "AdvoHQ Suit Calculator", state: input.stateId, suit_type: input.suitType },
        }),
      });
    } catch {
      return Response.json({ ok: false, error: "Razorpay is currently unreachable. Please try again." }, { status: 500 });
    }
    if (!response.ok) {
      const status = response.status === 401 ? 401 : 500;
      return Response.json({
        ok: false,
        error: status === 401
          ? "Razorpay authentication failed. Check the configured API credentials."
          : "Razorpay could not create the payment order. Please try again.",
      }, { status });
    }
    const order = await response.json() as { id: string; amount: number; currency: string };
    return Response.json({
      ok: true,
      mode: "razorpay",
      keyId: publicPaymentKey(),
      order,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unable to prepare payment." }, { status: 400 });
  }
}
