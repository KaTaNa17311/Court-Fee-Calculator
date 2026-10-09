import assert from "node:assert/strict";
import { calculateDelhi, delhiAdValorem } from "../lib/legal/delhi.ts";

assert.equal(delhiAdValorem(100), 10);
assert.equal(delhiAdValorem(500), 50);
assert.equal(delhiAdValorem(510), 76.5);
assert.equal(delhiAdValorem(1_000), 150);
assert.equal(delhiAdValorem(5_000), 638);
assert.equal(delhiAdValorem(10_000), 1_126);
assert.equal(delhiAdValorem(20_000), 1_856);
assert.equal(delhiAdValorem(50_000), 2_832);
assert.equal(delhiAdValorem(400_000), 6_248);
assert.equal(delhiAdValorem(500_000), 7_224, "₹5 lakh must use the Delhi table, not another State's formula");

const maintenance = calculateDelhi({ stateId: "dl", district: "New Delhi", suitType: "maintenance", claimAmount: 120_000 });
assert.equal(maintenance.suitValue, 1_200_000);
assert.equal(maintenance.courtFee, 14_056);

const partition = calculateDelhi({ stateId: "dl", district: "South Delhi", suitType: "partition", propertyMarketValue: 4_000_000, plaintiffSharePercent: 25, excludedFromPossession: false });
assert.equal(partition.suitValue, 1_000_000);
assert.equal(partition.courtFee, 19.5);

const excludedPartition = calculateDelhi({ stateId: "dl", district: "South Delhi", suitType: "partition", propertyMarketValue: 4_000_000, plaintiffSharePercent: 25, excludedFromPossession: true });
assert.equal(excludedPartition.courtFee, 12_104);

console.log("Verified 14 Delhi statutory rule checkpoints.");
