import { expect, test, type Page, type Route } from '@playwright/test';

type UserRole = 'admin' | 'manager' | 'observer' | 'hr';
type ObservationStatus = 'draft' | 'signed' | 'archived';

type User = {
  id: string;
  employeeNumber: string;
  personnelNumber: string;
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
};

type Employee = {
  id: string;
  employeeNumber: string;
  personnelNumber: string;
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string;
  position: string;
  hireDate: string;
  isActive: boolean;
};

type Template = {
  id: string;
  title: string;
  position: string;
  isActive: boolean;
  criteria: Array<{
    id: string;
    sortOrder: number;
    title: string;
    description: string;
    maxScore: number;
  }>;
};

type Observation = {
  id: string;
  employee: Employee;
  observer: User;
  template: Template;
  observationDate: string;
  position: string;
  status: ObservationStatus;
  totalScore: number;
  maxScore: number;
  percentage: number;
  violationsCount: number;
  comment: string;
  results: Array<{
    id: string;
    criterionTitle: string;
    criterionDescription: string;
    score: number;
    maxScore: number;
    passed: boolean;
    comment: string;
  }>;
  signatures: Array<{
    id: string;
    signerRole: 'observer' | 'employee';
    signedByName: string;
    documentDigest: string;
    signedDigest: string;
    signedAt: string;
  }>;
};

type BonusReport = {
  period: string;
  generatedAt: string;
  rule: string;
  rows: Array<Record<string, unknown>>;
};

type Scenario = {
  restoredUser?: User;
  loginUser?: User;
  users?: User[];
  employees?: Employee[];
  templates?: Template[];
  observations?: Observation[];
  bonusReport?: BonusReport;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeUser(role: UserRole): User {
  return {
    id: `${role}-1`,
    employeeNumber:
      role === 'admin' ? '1' : role === 'manager' ? '12' : role === 'hr' ? '40' : '25',
    personnelNumber:
      role === 'admin'
        ? '980001'
        : role === 'manager'
          ? '980200'
          : role === 'hr'
            ? '980400'
            : '980300',
    lastName: 'Волкова',
    firstName: 'Ирина',
    middleName: 'Сергеевна',
    fullName: 'Волкова Ирина Сергеевна',
    role,
    isActive: true,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: overrides.id ?? 'employee-1',
    employeeNumber: overrides.employeeNumber ?? '97',
    personnelNumber: overrides.personnelNumber ?? '982128',
    lastName: overrides.lastName ?? 'Иванова',
    firstName: overrides.firstName ?? 'Мария',
    middleName: overrides.middleName ?? 'Сергеевна',
    fullName: overrides.fullName ?? 'Иванова Мария Сергеевна',
    position: overrides.position ?? 'Работник ПБО',
    hireDate: overrides.hireDate ?? '2024-04-15',
    isActive: overrides.isActive ?? true,
  };
}

function makeTemplate(): Template {
  return {
    id: 'template-1',
    title: 'Шаблон кассы',
    position: 'Кассовая зона',
    isActive: true,
    criteria: [
      {
        id: 'criterion-1',
        sortOrder: 1,
        title: 'Критерий 1',
        description: 'Описание 1',
        maxScore: 1,
      },
    ],
  };
}

function makeObservation(status: ObservationStatus = 'draft'): Observation {
  const employee = makeEmployee();
  const observer = makeUser('manager');
  const template = makeTemplate();
  const signatures =
    status === 'draft'
      ? []
      : [
          {
            id: 'signature-observer',
            signerRole: 'observer' as const,
            signedByName: '12 Волкова Ирина',
            documentDigest: 'digest',
            signedDigest: 'signed',
            signedAt: '2026-05-23T10:00:00.000Z',
          },
          {
            id: 'signature-employee',
            signerRole: 'employee' as const,
            signedByName: '97 Иванова Мария',
            documentDigest: 'digest',
            signedDigest: 'signed',
            signedAt: '2026-05-23T10:02:00.000Z',
          },
        ];

  return {
    id: `observation-${status}`,
    employee,
    observer,
    template,
    observationDate: '2026-05-23',
    position: template.position,
    status,
    totalScore: 1,
    maxScore: 1,
    percentage: 100,
    violationsCount: 0,
    comment: 'Комментарий',
    results: [
      {
        id: 'result-1',
        criterionTitle: 'Критерий 1',
        criterionDescription: 'Описание 1',
        score: 1,
        maxScore: 1,
        passed: true,
        comment: '',
      },
    ],
    signatures,
  };
}

function makeBonusReport(): BonusReport {
  return {
    period: '2026-05',
    generatedAt: '2026-05-23T10:00:00.000Z',
    rule: 'Если за календарный месяц зафиксировано два и более наблюдения с нарушениями, сотрудник лишается премии.',
    rows: [],
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

async function mockApi(page: Page, scenario: Scenario) {
  const state = {
    restoredUser: scenario.restoredUser ? clone(scenario.restoredUser) : undefined,
    loginUser: clone(scenario.loginUser ?? scenario.restoredUser ?? makeUser('manager')),
    users: clone(scenario.users ?? []),
    employees: clone(scenario.employees ?? [makeEmployee()]),
    templates: clone(scenario.templates ?? [makeTemplate()]),
    observations: clone(scenario.observations ?? []),
    bonusReport: clone(scenario.bonusReport ?? makeBonusReport()),
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === 'POST' && path === '/api/auth/login') {
      return fulfillJson(route, {
        accessToken: 'jwt-token',
        user: state.loginUser,
      });
    }

    if (method === 'GET' && path === '/api/auth/me') {
      return fulfillJson(route, state.restoredUser ?? state.loginUser);
    }

    if (method === 'GET' && path === '/api/users') {
      return fulfillJson(route, state.users);
    }

    if (method === 'GET' && path.startsWith('/api/users/')) {
      const id = path.split('/').pop() ?? '';
      return fulfillJson(route, state.users.find((item) => item.id === id) ?? state.loginUser);
    }

    if (method === 'GET' && path === '/api/employees') {
      return fulfillJson(route, state.employees);
    }

    if (method === 'GET' && path.startsWith('/api/employees/')) {
      const id = path.split('/').pop() ?? '';
      return fulfillJson(
        route,
        state.employees.find((item) => item.id === id) ?? state.employees[0],
      );
    }

    if (method === 'GET' && path === '/api/templates') {
      return fulfillJson(route, state.templates);
    }

    if (method === 'GET' && path.startsWith('/api/templates/')) {
      const id = path.split('/').pop() ?? '';
      return fulfillJson(
        route,
        state.templates.find((item) => item.id === id) ?? state.templates[0],
      );
    }

    if (method === 'GET' && path === '/api/observations') {
      return fulfillJson(route, state.observations);
    }

    if (method === 'GET' && /^\/api\/observations\/[^/]+$/.test(path)) {
      const id = path.split('/').pop() ?? '';
      return fulfillJson(
        route,
        state.observations.find((item) => item.id === id) ?? state.observations[0],
      );
    }

    if (method === 'POST' && /^\/api\/observations\/[^/]+\/sign$/.test(path)) {
      const id = path.split('/')[3] ?? '';
      const observation = state.observations.find((item) => item.id === id);
      const payload = JSON.parse(request.postData() ?? '{}') as {
        signerRole?: 'observer' | 'employee';
      };

      if (!observation || !payload.signerRole) {
        return fulfillJson(route, { message: 'Observation not found' }, 404);
      }

      if (
        payload.signerRole === 'observer' &&
        !observation.signatures.some((item) => item.signerRole === 'observer')
      ) {
        observation.signatures.push({
          id: `signature-observer-${observation.signatures.length + 1}`,
          signerRole: 'observer',
          signedByName: '12 Волкова Ирина',
          documentDigest: 'digest',
          signedDigest: 'signed',
          signedAt: '2026-05-23T10:00:00.000Z',
        });
      }

      if (
        payload.signerRole === 'employee' &&
        !observation.signatures.some((item) => item.signerRole === 'employee')
      ) {
        observation.signatures.push({
          id: `signature-employee-${observation.signatures.length + 1}`,
          signerRole: 'employee',
          signedByName: '97 Иванова Мария',
          documentDigest: 'digest',
          signedDigest: 'signed',
          signedAt: '2026-05-23T10:02:00.000Z',
        });
      }

      const signedRoles = new Set(observation.signatures.map((item) => item.signerRole));
      if (signedRoles.has('observer') && signedRoles.has('employee')) {
        observation.status = 'signed';
      }

      return fulfillJson(route, observation);
    }

    if (method === 'PATCH' && /^\/api\/observations\/[^/]+\/archive$/.test(path)) {
      const id = path.split('/')[3] ?? '';
      const observation = state.observations.find((item) => item.id === id);
      if (!observation) {
        return fulfillJson(route, { message: 'Observation not found' }, 404);
      }

      observation.status = 'archived';
      return fulfillJson(route, observation);
    }

    if (method === 'GET' && path === '/api/reports/bonus') {
      return fulfillJson(route, state.bonusReport);
    }

    return fulfillJson(route, { message: `Unhandled route: ${method} ${path}` }, 500);
  });
}

async function openMenu(page: Page) {
  await page.locator('.menu-toggle').click();
  await expect(page.locator('nav.sidebar-nav')).toBeVisible();
}

test('manager can log in and success toast disappears automatically', async ({ page }) => {
  await mockApi(page, {
    loginUser: makeUser('manager'),
    observations: [],
  });

  await page.goto('/');
  await page.locator('input').first().fill('980200');
  await page.locator('input[type="password"]').fill('manager123');
  await page.locator('.login-panel form button').click();

  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('.toast')).toContainText('Вход выполнен');
  await expect(page.locator('.dashboard-hero')).toBeVisible();
  await expect(page.locator('.user-chip')).toContainText('Волкова Ирина Сергеевна');

  await page.waitForTimeout(3000);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('HR account does not see templates in burger menu', async ({ page }) => {
  await mockApi(page, {
    restoredUser: makeUser('hr'),
    observations: [],
  });

  await page.addInitScript(() => {
    localStorage.setItem('kln_token', 'stored-token');
  });

  await page.goto('/');
  await expect(page.locator('.app-shell')).toBeVisible();
  await openMenu(page);

  const nav = page.locator('nav.sidebar-nav');
  await expect(nav).toContainText('Премирование');
  await expect(nav).toContainText('Персонал');
  await expect(nav).not.toContainText('Шаблоны');
});

test('observer opens employees-only personnel section', async ({ page }) => {
  await mockApi(page, {
    restoredUser: makeUser('observer'),
    observations: [],
  });

  await page.addInitScript(() => {
    localStorage.setItem('kln_token', 'stored-token');
  });

  await page.goto('/');
  await openMenu(page);
  await page.locator('nav.sidebar-nav button', { hasText: 'Сотрудники' }).click();

  await expect(page.locator('.records-panel .panel-header')).toContainText('Сотрудники');
  await expect(page.locator('.section-tabs')).toHaveCount(0);
  await expect(page.locator('.search-field')).toContainText('Поиск по сотрудникам');
  await expect(page.locator('.details-panel')).toHaveCount(0);
});

test('admin can filter users and employees in personnel section', async ({ page }) => {
  await mockApi(page, {
    restoredUser: makeUser('admin'),
    users: [
      makeUser('admin'),
      {
        ...makeUser('hr'),
        id: 'hr-2',
        lastName: 'Петрова',
        firstName: 'Анна',
        middleName: 'Игоревна',
        fullName: 'Петрова Анна Игоревна',
      },
    ],
    employees: [
      makeEmployee(),
      makeEmployee({
        id: 'employee-2',
        employeeNumber: '98',
        personnelNumber: '982129',
        lastName: 'Смирнов',
        firstName: 'Алексей',
        middleName: 'Олегович',
        fullName: 'Смирнов Алексей Олегович',
        position: 'Инструктор',
      }),
    ],
    observations: [],
  });

  await page.addInitScript(() => {
    localStorage.setItem('kln_token', 'stored-token');
  });

  await page.goto('/');
  await openMenu(page);
  await page.locator('nav.sidebar-nav button', { hasText: 'Персонал' }).click();

  await page.locator('input[type="search"]').fill('Петрова');
  await expect(page.locator('.directory-list .person-card')).toHaveCount(1);
  await expect(page.locator('.directory-list')).toContainText('Петрова Анна Игоревна');

  await page.locator('.section-tabs button', { hasText: 'Сотрудники' }).click();
  await page.locator('input[type="search"]').fill('Инструктор');
  await expect(page.locator('.directory-list .person-card')).toHaveCount(1);
  await expect(page.locator('.directory-list')).toContainText('Смирнов Алексей Олегович');
});

test('manager signs draft observation and archives it from the journal', async ({ page }) => {
  await mockApi(page, {
    restoredUser: makeUser('manager'),
    observations: [makeObservation('draft')],
  });

  await page.addInitScript(() => {
    localStorage.setItem('kln_token', 'stored-token');
  });

  await page.goto('/');
  await openMenu(page);
  await page.locator('nav.sidebar-nav button', { hasText: 'Журнал КЛН' }).click();

  await page.locator('.observation-card').click();
  const employeeSignatureInput = page.locator('.signature-step').nth(1).locator('input');

  await expect(page.locator('.signature-step')).toHaveCount(2);
  await expect(employeeSignatureInput).toBeDisabled();

  await page.locator('.signature-step').first().locator('button').click();
  await expect(page.locator('.signature-step').first()).toContainText('Подписано');
  await expect(employeeSignatureInput).toBeEnabled();

  await employeeSignatureInput.fill('982128');
  await page.locator('.signature-step').nth(1).locator('button').click();

  await expect(page.locator('.signature-step')).toHaveCount(0);
  const archiveButton = page.getByRole('button', { name: 'Перенести в архив' });
  await expect(archiveButton).toBeEnabled();

  await archiveButton.click();
  await expect(page.locator('.kln-sheet__header .status-badge')).toContainText('Архив');
});
