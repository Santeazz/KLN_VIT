export function normalizeNumber(value?: string | null) {
  return value?.trim() ?? '';
}

export function buildFullName(
  lastName: string,
  firstName: string,
  middleName?: string | null,
) {
  return [lastName, firstName, middleName?.trim()].filter(Boolean).join(' ');
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

export function formatChecklistPersonLabel(employeeNumber?: string | null, fullName?: string | null) {
  return [normalizeNumber(employeeNumber), fullName ? formatShortName(fullName) : '']
    .filter(Boolean)
    .join(' ');
}
