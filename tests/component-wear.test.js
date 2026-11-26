import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateComponentWear, summarizeBikeComponents } from '../public/js/domain/component-wear.js';

test('calculateComponentWear menghitung persentase dan status dengan akurat', () => {
  const chain = {
    id: 'comp-1',
    userId: 'user-1',
    bikeId: 'bike-1',
    name: 'Shimano CN-HG601',
    category: 'Drivetrain',
    installedOdometerKm: 5000,
    lifespanKm: 3000,
  };

  const result = calculateComponentWear(chain, 7250);
  assert.equal(result.distanceUsedKm, 2250);
  assert.equal(result.remainingKm, 750);
  assert.equal(result.wearPercentage, 75);
  assert.equal(result.status, 'warning');
  assert.equal(result.needsAttention, true);
});

test('summarizeBikeComponents mengabaikan komponen arsip dan mengurutkan keausan tertinggi', () => {
  const components = [
    {
      id: 'c1',
      userId: 'u1',
      bikeId: 'b1',
      name: 'Ban Depan',
      category: 'Tires',
      installedOdometerKm: 6000,
      lifespanKm: 5000,
      isArchived: false,
    },
    {
      id: 'c2',
      userId: 'u1',
      bikeId: 'b1',
      name: 'Rantai Lama',
      category: 'Drivetrain',
      installedOdometerKm: 1000,
      lifespanKm: 3000,
      isArchived: true,
    },
    {
      id: 'c3',
      userId: 'u1',
      bikeId: 'b1',
      name: 'Brake Pad',
      category: 'Brakes',
      installedOdometerKm: 4000,
      lifespanKm: 3000,
      isArchived: false,
    },
  ];

  const summary = summarizeBikeComponents(components, 7100);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.items[0].id, 'c3');
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.attentionCount, 1);
});
