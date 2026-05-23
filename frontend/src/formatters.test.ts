import { describe, expect, it } from 'vitest';
import {
  formatEmployeeChecklistLabel,
  formatFullName,
  formatObservationScore,
  formatObserverChecklistLabel,
  formatScoreValue,
  formatShortName,
} from './formatters';

describe('formatters', () => {
  it('builds a full name from parts when fullName is absent', () => {
    expect(
      formatFullName({
        lastName: 'Иванова',
        firstName: 'Дарья',
        middleName: 'Сергеевна',
      }),
    ).toBe('Иванова Дарья Сергеевна');
  });

  it('returns the first two parts for short names', () => {
    expect(formatShortName('Иванова Дарья Сергеевна')).toBe('Иванова Дарья');
    expect(formatShortName('Дарья')).toBe('Дарья');
  });

  it('formats checklist labels for employee and observer', () => {
    const person = {
      employeeNumber: ' 97 ',
      lastName: 'Иванова',
      firstName: 'Дарья',
      middleName: 'Сергеевна',
    };

    expect(formatEmployeeChecklistLabel(person)).toBe('97 Иванова Дарья');
    expect(formatObserverChecklistLabel(person)).toBe('97 Иванова Дарья');
  });

  it('formats score values without trailing zeros', () => {
    expect(formatScoreValue(5)).toBe('5');
    expect(formatScoreValue(1.5)).toBe('1.5');
    expect(formatScoreValue(1.25)).toBe('1.25');
  });

  it('formats observation score as total/max', () => {
    expect(formatObservationScore({ totalScore: 1.5, maxScore: 3 })).toBe('1.5/3');
  });
});
