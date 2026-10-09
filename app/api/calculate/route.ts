export async function POST() {
  return Response.json(
    { ok: false, error: "Payment verification is required before calculation." },
    { status: 402 },
  );
}
