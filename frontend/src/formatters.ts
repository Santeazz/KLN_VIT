import type { Employee, Observation, User } from './types';

type NamedPerson = {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  fullName?: string;
};

type EmployeeLike = Pick<Employee, 'employeeNumber'> & NamedPerson;
type UserLike = Pick<User, 'employeeNumber'> & NamedPerson;

function normalizeNumber(value?: string | null) {
  return value?.trim() ?? '';
}

export function formatShortName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[1]}`;
}

export function formatFullName(person: NamedPerson) {
  return person.fullName?.trim() || [person.lastName, person.firstName, person.middleName]
    .filter(Boolean)
    .join(' ');
}

export function formatEmployeeChecklistLabel(employee: EmployeeLike) {
  return [normalizeNumber(employee.employeeNumber), formatShortName(formatFullName(employee))]
    .filter(Boolean)
    .join(' ');
}

export function formatObserverChecklistLabel(user: UserLike) {
  return [normalizeNumber(user.employeeNumber), formatShortName(formatFullName(user))]
    .filter(Boolean)
    .join(' ');
}

export function formatScoreValue(value: number) {
  const normalized = Number(value);

  if (Number.isInteger(normalized)) {
    return `${normalized}`;
  }

  return normalized.toFixed(2).replace(/\.?0+$/, '');
}

export function formatObservationScore(observation: Pick<Observation, 'totalScore' | 'maxScore'>) {
  return `${formatScoreValue(Number(observation.totalScore))}/${formatScoreValue(Number(observation.maxScore))}`;
}
