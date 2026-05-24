import type {
  BonusReport,
  ObservationStatus,
  ChecklistTemplate,
  Employee,
  Observation,
  SignatureRole,
  User,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ObservationDraftResult {
  criterionId: string;
  score: number;
  passed: boolean;
  comment?: string;
}

export interface CreateObservationPayload {
  employeeId: string;
  templateId: string;
  observationDate: string;
  comment?: string;
  results: ObservationDraftResult[];
}

export interface UserPayload {
  employeeNumber: string;
  personnelNumber: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  role: User['role'];
  password?: string;
  isActive?: boolean;
}

export interface EmployeePayload {
  employeeNumber: string;
  personnelNumber: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  position: string;
  hireDate?: string;
  isActive?: boolean;
}

export interface TemplateCriterionPayload {
  sortOrder: number;
  title: string;
  description: string;
  maxScore: number;
}

export interface TemplatePayload {
  title: string;
  position: string;
  isActive?: boolean;
  criteria: TemplateCriterionPayload[];
}

export interface SignaturePayload {
  signerRole: SignatureRole;
  employeeTabNumber?: string;
}

export interface ObservationListParams {
  month?: string;
  employeeId?: string;
  status?: ObservationStatus;
}

let accessToken = localStorage.getItem('kln_token') || '';

export function setAccessToken(token: string) {
  accessToken = token;
  localStorage.setItem('kln_token', token);
}

export function clearAccessToken() {
  accessToken = '';
  localStorage.removeItem('kln_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.message || `Ошибка запроса: ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return response.json();
}

export const api = {
  login(tabNumber: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tabNumber, password }),
    });
  },
  me() {
    return request<User>('/auth/me');
  },
  users() {
    return request<User[]>('/users');
  },
  user(id: string) {
    return request<User>(`/users/${id}`);
  },
  createUser(payload: UserPayload) {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateUser(id: string, payload: UserPayload) {
    return request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  employees() {
    return request<Employee[]>('/employees');
  },
  employee(id: string) {
    return request<Employee>(`/employees/${id}`);
  },
  createEmployee(payload: EmployeePayload) {
    return request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateEmployee(id: string, payload: EmployeePayload) {
    return request<Employee>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  templates() {
    return request<ChecklistTemplate[]>('/templates');
  },
  template(id: string) {
    return request<ChecklistTemplate>(`/templates/${id}`);
  },
  createTemplate(payload: TemplatePayload) {
    return request<ChecklistTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateTemplate(id: string, payload: TemplatePayload) {
    return request<ChecklistTemplate>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  observations(params: ObservationListParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.month) searchParams.set('month', params.month);
    if (params.employeeId) searchParams.set('employeeId', params.employeeId);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Observation[]>(`/observations${query}`);
  },
  observation(id: string) {
    return request<Observation>(`/observations/${id}`);
  },
  createObservation(payload: CreateObservationPayload) {
    return request<Observation>('/observations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  signObservation(id: string, payload: SignaturePayload) {
    return request<Observation>(`/observations/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  archiveObservation(id: string) {
    return request<Observation>(`/observations/${id}/archive`, { method: 'PATCH' });
  },
  bonusReport(month: string) {
    return request<BonusReport>(`/reports/bonus?month=${encodeURIComponent(month)}`);
  },
};
