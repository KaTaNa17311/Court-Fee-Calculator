import type { CalculationInput } from "./types";

export const MAHARASHTRA_SOURCES = [
  {
    title: "Maharashtra Court-fees Act, 1959",
    url: "https://www.indiacode.nic.in/bitstream/123456789/17278/3/maharashtra.pdf",
    note: "Official India Code text; section 6 and Schedules I and II.",
  },
  {
    title: "Bombay High Court Court Fee Calculator",
    url: "https://bombayhighcourt.nic.in/courtfeecalculator/index.php",
    note: "Official comparison calculator and source collection.",
  },
  {
    title: "Suits Valuation Act, 1887 and Maharashtra Suits Valuation Rules, 1983",
    url: "https://bombayhighcourt.nic.in/courtfeecalculator/index.php",
    note: "Jurisdictional valuation sources linked by the Bombay High Court.",
  },
  {
    title: "Maharashtra Civil Courts Act, 1869",
    url: "https://www.indiacode.nic.in/bitstream/123456789/17491/3/maharashtra_civil_.pdf",
    note: "Sections 24 and 25 supply the ordinary civil-court baseline outside Mumbai.",
  },
];

export type MaharashtraValuation = {
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
const units = (amount: number, size: number) => Math.ceil(Math.max(0, amount) / size);

/** Schedule I, Article 1, as substituted by Maharashtra Act 18 of 2002. */
export function maharashtraAdValorem(value: number) {
  const v = Math.max(0, value);
  let fee: number;
  if (v <= 1_000) fee = 200;
  else if (v <= 5_000) fee = 200 + units(v - 1_000, 100) * 12;
  else if (v <= 10_000) fee = 680 + units(v - 5_000, 100) * 15;
  else if (v <= 20_000) fee = 1_430 + units(v - 10_000, 500) * 75;
  else if (v <= 30_000) fee = 2_930 + units(v - 20_000, 1_000) * 100;
  else if (v <= 50_000) fee = 3_930 + units(v - 30_000, 2_000) * 100;
  else if (v <= 100_000) fee = 4_930 + units(v - 50_000, 5_000) * 150;
  else if (v <= 1_100_000) fee = 6_430 + units(v - 100_000, 10_000) * 200;
  else fee = 26_430 + units(v - 1_100_000, 100_000) * 1_200;
  return Math.min(fee, 300_000);
}

function percentageFee(fullFee: number, factor: number, minimum = 0) {
  return Math.max(minimum, Math.ceil(fullFee * factor));
}

function result(suitValue: number, feeBasis: number | null, courtFee: number, section: string, formula: string, trace: string[], jurisdictionValue?: number): MaharashtraValuation {
  return { suitValue, feeBasis, courtFee, section, formula, trace, jurisdictionValue };
}

function full(value: number, section: string, formula: string, trace: string[], jurisdictionValue?: number) {
  return result(value, value, maharashtraAdValorem(value), section, formula, [...trace, `Schedule I, Article 1 applied to ${money(value)}`], jurisdictionValue);
}

function propertyValue(input: CalculationInput) {
  const method = input.propertyValuationMethod ?? "market";
  const openMarket = required(input.propertyMarketValue, "Property market value");
  if (method === "agricultural_short_settlement") {
    const assessment = required(input.annualLandRevenue, "Annual survey assessment");
    return { feeValue: assessment * 40, jurisdictionValue: openMarket, text: `40 × survey assessment of ${money(assessment)}`, clause: "section 6(v)(a)" };
  }
  if (method === "agricultural_long_settlement") {
    const assessment = required(input.annualLandRevenue, "Annual survey assessment");
    return { feeValue: assessment * 80, jurisdictionValue: openMarket, text: `80 × survey assessment of ${money(assessment)}`, clause: "section 6(v)(b)" };
  }
  return { feeValue: openMarket, jurisdictionValue: openMarket, text: `market value of ${money(openMarket)}`, clause: "section 6(v)" };
}

export function calculateMaharashtra(input: CalculationInput): MaharashtraValuation {
  switch (input.suitType) {
    case "money_recovery":
    case "damages": {
      const value = required(input.claimAmount, input.suitType === "damages" ? "Damages claimed" : "Amount claimed");
      return full(value, "section 6(i) read with Schedule I, Article 1", "Amount claimed in the plaint", [`Claim value: ${money(value)}`]);
    }
    case "maintenance": {
      const annual = required(input.claimAmount, "Annual maintenance claimed");
      return full(annual, "section 6(ii)", "Amount claimed to be payable for one year", [`Initial fee basis: one year's maintenance, ${money(annual)}`, "A later deficit may become payable if a maintenance decree is made, as provided by section 6(ii)"]);
    }
    case "movable_property": {
      const value = required(input.claimAmount, "Movable property market value");
      return full(value, "section 6(iii)", "Market value of the movable property on the date of plaint", [`Movable property value: ${money(value)}`]);
    }
    case "declaration_only": {
      const jurisdictionValue = required(input.reliefValue, "Value placed on declaratory relief");
      const basis = 1_000;
      return result(jurisdictionValue, basis, maharashtraAdValorem(basis), "section 6(iv)(j)", "Ad-valorem fee as if the subject matter were ₹1,000", [`Declaration stated to be incapable of monetary evaluation`, `Separate jurisdiction value entered: ${money(jurisdictionValue)}`], jurisdictionValue);
    }
    case "declaration_consequential": {
      const property = propertyValue(input);
      const fullFee = maharashtraAdValorem(property.feeValue);
      const fee = percentageFee(fullFee, 0.5, 100);
      return result(property.feeValue, property.feeValue, fee, "section 6(iv)(d), consequential-relief proviso", "One-half of the possession ad-valorem fee for an immovable-property declaration with consequential relief other than possession", [`Property valuation: ${property.text}`, `Full Schedule I fee ${money(fullFee)} × 1/2 = ${money(fee)}`], property.jurisdictionValue);
    }
    case "injunction": {
      const value = required(input.reliefValue, "Value placed on injunction relief");
      return full(value, "section 6(iv)(j) / applicable declaratory clause", "Plaintiff's stated value where the relief is monetarily evaluable", [`Relief value: ${money(value)}`]);
    }
    case "possession": {
      const property = propertyValue(input);
      return full(property.feeValue, `${property.clause} read with Schedule I, Article 1`, property.text, [`Court-fee value: ${money(property.feeValue)}`, `Open-market value retained separately for jurisdiction: ${money(property.jurisdictionValue)}`], property.jurisdictionValue);
    }
    case "partition": {
      const property = propertyValue(input);
      const share = required(input.plaintiffSharePercent, "Plaintiff share percentage");
      if (share > 100) throw new Error("Plaintiff share cannot exceed 100%.");
      const feeShare = Math.round((property.feeValue * share) / 100);
      const jurisdictionShare = Math.round((property.jurisdictionValue * share) / 100);
      return full(feeShare, "section 6(vii)", "Statutory property value × exact plaintiff share", [`Property valuation: ${property.text}`, `${share}% court-fee share: ${money(feeShare)}`, `${share}% jurisdiction share: ${money(jurisdictionShare)}`], jurisdictionShare);
    }
    case "specific_performance": {
      let basis = required(input.considerationAmount, "Contract consideration or secured amount");
      let detail = "Sale consideration";
      if (input.reliefVariant === "lease") {
        basis += required(input.secondaryAmount, "First-year rent");
        detail = "Lease premium plus first-year rent";
      } else if (input.reliefVariant === "mortgage") detail = "Amount agreed to be secured";
      return full(basis, "section 6(xi)", detail, [`Statutory basis: ${money(basis)}`]);
    }
    case "mortgage": {
      const principal = required(input.securedAmount, "Principal secured by the mortgage");
      return full(principal, "section 6(x)", "Principal money expressed to be secured", [`Mortgage principal: ${money(principal)}`]);
    }
    case "landlord_tenant": {
      const annual = required(input.annualRent, "Previous year's rent");
      return full(annual, "section 6(xii)", "Rent payable for the year before presentation of the plaint", [`Annual rent: ${money(annual)}`]);
    }
    case "accounts": {
      const value = required(input.reliefValue, "Plaintiff's stated accounts valuation");
      const fee = Math.max(100, maharashtraAdValorem(value));
      return result(value, value, fee, "section 6(iv)(i)", "Plaintiff's stated valuation, subject to a ₹100 minimum fee", [`Stated value: ${money(value)}`, `Schedule I fee subject to ₹100 minimum: ${money(fee)}`]);
    }
    case "cancellation": {
      const value = required(input.claimAmount, "Sale, contract or property value");
      const fullFee = maharashtraAdValorem(value);
      if (input.plaintiffExecutedDocument) {
        return result(value, value, fullFee, "Schedule I, Article 5", "Full ad-valorem fee where the plaintiff was a party to the alienation", [`Alienation value: ${money(value)}`, `Full Schedule I fee: ${money(fullFee)}`]);
      }
      const fee = percentageFee(fullFee, 0.5);
      return result(value, value, fee, "section 6(iv)(ha)", "One-half ad-valorem fee for declaration that a sale or contract for sale is void", [`Property value: ${money(value)}`, `Full fee ${money(fullFee)} × 1/2 = ${money(fee)}`]);
    }
    case "appeal": {
      const value = required(input.lowerCourtSuitValue, "Subject matter challenged in appeal");
      return full(value, "Schedule I, Article 1 / applicable relief entry", "Fee on the value of the relief challenged in appeal", [`Value challenged: ${money(value)}`]);
    }
    case "mesne_profits": {
      const value = required(input.claimAmount, "Mesne profits claimed");
      return full(value, "section 6(i)", "Amount of mesne profits claimed", [`Amount claimed: ${money(value)}`]);
    }
    default:
      throw new Error("This Maharashtra proceeding is not yet included in the first verified calculator version. No payment has been taken.");
  }
}
