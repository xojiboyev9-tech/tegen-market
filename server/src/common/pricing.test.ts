import assert from 'node:assert/strict';
import { lineTotal, validQuantity } from './pricing';

// Hujjatdagi misollar
assert.equal(lineTotal('WEIGHT', 45000, 500), 22500); // 0.5 kg doktor kolbasa
assert.equal(lineTotal('WEIGHT', 45000, 512), 23040); // yig'ishda 0.512 kg chiqdi
assert.equal(lineTotal('PIECE', 5000, 2), 10000); // 2 ta tandir non
assert.equal(lineTotal('PIECE', 5000, 2) + lineTotal('WEIGHT', 45000, 500), 32500);
assert.ok(validQuantity('WEIGHT', 250) && !validQuantity('WEIGHT', 5) && !validQuantity('WEIGHT', 255));
assert.ok(validQuantity('PIECE', 3) && !validQuantity('PIECE', 0) && !validQuantity('PIECE', 1.5));
console.log('pricing OK');
