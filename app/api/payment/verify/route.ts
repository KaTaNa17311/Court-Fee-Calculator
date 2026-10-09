import { z } from "zod";
import { calculateSuit } from "@/lib/legal/engine";
import { calculationSchema } from "@/lib/legal/validation";
import { paymentConfigured, verifyRazorpaySignature } from "@/lib/payment";

const verificationSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string(),
  input: calculationSchema,
});

export async function POST(request: Request) {
  try {
    const body = verificationSchema.parse(await request.json());
    const demo = !paymentConfigured() && body.orderId.startsWith("demo_") && body.paymentId === "demo_payment";
    const verified = demo || await verifyRazorpaySignature(body.orderId, body.paymentId, body.signature);
    if (!verified) return Response.json({ ok: false, error: "Payment signature verification failed." }, { status: 400 });
    if (!["ka", "tn", "mh"].includes(body.input.stateId)) return Response.json({ ok: false, error: "This State rule pack is not available yet." }, { status: 400 });
    return Response.json({ ok: true, mode: demo ? "demo" : "paid", result: calculateSuit(body.input) });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unable to verify payment." }, { status: 400 });
  }
}
