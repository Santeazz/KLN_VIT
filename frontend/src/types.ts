export type UserRole = 'admin' | 'manager' | 'observer' | 'hr';

export interface User {
  id: string;
  employeeNumber: string;
  personnelNumber?: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  personnelNumber?: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  fullName: string;
  position: string;
  department?: string;
  hireDate?: string;
  isActive: boolean;
}

export interface ChecklistCriterion {
  id: string;
  sortOrder: number;
  title: string;
  description: string;
  maxScore: number;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  position: string;
  version: number;
  isActive: boolean;
  criteria: ChecklistCriterion[];
}

export type ObservationStatus = 'draft' | 'signed' | 'archived';
export type SignatureRole = 'employee' | 'observer';

export interface ObservationResult {
  id: string;
  criterionTitle: string;
  criterionDescription: string;
  score: number;
  maxScore: number;
  passed: boolean;
  comment?: string;
}

export interface ObservationSignature {
  id: string;
  signerRole: SignatureRole;
  signedByName: string;
  documentDigest: string;
  signedDigest: string;
  signedAt: string;
}

export interface Observation {
  id: string;
  employee: Employee;
  observer: User;
  template: ChecklistTemplate;
  observationDate: string;
  position: string;
  status: ObservationStatus;
  totalScore: number;
  maxScore: number;
  percentage: number;
  violationsCount: number;
  comment?: string;
  results: ObservationResult[];
  signatures: ObservationSignature[];
}

export interface BonusReportRow {
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  position: string;
  observationsCount: number;
  violationEvents: number;
  averagePercentage: number | null;
  bonusAllowed: boolean;
  decision: string;
  reason: string;
}

export interface BonusReport {
  period: string;
  generatedAt: string;
  rule: string;
  rows: BonusReportRow[];
}
