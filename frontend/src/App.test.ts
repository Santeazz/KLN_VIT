import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, setAccessTokenMock, clearAccessTokenMock } = vi.hoisted(() => ({
  apiMock: {
    login: vi.fn(),
    me: vi.fn(),
    users: vi.fn(),
    user: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    employees: vi.fn(),
    employee: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    templates: vi.fn(),
    template: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    observations: vi.fn(),
    observation: vi.fn(),
    createObservation: vi.fn(),
    signObservation: vi.fn(),
    archiveObservation: vi.fn(),
    bonusReport: vi.fn(),
  },
  setAccessTokenMock: vi.fn(),
  clearAccessTokenMock: vi.fn(),
}));

vi.mock('./api', () => ({
  api: apiMock,
  setAccessToken: (token: string) => {
    setAccessTokenMock(token);
    localStorage.setItem('kln_token', token);
  },
  clearAccessToken: () => {
    clearAccessTokenMock();
    localStorage.removeItem('kln_token');
  },
}));

import App from './App.vue';

function makeUser(role: 'admin' | 'manager' | 'observer' | 'hr') {
  return {
    id: `${role}-1`,
    employeeNumber: role === 'admin' ? '1' : role === 'manager' ? '12' : role === 'hr' ? '40' : '25',
    personnelNumber: `98${role.length}001`,
    lastName: 'Волкова',
    firstName: 'Ирина',
    middleName: 'Сергеевна',
    fullName: 'Волкова Ирина Сергеевна',
    role,
    isActive: true,
  } as const;
}

function makeEmployee() {
  return {
    id: 'employee-1',
    employeeNumber: '97',
    personnelNumber: '982128',
    lastName: 'Иванова',
    firstName: 'Мария',
    middleName: 'Сергеевна',
    fullName: 'Иванова Мария Сергеевна',
    position: 'Работник ПБО',
    department: 'Зал',
    hireDate: '2024-04-15',
    isActive: true,
  };
}

function makeTemplate() {
  return {
    id: 'template-1',
    title: 'Шаблон кассы',
    position: 'Кассовая зона',
    version: 1,
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

function makeObservation(status: 'draft' | 'signed' | 'archived' = 'signed') {
  const employee = makeEmployee();
  const observer = makeUser('manager');
  const template = makeTemplate();

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
    signatures:
      status === 'draft'
        ? []
        : [
            {
              id: 'signature-observer',
              signerRole: 'observer',
              signedByName: '12 Волкова Ирина',
              documentDigest: 'digest',
              signedDigest: 'signed',
              signedAt: '2026-05-23T10:00:00.000Z',
            },
            {
              id: 'signature-employee',
              signerRole: 'employee',
              signedByName: '97 Иванова Мария',
              documentDigest: 'digest',
              signedDigest: 'signed',
              signedAt: '2026-05-23T10:02:00.000Z',
            },
          ],
  };
}

async function flushUi() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

function getMenuButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('nav.sidebar-nav button').find((item) => item.text().includes(text));
  if (!button) {
    throw new Error(`Menu button "${text}" not found`);
  }
  return button;
}

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    apiMock.login.mockResolvedValue({ accessToken: 'jwt-token', user: makeUser('manager') });
    apiMock.me.mockResolvedValue(makeUser('manager'));
    apiMock.users.mockResolvedValue([]);
    apiMock.user.mockResolvedValue(makeUser('manager'));
    apiMock.createUser.mockResolvedValue(makeUser('hr'));
    apiMock.updateUser.mockResolvedValue(makeUser('hr'));
    apiMock.employees.mockResolvedValue([makeEmployee()]);
    apiMock.employee.mockResolvedValue(makeEmployee());
    apiMock.createEmployee.mockResolvedValue(makeEmployee());
    apiMock.updateEmployee.mockResolvedValue(makeEmployee());
    apiMock.templates.mockResolvedValue([makeTemplate()]);
    apiMock.template.mockResolvedValue(makeTemplate());
    apiMock.createTemplate.mockResolvedValue(makeTemplate());
    apiMock.updateTemplate.mockResolvedValue(makeTemplate());
    apiMock.observations.mockResolvedValue([]);
    apiMock.observation.mockResolvedValue(makeObservation('signed'));
    apiMock.createObservation.mockResolvedValue(makeObservation('draft'));
    apiMock.signObservation.mockResolvedValue(makeObservation('signed'));
    apiMock.archiveObservation.mockResolvedValue(makeObservation('archived'));
    apiMock.bonusReport.mockResolvedValue({
      period: '2026-05',
      generatedAt: '2026-05-23T10:00:00.000Z',
      rule: 'Правило',
      rows: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the login screen by default and no application shell', () => {
    const wrapper = mount(App);

    expect(wrapper.find('.login-page').exists()).toBe(true);
    expect(wrapper.find('.app-shell').exists()).toBe(false);
  });

  it('logs in, loads data and hides the success toast after timeout', async () => {
    vi.useFakeTimers();
    const wrapper = mount(App);

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue(' 980200 ');
    await inputs[1].setValue('manager123');
    await wrapper.get('form').trigger('submit.prevent');
    await flushUi();

    expect(apiMock.login).toHaveBeenCalledWith('980200', 'manager123');
    expect(setAccessTokenMock).toHaveBeenCalledWith('jwt-token');
    expect(apiMock.employees).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Вход выполнен');

    await vi.advanceTimersByTimeAsync(2801);
    await flushUi();

    expect(wrapper.text()).not.toContain('Вход выполнен');
  });

  it('hides the templates section for HR users', async () => {
    localStorage.setItem('kln_token', 'stored-token');
    apiMock.me.mockResolvedValue(makeUser('hr'));

    const wrapper = mount(App);
    await flushUi();
    await wrapper.get('.menu-toggle').trigger('click');

    const menuText = wrapper.get('nav.sidebar-nav').text();
    expect(menuText).toContain('Премирование');
    expect(menuText).toContain('Персонал');
    expect(menuText).not.toContain('Шаблоны');
  });

  it('shows the employees-only personnel view for observers', async () => {
    localStorage.setItem('kln_token', 'stored-token');
    apiMock.me.mockResolvedValue(makeUser('observer'));

    const wrapper = mount(App);
    await flushUi();
    await wrapper.get('.menu-toggle').trigger('click');
    await getMenuButton(wrapper, 'Сотрудники').trigger('click');
    await flushUi();

    expect(wrapper.text()).toContain('Сотрудники');
    expect(wrapper.find('.section-tabs').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Учетные записи');
  });

  it('hides signature controls for already signed observations but keeps archive action', async () => {
    localStorage.setItem('kln_token', 'stored-token');
    apiMock.me.mockResolvedValue(makeUser('manager'));
    apiMock.observations.mockResolvedValue([makeObservation('signed')]);

    const wrapper = mount(App);
    await flushUi();
    await wrapper.get('.menu-toggle').trigger('click');
    await getMenuButton(wrapper, 'Журнал').trigger('click');
    await flushUi();
    await wrapper.get('.observation-card').trigger('click');
    await flushUi();

    expect(wrapper.findAll('.signature-step')).toHaveLength(0);
    const archiveButton = wrapper
      .findAll('button')
      .find((item) => item.text().includes('Перенести в архив'));

    expect(archiveButton?.exists()).toBe(true);
    expect(archiveButton?.attributes('disabled')).toBeUndefined();
  });
});
