"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Building2, Check, CheckCircle2, ChevronDown, CreditCard,
  FileText, Landmark, LoaderCircle, LockKeyhole, MapPin, RotateCcw, ShieldCheck, X,
} from "lucide-react";
import { JURISDICTIONS, SUIT_TYPES } from "@/lib/legal/catalogue";
import type { CalculationInput, CalculationResult, SuitType } from "@/lib/legal/types";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme: { color: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};

type FormState = {
  stateId: string; district: string; suitType: SuitType; primaryAmount: string;
  secondaryAmount: string; share: string; durationYears: string; premiumAmount: string;
  subtype: string; excluded: boolean; commercial: boolean; immovable: boolean; titleDenied: boolean;
  plaintiffExecutedDocument: boolean;
  propertyLocation: string; defendantLocation: string; causeLocation: string;
  propertyMethod: "market" | "permanent_revenue" | "temporary_revenue" | "profits_or_comparable" | "agricultural_short_settlement" | "agricultural_long_settlement";
  propertyCategory: "house_building" | "garden_urban_land" | "agricultural_land" | "other";
  jurisdictionAmount: string;
  annualLandRevenue: string; priorYearNetProfits: string; comparableLandRevenue: string;
};

type OrderResponse = {
  ok: boolean;
  mode?: "demo" | "razorpay";
  keyId?: string;
  order?: { id: string; amount: number; currency: string };
  error?: string;
};

const initialForm: FormState = {
  stateId: "ka", district: "Bengaluru Urban", suitType: "money_recovery", primaryAmount: "500000",
  secondaryAmount: "", share: "50", durationYears: "", premiumAmount: "", subtype: "sale",
  excluded: false, commercial: false, immovable: false, titleDenied: false,
  plaintiffExecutedDocument: true,
  propertyLocation: "", defendantLocation: "Bengaluru", causeLocation: "Bengaluru",
  propertyMethod: "market", annualLandRevenue: "", priorYearNetProfits: "", comparableLandRevenue: "",
  propertyCategory: "house_building", jurisdictionAmount: "",
};

const amountField: Record<SuitType, { label: string; key: keyof CalculationInput; placeholder: string }> = {
  money_recovery: { label: "Amount claimed", key: "claimAmount", placeholder: "5,00,000" },
  damages: { label: "Damages claimed", key: "claimAmount", placeholder: "5,00,000" },
  specific_performance: { label: "Contract consideration", key: "considerationAmount", placeholder: "10,00,000" },
  declaration_only: { label: "Value of declaratory relief", key: "reliefValue", placeholder: "1,00,000" },
  declaration_consequential: { label: "Property market value", key: "propertyMarketValue", placeholder: "25,00,000" },
  injunction: { label: "Value of injunction relief", key: "reliefValue", placeholder: "1,00,000" },
  possession: { label: "Property market value", key: "propertyMarketValue", placeholder: "25,00,000" },
  partition: { label: "Total property market value", key: "propertyMarketValue", placeholder: "50,00,000" },
  landlord_tenant: { label: "Rent for the previous year", key: "annualRent", placeholder: "2,40,000" },
  accounts: { label: "Estimated amount due", key: "reliefValue", placeholder: "5,00,000" },
  mortgage: { label: "Principal secured or claimed", key: "securedAmount", placeholder: "10,00,000" },
  administration: { label: "Estate value", key: "estateValue", placeholder: "20,00,000" },
  appeal: { label: "Subject matter in appeal", key: "lowerCourtSuitValue", placeholder: "5,00,000" },
  maintenance: { label: "Annual maintenance", key: "claimAmount", placeholder: "2,40,000" },
  movable_property: { label: "Movable property value", key: "claimAmount", placeholder: "5,00,000" },
  easement: { label: "Value of easement relief", key: "reliefValue", placeholder: "1,00,000" },
  preemption: { label: "Sale consideration", key: "claimAmount", placeholder: "10,00,000" },
  cancellation: { label: "Document or property value", key: "claimAmount", placeholder: "10,00,000" },
  mesne_profits: { label: "Mesne profits claimed", key: "claimAmount", placeholder: "5,00,000" },
  set_aside_attachment: { label: "Attached property value", key: "claimAmount", placeholder: "10,00,000" },
  revenue_register: { label: "Fixed by statute", key: "reliefValue", placeholder: "" },
  public_matter: { label: "Fixed by statute", key: "reliefValue", placeholder: "" },
  other: { label: "Value of relief", key: "reliefValue", placeholder: "1,00,000" },
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const plainMoney = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const stateGroups = {
  States: JURISDICTIONS.filter((item) => item.kind === "State"),
  "Union Territories": JURISDICTIONS.filter((item) => item.kind === "Union Territory"),
};

const numeric = (value: string) => {
  const parsed = Number(value.replace(/,/g, ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
};

function payloadFrom(form: FormState): CalculationInput {
  const field = amountField[form.suitType];
  const payload: CalculationInput = {
    stateId: form.stateId, district: form.district, suitType: form.suitType,
    secondaryAmount: numeric(form.secondaryAmount), durationYears: numeric(form.durationYears),
    premiumAmount: numeric(form.premiumAmount), reliefVariant: form.subtype,
    plaintiffSharePercent: numeric(form.share), excludedFromPossession: form.excluded,
    commercialDispute: form.commercial, titleDenied: form.titleDenied,
    plaintiffExecutedDocument: form.plaintiffExecutedDocument,
    immovableProperty: form.immovable || ["possession", "partition", "declaration_consequential"].includes(form.suitType),
    propertyLocation: form.propertyLocation, defendantLocation: form.defendantLocation,
    causeOfActionLocation: form.causeLocation, propertyValuationMethod: form.propertyMethod,
    annualLandRevenue: numeric(form.annualLandRevenue), priorYearNetProfits: numeric(form.priorYearNetProfits),
    comparableLandRevenue: numeric(form.comparableLandRevenue),
    propertyCategory: form.propertyCategory, jurisdictionValue: numeric(form.jurisdictionAmount),
  };
  if (!["revenue_register", "public_matter"].includes(form.suitType)) Object.assign(payload, { [field.key]: numeric(form.primaryAmount) });
  if (form.suitType === "injunction" && payload.immovableProperty && form.titleDenied) {
    delete payload.reliefValue;
    payload.propertyMarketValue = numeric(form.primaryAmount);
  }
  return payload;
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feePaise, setFeePaise] = useState(1000);
  const [paymentMode, setPaymentMode] = useState<"demo" | "razorpay">("demo");
  const [demoOrder, setDemoOrder] = useState<OrderResponse["order"] | null>(null);

  useEffect(() => {
    void fetch("/api/payment/config").then((response) => response.json()).then((data: { feePaise?: number; paymentMode?: "demo" | "razorpay" }) => {
      if (data.feePaise) setFeePaise(data.feePaise);
      if (data.paymentMode) setPaymentMode(data.paymentMode);
    }).catch(() => undefined);
  }, []);

  const selectedState = useMemo(() => JURISDICTIONS.find((item) => item.id === form.stateId), [form.stateId]);
  const suitLabel = SUIT_TYPES.find((item) => item.id === form.suitType)?.label ?? "";
  const field = amountField[form.suitType];
  const isKarnataka = form.stateId === "ka";
  const isTamilNadu = form.stateId === "tn";
  const isMaharashtra = form.stateId === "mh";
  const isDelhi = form.stateId === "dl";
  const isAvailable = isKarnataka || isTamilNadu || isMaharashtra || isDelhi;
  const showProperty = ["possession", "partition", "declaration_consequential"].includes(form.suitType) || form.immovable;
  const showLandMethod = isKarnataka && showProperty && ["possession", "partition", "declaration_consequential", "injunction"].includes(form.suitType);
  const showMaharashtraPropertyMethod = isMaharashtra && showProperty && ["possession", "partition", "declaration_consequential"].includes(form.suitType);
  const hidePrimary = ["revenue_register", "public_matter"].includes(form.suitType);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null); setError("");
  };

  const verifyAndCalculate = async (orderId: string, paymentId: string, signature: string) => {
    const response = await fetch("/api/payment/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId, signature, input: payloadFrom(form) }),
    });
    const data = await response.json() as { ok: boolean; result?: CalculationResult; error?: string };
    if (!response.ok || !data.result) throw new Error(data.error || "Unable to verify payment.");
    setResult(data.result);
  };

  const startCalculation = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/payment/order", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFrom(form)),
      });
      const data = await response.json() as OrderResponse;
      if (!response.ok || !data.order || !data.mode) throw new Error(data.error || "Unable to prepare payment.");
      setFeePaise(data.order.amount);
      if (data.mode === "demo") {
        setDemoOrder(data.order); setLoading(false); return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay || !data.keyId) throw new Error("Razorpay checkout could not be loaded.");
      const checkout = new window.Razorpay({
        key: data.keyId, amount: data.order.amount, currency: data.order.currency,
        name: "AdvoHQ", description: "Suit valuation calculation", order_id: data.order.id,
        theme: { color: "#123d4c" }, modal: { ondismiss: () => setLoading(false) },
        handler: async (payment) => {
          try { await verifyAndCalculate(payment.razorpay_order_id, payment.razorpay_payment_id, payment.razorpay_signature); }
          catch (caught) { setError(caught instanceof Error ? caught.message : "Payment verification failed."); }
          finally { setLoading(false); }
        },
      });
      checkout.on("payment.failed", (failure) => { setError(failure.error?.description || "Payment failed. Please try again."); setLoading(false); });
      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
      setLoading(false);
    }
  };

  const finishDemo = async () => {
    if (!demoOrder) return;
    setLoading(true); setError("");
    try { await verifyAndCalculate(demoOrder.id, "demo_payment", ""); setDemoOrder(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to complete demo payment."); }
    finally { setLoading(false); }
  };

  const reset = () => { setForm(initialForm); setResult(null); setError(""); setDemoOrder(null); };
  const fee = money.format(feePaise / 100);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="AdvoHQ Suit Calculator"><span className="brand-logo-light" aria-hidden="true" /><span className="brand-logo-dark" aria-hidden="true" /><strong>AdvoHQ</strong></a>
        <div className="verified"><ShieldCheck /> {selectedState?.name} rules {isAvailable ? "verified" : "pending"}</div>
      </header>

      <div className="page-wrap">
        <div className="page-heading">
          <h1>Suit calculator</h1>
          <button onClick={reset}><RotateCcw /> Reset</button>
        </div>

        <div className="calculator-layout">
          <form id="suit-form" className="form-card" onSubmit={(event) => { event.preventDefault(); void startCalculation(); }}>
            <section>
              <div className="section-title"><span>1</span><h2>Jurisdiction</h2></div>
              <div className="field-grid">
                <Field label="State or Union Territory">
                  <Select value={form.stateId} onChange={(value) => {
                    setForm((current) => ({
                      ...current,
                      stateId: value,
                      district: value === "tn" && ["Bengaluru Urban", "Mumbai", "New Delhi"].includes(current.district)
                        ? "Chennai"
                        : value === "mh" && ["Bengaluru Urban", "Chennai", "New Delhi"].includes(current.district)
                        ? "Mumbai"
                        : value === "ka" && ["Chennai", "Mumbai", "New Delhi"].includes(current.district)
                        ? "Bengaluru Urban"
                        : value === "dl" && ["Bengaluru Urban", "Chennai", "Mumbai"].includes(current.district)
                        ? "New Delhi"
                        : current.district,
                      propertyMethod: "market",
                      propertyCategory: "house_building",
                    }));
                    setResult(null); setError("");
                  }}>
                    {Object.entries(stateGroups).map(([group, states]) => <optgroup key={group} label={group}>{states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}
                  </Select>
                </Field>
                <Field label="District or city"><TextInput value={form.district} onChange={(value) => update("district", value)} placeholder="Bengaluru Urban" /></Field>
              </div>
              {!isAvailable && <div className="availability"><AlertCircle /> <span><strong>{selectedState?.name} is not available yet.</strong> No payment will be taken.</span></div>}
            </section>

            <section>
              <div className="section-title"><span>2</span><h2>Case</h2></div>
              <Field label="Nature of suit">
                <Select value={form.suitType} onChange={(value) => setForm((current) => ({ ...current, suitType: value as SuitType, subtype: value === "mortgage" ? "recovery" : "sale", secondaryAmount: "" }))}>
                  {SUIT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </Select>
              </Field>
              {(form.suitType === "specific_performance" || form.suitType === "mortgage") && <div className="field-grid compact-top">
                {form.suitType === "specific_performance" && <Field label="Contract type"><Select value={form.subtype} onChange={(value) => update("subtype", value)}><option value="sale">Sale</option><option value="mortgage">Mortgage</option><option value="lease">Lease</option><option value="exchange">Exchange</option></Select></Field>}
                {form.suitType === "mortgage" && <Field label="Mortgage relief"><Select value={form.subtype} onChange={(value) => update("subtype", value)}><option value="recovery">Recovery</option><option value="redemption">Redemption</option><option value="foreclosure">Foreclosure</option></Select></Field>}
              </div>}
            </section>

            <section>
              <div className="section-title"><span>3</span><h2>Value</h2></div>
              {!hidePrimary && <div className="field-grid">
                <Field label={form.suitType === "injunction" && showProperty && form.titleDenied ? "Property market value" : field.label}><MoneyInput value={form.primaryAmount} onChange={(value) => update("primaryAmount", value)} placeholder={field.placeholder} /></Field>
                <SecondaryField form={form} update={update} />
              </div>}

              <div className="option-grid">
                <CheckOption label="Commercial dispute" checked={form.commercial} onChange={(value) => update("commercial", value)} />
                <CheckOption label="Immovable property" checked={showProperty} disabled={["possession", "partition", "declaration_consequential"].includes(form.suitType)} onChange={(value) => update("immovable", value)} />
                {form.suitType === "partition" && !isMaharashtra && <CheckOption label="Excluded from possession" checked={form.excluded} onChange={(value) => update("excluded", value)} />}
                {form.suitType === "injunction" && showProperty && <CheckOption label="Title is denied or disputed" checked={form.titleDenied} onChange={(value) => update("titleDenied", value)} />}
                {(isTamilNadu || isMaharashtra || isDelhi) && form.suitType === "cancellation" && <CheckOption label="Plaintiff executed the challenged document" checked={form.plaintiffExecutedDocument} onChange={(value) => update("plaintiffExecutedDocument", value)} />}
              </div>

              {isTamilNadu && showProperty && <div className="availability legal-basis"><Landmark /> <span><strong>Current section 7 applies.</strong> Enter the current market value linked to section 47-AA of the Indian Stamp Act. The former 30-times survey-assessment rule was replaced in 2017.</span></div>}

              {showLandMethod && <div className="land-box">
                <Field label="Property valuation method"><Select value={form.propertyMethod} onChange={(value) => update("propertyMethod", value as FormState["propertyMethod"])}><option value="market">Market value</option><option value="permanent_revenue">Permanently settled revenue land</option><option value="temporary_revenue">Temporarily settled revenue land</option><option value="profits_or_comparable">No revenue or exempt land</option></Select></Field>
                {["permanent_revenue", "temporary_revenue"].includes(form.propertyMethod) && <Field label="Annual land revenue"><MoneyInput value={form.annualLandRevenue} onChange={(value) => update("annualLandRevenue", value)} placeholder="10,000" /></Field>}
                {form.propertyMethod === "profits_or_comparable" && <div className="field-grid"><Field label="Previous-year net profits"><MoneyInput value={form.priorYearNetProfits} onChange={(value) => update("priorYearNetProfits", value)} placeholder="1,00,000" /></Field><Field label="Comparable annual land revenue"><MoneyInput value={form.comparableLandRevenue} onChange={(value) => update("comparableLandRevenue", value)} placeholder="10,000" /></Field></div>}
              </div>}

              {showMaharashtraPropertyMethod && <div className="land-box">
                <Field label="Property type and valuation basis"><Select value={form.propertyMethod} onChange={(value) => update("propertyMethod", value as FormState["propertyMethod"])}><option value="market">House, garden or other property — market value</option><option value="agricultural_short_settlement">Agricultural land — settlement up to 30 years</option><option value="agricultural_long_settlement">Agricultural land — permanent or over 30 years</option></Select></Field>
                {["agricultural_short_settlement", "agricultural_long_settlement"].includes(form.propertyMethod) && <Field label="Annual survey assessment"><MoneyInput value={form.annualLandRevenue} onChange={(value) => update("annualLandRevenue", value)} placeholder="10,000" /></Field>}
              </div>}

              {isDelhi && showProperty && <div className="land-box">
                <Field label="Property type"><Select value={form.propertyCategory} onChange={(value) => update("propertyCategory", value as FormState["propertyCategory"])}><option value="house_building">House or building</option><option value="garden_urban_land">Garden or urban land</option><option value="agricultural_land">Revenue-assessed agricultural land</option><option value="other">Other immovable property</option></Select></Field>
                {form.propertyCategory === "agricultural_land" && <div className="availability legal-basis"><AlertCircle /> <span><strong>Additional statutory facts required.</strong> Delhi section 7(v) can use a deemed land value. The calculator will stop before payment until that agricultural-land intake is completed.</span></div>}
              </div>}

              {isDelhi && <div className="compact-top"><Field label="Total jurisdictional value (optional, if different)"><MoneyInput value={form.jurisdictionAmount} onChange={(value) => update("jurisdictionAmount", value)} placeholder="Leave blank if the same" /></Field></div>}

              <div className="field-grid compact-top">
                {showProperty ? <Field label="Property location"><TextInput value={form.propertyLocation} onChange={(value) => update("propertyLocation", value)} placeholder="District where the property is situated" /></Field> : <><Field label="Defendant location"><TextInput value={form.defendantLocation} onChange={(value) => update("defendantLocation", value)} placeholder="Residence or business location" /></Field><Field label="Cause of action"><TextInput value={form.causeLocation} onChange={(value) => update("causeLocation", value)} placeholder="Where the cause arose" /></Field></>}
              </div>
            </section>
          </form>

          <aside className="side-card">
            {result ? <ResultCard result={result} onReset={reset} /> : <>
              <div className="side-icon"><FileText /></div>
              <h2>Calculation</h2>
              <dl className="case-summary">
                <div><dt>State</dt><dd>{selectedState?.name}</dd></div>
                <div><dt>Case</dt><dd>{suitLabel}</dd></div>
                {!hidePrimary && <div><dt>Value entered</dt><dd>{numeric(form.primaryAmount) ? `₹${plainMoney.format(numeric(form.primaryAmount)!)}` : "—"}</dd></div>}
              </dl>
              <div className="payment-row"><span><CreditCard /> Calculation fee</span><strong>{fee}</strong></div>
              {paymentMode === "demo" && <div className="demo-label">Demo checkout</div>}
              <button className="calculate-button" form="suit-form" type="submit" disabled={loading || !isAvailable}>{loading ? <><LoaderCircle className="spin" /> Preparing payment</> : <>Calculate</>}</button>
              <div className="secure-note"><LockKeyhole /> Payment is completed before the result is generated.</div>
              {error && <div className="error-box"><AlertCircle />{error}</div>}
            </>}
          </aside>
        </div>

        <p className="legal-note">Verify amendments, special forums and local filing practice before filing.</p>
      </div>

      {demoOrder && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <div className="payment-modal">
          <button className="modal-close" onClick={() => setDemoOrder(null)} aria-label="Close payment"><X /></button>
          <div className="razorpay-mark">R</div>
          <h2 id="payment-title">Pay {money.format(demoOrder.amount / 100)}</h2>
          <p>Suit valuation calculation</p>
          <div className="modal-order"><span>AdvoHQ</span><strong>{money.format(demoOrder.amount / 100)}</strong></div>
          <div className="demo-warning"><AlertCircle /><span><strong>Demo payment</strong>No charge will be made. Add Razorpay credentials to enable live checkout.</span></div>
          <button className="demo-pay" onClick={() => void finishDemo()} disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <CreditCard />} Continue demo payment</button>
          <div className="secure-note centered"><LockKeyhole /> Secured by Razorpay in live mode</div>
        </div>
      </div>}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><ChevronDown /></span>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <span className="money-input"><b>₹</b><input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))} placeholder={placeholder} /></span>;
}

function CheckOption({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className={`check-option ${disabled ? "disabled" : ""}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span className="check-box"><Check /></span><span>{label}</span></label>;
}

function SecondaryField({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  if (form.suitType === "partition") return <Field label="Plaintiff’s share (%)"><TextInput value={form.share} onChange={(value) => update("share", value.replace(/[^0-9.]/g, ""))} placeholder="50" /></Field>;
  if (form.suitType === "preemption") return <Field label="Property market value"><MoneyInput value={form.secondaryAmount} onChange={(value) => update("secondaryAmount", value)} placeholder="10,00,000" /></Field>;
  if (form.suitType === "set_aside_attachment") return <Field label="Attachment amount"><MoneyInput value={form.secondaryAmount} onChange={(value) => update("secondaryAmount", value)} placeholder="5,00,000" /></Field>;
  if (form.suitType === "maintenance") return <Field label="Duration in years"><TextInput value={form.durationYears} onChange={(value) => update("durationYears", value.replace(/[^0-9.]/g, ""))} placeholder="Optional" /></Field>;
  if (form.suitType === "landlord_tenant") return <Field label="Lease premium"><MoneyInput value={form.premiumAmount} onChange={(value) => update("premiumAmount", value)} placeholder="Optional" /></Field>;
  if (form.suitType === "specific_performance" && form.subtype === "lease") return <Field label="Average annual rent"><MoneyInput value={form.secondaryAmount} onChange={(value) => update("secondaryAmount", value)} placeholder="2,40,000" /></Field>;
  if (form.suitType === "mortgage" && form.subtype === "redemption") return <Field label="Amount stated as due"><MoneyInput value={form.secondaryAmount} onChange={(value) => update("secondaryAmount", value)} placeholder="5,00,000" /></Field>;
  if (form.suitType === "appeal") return <Field label="Fee paid in first instance"><MoneyInput value={form.secondaryAmount} onChange={(value) => update("secondaryAmount", value)} placeholder="33,375" /></Field>;
  return <div />;
}

function ResultCard({ result, onReset }: { result: CalculationResult; onReset: () => void }) {
  return <div className="result-card">
    <div className="result-ok"><CheckCircle2 /></div>
    <span className="result-label">Court fee payable</span>
    <strong className="result-amount">{result.courtFeeStatus === "calculated" && result.courtFee !== null ? money.format(result.courtFee) : "Not calculated"}</strong>
    <div className="result-divider" />
    <dl className="result-details">
      <div><dt>Suit valuation</dt><dd>{money.format(result.suitValuation)}</dd></div>
      <div><dt>Fee basis</dt><dd>{result.courtFeeBasis === null ? "Fixed fee" : money.format(result.courtFeeBasis)}</dd></div>
    </dl>
    <div className="forum-box"><Building2 /><span><b>Court</b>{result.court}</span></div>
    <div className="forum-box"><MapPin /><span><b>Territorial jurisdiction</b>{result.territorialBasis}</span></div>
    <div className="legal-basis"><Landmark /> <span><b>Legal basis</b>{result.ruleTrace[0]}</span></div>
    <button className="new-button" onClick={onReset}>New calculation</button>
  </div>;
}
