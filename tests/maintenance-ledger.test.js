import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCostPerKm,
  summarizeMaintenanceLedger,
} from '../public/js/domain/maintenance-ledger.js';

test('calculateCostPerKm menangani pembagi nol dengan aman', () => {
  assert.equal(calculateCostPerKm(500000, 0), null);
  assert.equal(calculateCostPerKm(500000, 2500), 200);
});

test('summarizeMaintenanceLedger mengagregasi biaya dan breakdown kategori', () => {
  const entries = [
    { id: '1', userId: 'u1', bikeId: 'b1', title: 'Rantai', category: 'Drivetrain', cost: 350000, date: '2026-10-01' },
    { id: '2', userId: 'u1', bikeId: 'b1', title: 'Ban', category: 'Tires', cost: 650000, date: '2026-10-15' },
    { id: '3', userId: 'u1', bikeId: 'b2', title: 'Servis', category: 'Service', cost: 150000, date: '2026-11-01' },
  ];

  const summary = summarizeMaintenanceLedger(entries, 5000, { bikeId: 'b1' });
  assert.equal(summary.entryCount, 2);
  assert.equal(summary.totalCost, 1000000);
  assert.equal(summary.costPerKm, 200);
  assert.equal(summary.byCategory[0].category, 'Tires');
});
