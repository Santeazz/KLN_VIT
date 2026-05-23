import { BadRequestException } from '@nestjs/common';

export function parseMonthPeriod(month: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestException('Период должен быть указан в формате YYYY-MM');
  }
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new BadRequestException('Номер месяца должен быть от 01 до 12');
  }
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
