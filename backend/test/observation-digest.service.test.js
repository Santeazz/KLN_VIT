const test = require('node:test');
const assert = require('node:assert/strict');

const { ObservationDigestService } = require('../dist/observations/observation-digest.service');

function makeObservation(results) {
  return {
    id: 'observation-1',
    employee: {
      employeeNumber: '97',
      fullName: 'Employee One',
    },
    observer: {
      employeeNumber: '12',
      fullName: 'Observer One',
    },
    template: {
      title: 'Template',
    },
    observationDate: '2026-05-23',
    position: 'Kitchen',
    totalScore: 1,
    maxScore: 2,
    percentage: 50,
    violationsCount: 1,
    results,
  };
}

test('ObservationDigestService produces the same digest regardless of result order', () => {
  const service = new ObservationDigestService();

  const digestA = service.createDigest(
    makeObservation([
      { criterionTitle: 'B', score: 0, maxScore: 1, passed: false, comment: '' },
      { criterionTitle: 'A', score: 1, maxScore: 1, passed: true, comment: '' },
    ]),
  );
  const digestB = service.createDigest(
    makeObservation([
      { criterionTitle: 'A', score: 1, maxScore: 1, passed: true, comment: '' },
      { criterionTitle: 'B', score: 0, maxScore: 1, passed: false, comment: '' },
    ]),
  );

  assert.equal(digestA, digestB);
});

test('ObservationDigestService changes digest when result data changes', () => {
  const service = new ObservationDigestService();

  const digestA = service.createDigest(
    makeObservation([{ criterionTitle: 'A', score: 1, maxScore: 1, passed: true, comment: '' }]),
  );
  const digestB = service.createDigest(
    makeObservation([{ criterionTitle: 'A', score: 0, maxScore: 1, passed: false, comment: '' }]),
  );

  assert.notEqual(digestA, digestB);
});
