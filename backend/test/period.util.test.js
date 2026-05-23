const test = require('node:test');
const assert = require('node:assert/strict');

const { BadRequestException } = require('@nestjs/common');

const { currentMonth, parseMonthPeriod } = require('../dist/common/utils/period.util');

test('parseMonthPeriod returns UTC month boundaries', () => {
  const period = parseMonthPeriod('2026-05');

  assert.equal(period.start.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(period.end.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('parseMonthPeriod rejects invalid format', () => {
  assert.throws(() => parseMonthPeriod('05-2026'), BadRequestException);
});

test('parseMonthPeriod rejects invalid month number', () => {
  assert.throws(() => parseMonthPeriod('2026-13'), BadRequestException);
});

test('currentMonth returns a YYYY-MM string', () => {
  assert.match(currentMonth(), /^\d{4}-\d{2}$/);
});
