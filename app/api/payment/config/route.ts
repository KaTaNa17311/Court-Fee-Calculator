import { CALCULATION_FEE_PAISE, paymentConfigured } from "@/lib/payment";

export async function GET() {
  return Response.json({
    feePaise: CALCULATION_FEE_PAISE,
    paymentMode: paymentConfigured() ? "razorpay" : "demo",
  });
}
