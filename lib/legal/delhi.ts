import type { CalculationInput } from "./types";

export const DELHI_SOURCES = [
  {
    title: "Court-fees Act, 1870",
    url: "https://www.indiacode.nic.in/bitstream/123456789/2293/3/A1870-7.pdf",
    note: "Central Act as applicable to Delhi; section 7 and Schedules I and II.",
  },
  {
    title: "Delhi District Courts court-fee table",
    url: "https://ddc.nic.in/viewdocuments/eFNxei81WmV5dEliZTN6QmR0K25HTERjZktobkVTdFAwYjNRUlQ3THF4T0dqZmllcmZTSmcxYnZBSHVDWEwyVDdIVjMrTGc3b2RRRGRYRHV5MkZjMG9oeXFsNGpCNkwwOHBjSHI4aWhnbE09",
    note: "Official proper-fee table used for the Schedule I Article 1 implementation.",
  },
  {
    title: "Delhi High Court court-fee guidance",
    url: "https://delhihighcourt.nic.in/web/what-are-court-fees-be-paid-different-matters-high-court-delhi",
    note: "Confirms that original-side fees are calculated under the Court-fees Act, 1870.",
  },
  {
    title: "Delhi High Court Act, 1966",
    url: "https://www.indiacode.nic.in/bitstream/123456789/1580/1/A1966-26.pdf",
    note: "Section 5(2), as amended, supplies the above-₹2-crore original-side baseline.",
  },
  {
    title: "Court Fees (Delhi Amendment) Act, 2026",
    url: "https://egazette.gov.in/WriteReadData/2026/269139.pdf",
    note: "Post-filing full-fee refund certificate for qualifying settled or compromised suits, counterclaims and appeals.",
  },
];

export type DelhiValuation = {
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
const steps = (amount: number, size: number) => Math.ceil(Math.max(0, amount) / size);

/** Schedule I, Article 1 proper-fee table currently used by Delhi District Courts. */
export function delhiAdValorem(value: number) {
  const v = Math.max(0, value);
  if (v === 0) return 0;
  if (v <= 100) return steps(v, 5) * 0.5;
  if (v <= 500) return steps(v, 10);
  if (v <= 1_000) return 75 + steps(v - 500, 10) * 1.5;
  if (v <= 5_000) return 150 + steps(v - 1_000, 100) * 12.2;
  if (v <= 10_000) return 638 + steps(v - 5_000, 250) * 24.4;
  if (v <= 20_000) return 1_126 + steps(v - 10_000, 500) * 36.5;
  if (v <= 30_000) return 1_856 + steps(v - 20_000, 1_000) * 48.8;
  if (v <= 50_000) return 2_344 + steps(v - 30_000, 2_000) * 48.8;
  return 2_832 + steps(v - 50_000, 5_000) * 48.8;
}

function result(suitValue: number, feeBasis: number | null, courtFee: number, section: string, formula: string, trace: string[], jurisdictionValue?: number): DelhiValuation {
  return { suitValue, feeBasis, courtFee: Math.round(courtFee * 100) / 100, section, formula, trace, jurisdictionValue };
}

function full(value: number, section: string, formula: string, trace: string[], jurisdictionValue?: number) {
  return result(value, value, delhiAdValorem(value), section, formula, [...trace, `Schedule I, Article 1 applied to ${money(value)}`], jurisdictionValue);
}

function propertyValue(input: CalculationInput) {
  if (input.propertyCategory === "agricultural_land") {
    throw new Error("Delhi revenue-assessed agricultural land requires the section 7(v) revenue particulars. This first verified module will not charge until those facts are supported.");
  }
  return required(input.propertyMarketValue, "Current property market value");
}

export function calculateDelhi(input: CalculationInput): DelhiValuation {
  const separateJurisdiction = input.jurisdictionValue;
  switch (input.suitType) {
    case "money_recovery":
    case "damages": {
      const value = required(input.claimAmount, input.suitType === "damages" ? "Damages claimed" : "Amount claimed");
      return full(value, "section 7(i) read with Schedule I, Article 1", "Amount claimed in the plaint", [`Claim value: ${money(value)}`], separateJurisdiction);
    }
    case "maintenance": {
      const annual = required(input.claimAmount, "Annual maintenance or annuity");
      const value = annual * 10;
      return full(value, "section 7(ii)", "Ten times the amount claimed for one year", [`Annual amount ${money(annual)} × 10 = ${money(value)}`], separateJurisdiction);
    }
    case "movable_property": {
      const value = required(input.claimAmount, "Movable property market value");
      return full(value, "section 7(iii)", "Market value of the movable property", [`Movable property value: ${money(value)}`], separateJurisdiction);
    }
    case "declaration_only":
    case "injunction":
    case "accounts": {
      const value = required(input.reliefValue, "Value placed on the relief");
      const clause = input.suitType === "accounts" ? "section 7(iv)(f)" : input.suitType === "injunction" ? "section 7(iv)(d)" : "section 7(iv)(c)";
      return full(value, clause, "Plaintiff-stated valuation, subject to statutory and judicial scrutiny", [`Stated relief value: ${money(value)}`], separateJurisdiction ?? value);
    }
    case "declaration_consequential": {
      const value = propertyValue(input);
      return full(value, "section 7(iv)(c) read with section 8 of the Suits Valuation Act, 1887", "Current market value for declaration of ownership coupled with possession or equivalent consequential relief", [`Property market value: ${money(value)}`, "Court-fee and jurisdictional valuation ordinarily correspond under section 8"], separateJurisdiction ?? value);
    }
    case "possession": {
      const value = propertyValue(input);
      return full(value, "section 7(v)", "Current market value for a house, garden or urban property", [`Property value: ${money(value)}`, "Revenue-assessed agricultural land must use the applicable statutory land formula"], separateJurisdiction ?? value);
    }
    case "partition": {
      const total = propertyValue(input);
      const share = required(input.plaintiffSharePercent, "Plaintiff share percentage");
      if (share > 100) throw new Error("Plaintiff share cannot exceed 100%.");
      const shareValue = Math.round((total * share) / 100);
      if (!input.excludedFromPossession) {
        return result(shareValue, null, 19.5, "Schedule II, Article 17(vi)", "Fixed fee where joint possession is admitted", [`${share}% share value for jurisdiction: ${money(shareValue)}`, "Joint possession is stated; fixed-fee treatment selected"], separateJurisdiction ?? shareValue);
      }
      return full(shareValue, "section 7(v) read with the applicable Delhi partition valuation rule", "Market value of the plaintiff's share when excluded from possession", [`${share}% of ${money(total)} = ${money(shareValue)}`], separateJurisdiction ?? shareValue);
    }
    case "specific_performance": {
      let value = required(input.considerationAmount, "Contract consideration");
      let formula = "Sale consideration";
      if (input.reliefVariant === "lease") {
        value += required(input.secondaryAmount, "First-year rent");
        formula = "Lease premium plus first-year rent";
      } else if (input.reliefVariant === "mortgage") formula = "Amount agreed to be secured";
      return full(value, "section 7(x)", formula, [`Statutory basis: ${money(value)}`], separateJurisdiction);
    }
    case "mortgage": {
      const value = required(input.securedAmount, "Mortgage principal");
      return full(value, "section 7(ix)", "Principal money secured by the mortgage", [`Mortgage principal: ${money(value)}`], separateJurisdiction);
    }
    case "landlord_tenant": {
      const annual = required(input.annualRent, "Previous year's rent");
      return full(annual, "section 7(xi)", "Rent payable for the year before presentation of the plaint", [`Annual rent: ${money(annual)}`], separateJurisdiction);
    }
    case "cancellation": {
      const value = required(input.claimAmount, "Document or property value");
      return full(value, input.plaintiffExecutedDocument ? "section 7(iv)(c) / Schedule I, Article 1" : "section 7(iv)(c)", input.plaintiffExecutedDocument ? "Value of the instrument challenged by its executant" : "Value of declaratory relief concerning the document", [`Value used: ${money(value)}`], separateJurisdiction);
    }
    case "appeal": {
      const value = required(input.lowerCourtSuitValue, "Value of relief challenged in appeal");
      return full(value, "Schedule I, applicable appeal entry", "Value of the relief challenged in appeal", [`Appeal value: ${money(value)}`], separateJurisdiction);
    }
    case "mesne_profits": {
      const value = required(input.claimAmount, "Mesne profits claimed");
      return full(value, "section 7(i)", "Amount of mesne profits claimed", [`Amount claimed: ${money(value)}`], separateJurisdiction);
    }
    default:
      throw new Error("This Delhi proceeding is not yet included in the first verified calculator version. No payment has been taken.");
  }
}
