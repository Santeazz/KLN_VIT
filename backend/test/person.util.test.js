const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFullName,
  formatChecklistPersonLabel,
  formatShortName,
  normalizeNumber,
} = require('../dist/common/utils/person.util');

test('normalizeNumber trims surrounding spaces', () => {
  assert.equal(normalizeNumber('  982128  '), '982128');
  assert.equal(normalizeNumber(null), '');
});

test('buildFullName joins available name parts', () => {
  assert.equal(buildFullName('Ivanova', 'Darya', 'Sergeevna'), 'Ivanova Darya Sergeevna');
  assert.equal(buildFullName('Ivanova', 'Darya', '   '), 'Ivanova Darya');
});

test('formatShortName keeps the first two parts of the full name', () => {
  assert.equal(formatShortName('Ivanova Darya Sergeevna'), 'Ivanova Darya');
  assert.equal(formatShortName('Single'), 'Single');
});

test('formatChecklistPersonLabel combines employee number and short name', () => {
  assert.equal(
    formatChecklistPersonLabel('97', 'Ivanova Darya Sergeevna'),
    '97 Ivanova Darya',
  );
  assert.equal(formatChecklistPersonLabel('', 'Ivanova Darya Sergeevna'), 'Ivanova Darya');
});
