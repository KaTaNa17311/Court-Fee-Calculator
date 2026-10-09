import assert from "node:assert/strict";
import { calculateMaharashtra, maharashtraAdValorem } from "../lib/legal/maharashtra.ts";

assert.equal(maharashtraAdValorem(1_000), 200);
assert.equal(maharashtraAdValorem(5_000), 680);
assert.equal(maharashtraAdValorem(10_000), 1_430);
assert.equal(maharashtraAdValorem(100_000), 6_430);
assert.equal(maharashtraAdValorem(500_000), 14_430, "₹5 lakh must use Maharashtra Schedule I, not another State's formula");
assert.equal(maharashtraAdValorem(1_100_000), 26_430);
assert.equal(maharashtraAdValorem(1_200_000), 27_630);
assert.equal(maharashtraAdValorem(100_000_000), 300_000, "Schedule I fee ceiling must be ₹3 lakh");

const shortSettlement = calculateMaharashtra({
  stateId: "mh", district: "Pune", suitType: "possession", propertyMarketValue: 2_000_000,
  propertyValuationMethod: "agricultural_short_settlement", annualLandRevenue: 10_000,
});
assert.equal(shortSettlement.feeBasis, 400_000);
assert.equal(shortSettlement.courtFee, 12_430);
assert.equal(shortSettlement.jurisdictionValue, 2_000_000);

const longSettlement = calculateMaharashtra({
  stateId: "mh", district: "Nashik", suitType: "possession", propertyMarketValue: 2_000_000,
  propertyValuationMethod: "agricultural_long_settlement", annualLandRevenue: 10_000,
});
assert.equal(longSettlement.feeBasis, 800_000);
assert.equal(longSettlement.courtFee, 20_430);

assert.equal(calculateMaharashtra({ stateId: "mh", district: "Nagpur", suitType: "partition", propertyMarketValue: 4_000_000, plaintiffSharePercent: 25 }).suitValue, 1_000_000);
assert.equal(calculateMaharashtra({ stateId: "mh", district: "Kolhapur", suitType: "declaration_only", reliefValue: 500_000 }).courtFee, 200);
assert.equal(calculateMaharashtra({ stateId: "mh", district: "Thane", suitType: "cancellation", claimAmount: 1_000_000, plaintiffExecutedDocument: false }).courtFee, 12_215);

console.log("Verified 15 Maharashtra statutory rule checkpoints.");
