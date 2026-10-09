import assert from "node:assert/strict";
import { calculateTamilNadu, tamilNaduAdValorem } from "../lib/legal/tamilnadu.ts";

assert.equal(tamilNaduAdValorem(500_000), 15_000, "₹5 lakh money claim must produce ₹15,000, not Karnataka's ₹33,375");
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Coimbatore", suitType: "money_recovery", claimAmount: 500_000 }).courtFee, 15_000);
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Madurai", suitType: "declaration_only", reliefValue: 500 }).feeBasis, 1_000);
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Salem", suitType: "declaration_consequential", propertyMarketValue: 2_000_000 }).courtFee, 30_000);
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Tiruchirappalli", suitType: "partition", propertyMarketValue: 4_000_000, plaintiffSharePercent: 25, excludedFromPossession: true }).courtFee, 30_000);
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Tiruchirappalli", suitType: "partition", propertyMarketValue: 4_000_000, plaintiffSharePercent: 25, excludedFromPossession: false }).courtFee, 100);
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Erode", suitType: "cancellation", claimAmount: 1_000_000, plaintiffExecutedDocument: true }).courtFee, 30_000);
assert.equal(calculateTamilNadu({ stateId: "tn", district: "Erode", suitType: "cancellation", claimAmount: 1_000_000, plaintiffExecutedDocument: false }).courtFee, 30);

console.log("Verified 8 Tamil Nadu statutory rule checkpoints.");
