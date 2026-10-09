import type { CalculationInput } from "./types";

export const TAMIL_NADU_SOURCES = [
  {
    title: "Tamil Nadu Court-Fees and Suits Valuation Act, 1955",
    url: "https://www.indiacode.nic.in/bitstream/123456789/13261/1/court_fee_act_1955.pdf",
    note: "Principal Act and appended amendments, including Acts 17 of 2003, 6 of 2017, 18 and 20 of 2021, and 43 of 2024.",
  },
  {
    title: "Tamil Nadu Court-Fees and Suits Valuation (Amendment) Act, 2017",
    url: "https://www.stationeryprinting.tn.gov.in/extra_ordinary_lists.php?id=MjAxNw%3D%3D",
    note: "Official Gazette index. Act 6 of 2017 replaced section 7 and Schedule I, Article 1.",
  },
  {
    title: "Tamil Nadu Court-Fees and Suits Valuation (Amendment) Act, 2024",
    url: "https://www.stationeryprinting.tn.gov.in/extra_ordinary_lists.php?id=MjAyNA%3D%3D",
    note: "Official Gazette index. Act 43 of 2024 updates specialised Schedule II High Court IP Division entries.",
  },
  {
    title: "Tamil Nadu Civil Courts Act, 1873",
    url: "https://prsindia.org/files/bills_acts/acts_states/tamil-nadu/1873/1873TN3.pdf",
    note: "Court-level baseline; local establishment and territorial notifications still require registry confirmation.",
  },
];

export type TamilNaduValuation = {
  suitValue: number;
  feeBasis: number | null;
  courtFee: number;
  formula: string;
  section: string;
  trace: string[];
  jurisdictionValue?: number;
};

const required = (value: number | undefined, label: string) => {
  if (value === undefined || !Number.isFinite(value) || value < 0) throw new Error(`${label} is required and must be zero or more.`);
  return Math.round(value * 100) / 100;
};

const money = (value: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}`;

/** Schedule I, Article 1 as substituted by Tamil Nadu Act 6 of 2017. */
export function tamilNaduAdValorem(value: number) {
  return Math.ceil(Math.max(0, value) * 0.03);
}

function adValorem(suitValue: number, feeBasis: number, section: string, formula: string, trace: string[], jurisdictionValue?: number): TamilNaduValuation {
  return {
    suitValue,
    feeBasis,
    courtFee: tamilNaduAdValorem(feeBasis),
    formula,
    section,
    trace: [...trace, `Schedule I, Article 1: 3% of ${money(feeBasis)}, rounded up to the next rupee under section 21-A`],
    jurisdictionValue,
  };
}

function fixed(suitValue: number, fee: number, section: string, formula: string, trace: string[]): TamilNaduValuation {
  return { suitValue, feeBasis: null, courtFee: fee, section, formula, trace };
}

function marketValue(input: CalculationInput) {
  return required(input.propertyMarketValue, "Current property market / section 47-AA value");
}

function forumFixed(value: number) {
  // District Munsif jurisdiction presently extends to ₹10 lakh. Other ordinary civil filings
  // therefore fall in the Sub Court band, where the 2003 fixed fee is ₹750 at ₹1 lakh and above.
  if (value <= 1_000_000) return 100;
  if (value < 100_000) return value <= 30_000 ? 100 : 500;
  return 750;
}

export function calculateTamilNadu(input: CalculationInput): TamilNaduValuation {
  switch (input.suitType) {
    case "money_recovery":
    case "damages":
    case "maintenance": {
      const value = required(input.claimAmount, input.suitType === "money_recovery" ? "Amount claimed" : input.suitType === "damages" ? "Damages claimed" : "Maintenance or periodic amount claimed");
      return adValorem(value, value, "section 22", "Amount claimed in the plaint", [`Section 22 values the claim at ${money(value)}`]);
    }
    case "movable_property": {
      const value = required(input.claimAmount, "Movable property market value");
      return adValorem(value, value, "section 24(1)", "Market value of the movable property", [`Section 24(1) value: ${money(value)}`]);
    }
    case "declaration_only": {
      const stated = required(input.reliefValue, "Value placed on declaratory relief");
      const basis = Math.max(stated, 1_000);
      return adValorem(basis, basis, "section 25(d), as amended by Act 17 of 2003", "Plaintiff-stated value, subject to a ₹1,000 minimum", [`Higher of ${money(stated)} and ₹1,000`]);
    }
    case "declaration_consequential": {
      const market = marketValue(input);
      const basis = Math.max(market / 2, 1_000);
      return adValorem(market, basis, "section 25(b), as amended by Act 17 of 2003", "Half the current property market value, subject to a ₹1,000 minimum", [`Post-2017 section 7 market value: ${money(market)}`, `Fee basis: ${money(basis)}`], market);
    }
    case "injunction": {
      if (input.immovableProperty && input.titleDenied) {
        const market = marketValue(input);
        const basis = Math.max(market / 2, 750);
        return adValorem(market, basis, "section 27(a)", "Half the current property market value, subject to a ₹750 minimum", [`Title to immovable property is stated to be denied`, `Fee basis: ${money(basis)}`], market);
      }
      const stated = required(input.reliefValue, "Value placed on injunction relief");
      const basis = Math.max(stated, 1_000);
      return adValorem(basis, basis, "section 27(c), as amended", "Plaintiff-stated value, subject to a ₹1,000 minimum", [`Higher of ${money(stated)} and ₹1,000`]);
    }
    case "possession": {
      const market = marketValue(input);
      return adValorem(market, market, "section 30 read with section 7 (as substituted by Act 6 of 2017)", "Current market value on the date of plaint", [`Section 7 now refers to the section 47-AA market value; the former 30-times survey-assessment rule was replaced in 2017`], market);
    }
    case "partition": {
      const market = marketValue(input);
      const share = required(input.plaintiffSharePercent, "Plaintiff share percentage");
      if (share > 100) throw new Error("Plaintiff share cannot exceed 100%.");
      const shareValue = Math.round((market * share) / 100);
      if (input.excludedFromPossession) {
        return adValorem(shareValue, shareValue, "section 37(1)", "Market value × plaintiff's share because exclusion from possession is stated", [`Total market value ${money(market)} × ${share}% = ${money(shareValue)}`], shareValue);
      }
      const fee = forumFixed(shareValue);
      return fixed(shareValue, fee, "section 37(2), as amended", "Fixed fee where the plaintiff is in joint possession", [`Plaintiff share value for jurisdiction: ${money(shareValue)}`, `Fixed filing fee selected for the likely ordinary court level: ${money(fee)}`]);
    }
    case "specific_performance": {
      const consideration = required(input.considerationAmount, "Contract consideration");
      let basis = consideration;
      let detail = "Consideration stated in the contract";
      if (input.reliefVariant === "lease") {
        basis += required(input.secondaryAmount, "Average annual rent");
        detail = "Lease premium plus average annual rent";
      }
      return adValorem(basis, basis, "section 42", detail, [`Section 42 fee basis: ${money(basis)}`]);
    }
    case "accounts": {
      const estimate = required(input.reliefValue, "Estimated amount due");
      return adValorem(estimate, estimate, "section 35", "Amount sued for as estimated in the plaint", [`Plaintiff's estimate: ${money(estimate)}`]);
    }
    case "cancellation": {
      const value = required(input.claimAmount, "Document or property value");
      if (!input.plaintiffExecutedDocument) {
        const stated = required(input.reliefValue ?? 1_000, "Value placed on declaratory relief");
        const basis = Math.max(stated, 1_000);
        return adValorem(value, basis, "section 25(d) (non-executant challenge)", "Non-executant seeks a declaration; plaintiff-stated value subject to ₹1,000 minimum", [`Plaintiff is stated not to be an executant of the challenged document`, `Document/property value retained for jurisdiction: ${money(value)}`], value);
      }
      return adValorem(value, value, "section 40", "Value of the decree, document, money or property sought to be cancelled", [`Plaintiff is stated to be an executant`, `Section 40 value: ${money(value)}`]);
    }
    case "appeal": {
      const value = required(input.lowerCourtSuitValue, "Subject matter in appeal");
      return adValorem(value, value, "section 52 read with Schedule I, Article 1", "Fee on the subject matter of the appeal at the first-instance scale", [`Subject matter in appeal: ${money(value)}`]);
    }
    case "mesne_profits": {
      const value = required(input.claimAmount, "Mesne profits claimed");
      return adValorem(value, value, "section 44", "Mesne profits approximately stated and sued for", [`Mesne profits claimed: ${money(value)}`]);
    }
    case "set_aside_attachment": {
      const property = required(input.claimAmount, "Attached property value");
      const attachment = required(input.secondaryAmount, "Attachment amount");
      const basis = Math.min(property / 4, attachment);
      return adValorem(basis, basis, "section 41(1)", "Lower of attachment amount and one-fourth of attached property value", [`Fee basis: ${money(basis)}`]);
    }
    case "other": {
      const value = required(input.reliefValue, "Value of relief");
      const fee = forumFixed(value);
      return fixed(value, fee, "section 50, as amended", "Fixed fee according to the likely ordinary court level", [`Relief value for jurisdiction: ${money(value)}`, `Fixed fee: ${money(fee)}`]);
    }
    default:
      throw new Error("This Tamil Nadu proceeding is not yet included in the first verified calculator version. No payment has been taken.");
  }
}
