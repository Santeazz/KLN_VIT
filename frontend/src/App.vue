<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  api,
  clearAccessToken,
  setAccessToken,
  type CreateObservationPayload,
  type EmployeePayload,
  type TemplatePayload,
  type UserPayload,
} from './api';
import {
  formatEmployeeChecklistLabel,
  formatObservationScore,
  formatObserverChecklistLabel,
  formatScoreValue,
  formatShortName,
} from './formatters';
import { createSignaturePayload } from './signature';
import type {
  BonusReport,
  ChecklistCriterion,
  ChecklistTemplate,
  Employee,
  Observation,
  SignatureRole,
  User,
} from './types';

type View =
  | 'dashboard'
  | 'new'
  | 'observations'
  | 'reports'
  | 'personnel'
  | 'templates';

type FormMode = 'create' | 'edit';
type PersonnelTab = 'users' | 'employees';

type TemplateCriterionForm = {
  sortOrder: number;
  title: string;
  description: string;
  maxScore: number;
};

const today = new Date().toISOString().slice(0, 10);
const month = new Date().toISOString().slice(0, 7);
const evaluatorRoles: User['role'][] = ['admin', 'manager', 'observer'];
const archiveRoles: User['role'][] = ['admin', 'manager', 'hr'];
const userManagerRoles: User['role'][] = ['admin', 'hr'];
const employeeManagerRoles: User['role'][] = ['admin', 'manager', 'hr'];
const templateManagerRoles: User['role'][] = ['admin', 'manager'];

const user = ref<User | null>(null);
const view = ref<View>('dashboard');
const loginForm = reactive({ tabNumber: '', password: '' });
const error = ref('');
const notice = ref('');
const loading = ref(false);
let noticeTimer: number | undefined;
const isMenuOpen = ref(false);

const users = ref<User[]>([]);
const employees = ref<Employee[]>([]);
const templates = ref<ChecklistTemplate[]>([]);
const observations = ref<Observation[]>([]);
const bonusReport = ref<BonusReport | null>(null);
const filterMonth = ref(month);
const reportMonth = ref(month);
const observationEmployeeFilter = ref('');
const observationStatusFilter = ref<Observation['status'] | ''>('');
const selectedObservation = ref<Observation | null>(null);
const activePersonnelTab = ref<PersonnelTab>('users');
const userSearchQuery = ref('');
const employeeSearchQuery = ref('');
const showTemplateForm = ref(false);

const selectedUserId = ref('');
const userFormMode = ref<FormMode>('create');
const userForm = reactive({
  employeeNumber: '',
  personnelNumber: '',
  lastName: '',
  firstName: '',
  middleName: '',
  role: 'observer' as User['role'],
  password: '',
  isActive: true,
});

const selectedEmployeeId = ref('');
const employeeFormMode = ref<FormMode>('create');
const employeeForm = reactive({
  employeeNumber: '',
  personnelNumber: '',
  lastName: '',
  firstName: '',
  middleName: '',
  position: '',
  hireDate: '',
  isActive: true,
});

const selectedTemplateId = ref('');
const templateFormMode = ref<FormMode>('create');
const templateForm = reactive({
  title: '',
  position: '',
  isActive: true,
  criteria: [] as TemplateCriterionForm[],
});

const employeeSignatureForm = reactive({
  tabNumber: '',
});

const observationForm = reactive({
  employeeId: '',
  templateId: '',
  observationDate: today,
  comment: '',
  results: {} as Record<string, { score: number; passed: boolean; comment: string }>,
});

const roleText: Record<User['role'], string> = {
  admin: 'Директор',
  manager: 'Менеджер',
  observer: 'Инструктор',
  hr: 'Отдел кадров',
};

const statusText: Record<Observation['status'], string> = {
  draft: 'Ожидает подписи',
  signed: 'Подписан',
  archived: 'Архив',
};

const journalFilterText = {
  employee: '\u0421\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a',
  allEmployees: '\u0412\u0441\u0435 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0438',
  status: '\u0421\u0442\u0430\u0442\u0443\u0441',
  allStatuses: '\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b',
} as const;

const activeTemplate = computed(() =>
  templates.value.find((template) => template.id === observationForm.templateId),
);
const activeEmployee = computed(() =>
  availableEmployees.value.find((employee) => employee.id === observationForm.employeeId),
);
const currentReviewerLabel = computed(() =>
  user.value ? formatObserverChecklistLabel(user.value) : '',
);
const canCreateObservations = computed(
  () => !!user.value && evaluatorRoles.includes(user.value.role),
);
const canSeeTemplates = computed(() => canCreateObservations.value);
const canSeeReports = computed(
  () => !!user.value && ['admin', 'manager', 'hr'].includes(user.value.role),
);
const canSeeCatalogs = computed(() => !!user.value);
const canSeePersonnel = computed(() => !!user.value && (canManageUsers.value || canSeeCatalogs.value));
const canManageObservationSignatures = computed(
  () => !!user.value && evaluatorRoles.includes(user.value.role),
);
const canArchiveObservations = computed(
  () => !!user.value && archiveRoles.includes(user.value.role),
);
const canManageUsers = computed(
  () => !!user.value && userManagerRoles.includes(user.value.role),
);
const canManageEmployees = computed(
  () => !!user.value && employeeManagerRoles.includes(user.value.role),
);
const canManageTemplates = computed(
  () => !!user.value && templateManagerRoles.includes(user.value.role),
);
const isObserverEmployeeDirectoryView = computed(
  () => user.value?.role === 'observer' && activePersonnelTab.value === 'employees',
);
const personnelMenuLabel = computed(() =>
  user.value?.role === 'observer' ? 'Сотрудники' : 'Персонал',
);
const personnelSectionEyebrow = computed(() =>
  isObserverEmployeeDirectoryView.value ? 'Сотрудники' : 'Справочники',
);
const personnelSectionTitle = computed(() =>
  isObserverEmployeeDirectoryView.value ? 'Сотрудники' : 'Персонал',
);
const personnelSectionLead = computed(() =>
  isObserverEmployeeDirectoryView.value
    ? 'Просматривайте актуальный список сотрудников предприятия, по которым оформляются контрольные листы наблюдения.'
    : 'Управляйте учетными записями и кадровыми карточками в одном разделе с учетом ролевых ограничений.',
);
const selectedUserIsSelf = computed(
  () => !!user.value && selectedUserId.value === user.value.id,
);
const recentObservations = computed(() => observations.value.slice(0, 5));
const selectedObservationComment = computed(
  () => selectedObservation.value?.comment?.trim() ?? '',
);
const filteredUsers = computed(() => {
  const query = userSearchQuery.value.trim().toLowerCase();
  if (!query) return users.value;

  return users.value.filter((account) =>
    [
      account.fullName,
      account.employeeNumber,
      account.personnelNumber ?? '',
      roleText[account.role],
    ]
      .join(' ')
      .toLowerCase()
      .includes(query),
  );
});
const filteredEmployees = computed(() => {
  const query = employeeSearchQuery.value.trim().toLowerCase();
  if (!query) return employees.value;

  return employees.value.filter((employee) =>
    [
      employee.fullName,
      employee.employeeNumber,
      employee.personnelNumber ?? '',
      employee.position,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query),
  );
});
const visibleObservations = computed(() =>
  observations.value.filter((observation) => {
    if (
      observationEmployeeFilter.value &&
      observation.employee.id !== observationEmployeeFilter.value
    ) {
      return false;
    }

    if (observationStatusFilter.value && observation.status !== observationStatusFilter.value) {
      return false;
    }

    return true;
  }),
);
const availablePersonnelTabs = computed(() => {
  const tabs: PersonnelTab[] = [];
  if (canManageUsers.value) {
    tabs.push('users');
  }
  if (canSeeCatalogs.value) {
    tabs.push('employees');
  }
  return tabs;
});
const stats = computed(() => ({
  employees: employees.value.length,
  observations: observations.value.length,
  signed: observations.value.filter((item) => item.status === 'signed').length,
  violations: observations.value.reduce((sum, item) => sum + Number(item.violationsCount), 0),
}));
const reportStats = computed(() => {
  const rows = bonusReport.value?.rows ?? [];
  const approved = rows.filter((row) => row.bonusAllowed).length;
  const rejected = rows.filter((row) => !row.bonusAllowed).length;
  const averagePercentageValues = rows
    .map((row) => row.averagePercentage)
    .filter((value): value is number => value !== null);

  return {
    employees: rows.length,
    approved,
    rejected,
    observations: rows.reduce((sum, row) => sum + row.observationsCount, 0),
    averagePercentage: averagePercentageValues.length
      ? Math.round(
          averagePercentageValues.reduce((sum, value) => sum + value, 0) /
            averagePercentageValues.length,
        )
      : null,
  };
});

const availableEmployees = computed(() => {
  const normalizedEmployees = employees.value.filter((employee) => {
    const position = employee.position.trim().toLowerCase();
    return position === 'работник пбо' || position === 'инструктор';
  });

  if (user.value?.role === 'observer') {
    return normalizedEmployees.filter(
      (employee) => employee.position.trim().toLowerCase() === 'работник пбо',
    );
  }

  return normalizedEmployees;
});

watch(
  availableEmployees,
  (items) => {
    if (!items.length) {
      observationForm.employeeId = '';
      return;
    }

    if (!items.some((employee) => employee.id === observationForm.employeeId)) {
      observationForm.employeeId = items[0].id;
    }
  },
  { immediate: true },
);

watch([observationEmployeeFilter, observationStatusFilter], () => {
  if (
    selectedObservation.value &&
    !visibleObservations.value.some((item) => item.id === selectedObservation.value?.id)
  ) {
    selectObservation(null);
  }
});

function createEmptyCriterion(sortOrder = templateForm.criteria.length + 1): TemplateCriterionForm {
  return {
    sortOrder,
    title: '',
    description: '',
    maxScore: 1,
  };
}

function setDefaultView() {
  if (!user.value) {
    view.value = 'dashboard';
    return;
  }

  if (user.value.role === 'hr') {
    view.value = 'reports';
    return;
  }

  view.value = 'dashboard';
}

function setMessage(message: string) {
  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
  }
  notice.value = message;
  error.value = '';
  noticeTimer = window.setTimeout(() => {
    notice.value = '';
    noticeTimer = undefined;
  }, 2800);
}

function setError(message: string) {
  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = undefined;
  }
  error.value = message;
  notice.value = '';
}

function resetEmployeeSignature() {
  employeeSignatureForm.tabNumber = '';
}

function clearObservationForm() {
  observationForm.comment = '';
  observationForm.observationDate = today;
}

function selectObservation(observation: Observation | null) {
  selectedObservation.value = observation;
  resetEmployeeSignature();
}

function mergeObservation(updated: Observation) {
  const exists = observations.value.some((item) => item.id === updated.id);
  observations.value = exists
    ? observations.value.map((item) => (item.id === updated.id ? updated : item))
    : [updated, ...observations.value];
}

function resetUserForm() {
  selectedUserId.value = '';
  userFormMode.value = 'create';
  userForm.employeeNumber = '';
  userForm.personnelNumber = '';
  userForm.lastName = '';
  userForm.firstName = '';
  userForm.middleName = '';
  userForm.role = 'observer';
  userForm.password = '';
  userForm.isActive = true;
}

function fillUserForm(account: User) {
  userForm.employeeNumber = account.employeeNumber;
  userForm.personnelNumber = account.personnelNumber ?? '';
  userForm.lastName = account.lastName;
  userForm.firstName = account.firstName;
  userForm.middleName = account.middleName ?? '';
  userForm.role = account.role;
  userForm.password = '';
  userForm.isActive = account.isActive;
}

async function loadUserDetail(id: string) {
  const account = await api.user(id);
  selectedUserId.value = id;
  userFormMode.value = 'edit';
  fillUserForm(account);
}

function startCreatingUser() {
  resetUserForm();
}

async function editUser(id: string) {
  await withLoading(async () => {
    if (user.value && id === user.value.id) {
      throw new Error('Собственную учетную запись редактировать нельзя');
    }

    await loadUserDetail(id);
  });
}

function resetEmployeeForm() {
  selectedEmployeeId.value = '';
  employeeFormMode.value = 'create';
  employeeForm.employeeNumber = '';
  employeeForm.personnelNumber = '';
  employeeForm.lastName = '';
  employeeForm.firstName = '';
  employeeForm.middleName = '';
  employeeForm.position = '';
  employeeForm.hireDate = '';
  employeeForm.isActive = true;
}

function fillEmployeeForm(employee: Employee) {
  employeeForm.employeeNumber = employee.employeeNumber;
  employeeForm.personnelNumber = employee.personnelNumber ?? '';
  employeeForm.lastName = employee.lastName;
  employeeForm.firstName = employee.firstName;
  employeeForm.middleName = employee.middleName ?? '';
  employeeForm.position = employee.position;
  employeeForm.hireDate = employee.hireDate ?? '';
  employeeForm.isActive = employee.isActive;
}

async function loadEmployeeDetail(id: string) {
  const employee = await api.employee(id);
  selectedEmployeeId.value = id;
  employeeFormMode.value = 'edit';
  fillEmployeeForm(employee);
}

function startCreatingEmployee() {
  resetEmployeeForm();
}

async function editEmployee(id: string) {
  await withLoading(async () => {
    await loadEmployeeDetail(id);
  });
}

function resetTemplateForm() {
  selectedTemplateId.value = '';
  templateFormMode.value = 'create';
  templateForm.title = '';
  templateForm.position = '';
  templateForm.isActive = true;
  templateForm.criteria = [createEmptyCriterion(1)];
}

function fillTemplateForm(template: ChecklistTemplate) {
  templateForm.title = template.title;
  templateForm.position = template.position;
  templateForm.isActive = template.isActive;
  templateForm.criteria = [...template.criteria]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((criterion) => ({
      sortOrder: criterion.sortOrder,
      title: criterion.title,
      description: criterion.description,
      maxScore: Number(criterion.maxScore),
    }));
}

async function loadTemplateDetail(id: string) {
  const template = await api.template(id);
  selectedTemplateId.value = id;
  templateFormMode.value = 'edit';
  fillTemplateForm(template);
}

function startCreatingTemplate() {
  resetTemplateForm();
  showTemplateForm.value = true;
}

async function editTemplate(id: string) {
  await withLoading(async () => {
    await loadTemplateDetail(id);
    showTemplateForm.value = true;
  });
}

function closeTemplateForm() {
  showTemplateForm.value = false;
  resetTemplateForm();
}

function addTemplateCriterion() {
  const lastSortOrder =
    templateForm.criteria.length > 0
      ? Math.max(...templateForm.criteria.map((criterion) => criterion.sortOrder))
      : 0;
  templateForm.criteria.push(createEmptyCriterion(lastSortOrder + 1));
}

function removeTemplateCriterion(index: number) {
  if (templateForm.criteria.length === 1) {
    templateForm.criteria[0] = createEmptyCriterion(1);
    return;
  }

  templateForm.criteria.splice(index, 1);
}

function openView(nextView: View) {
  isMenuOpen.value = false;
  view.value = nextView;
  if (nextView === 'reports') {
    void loadReport();
  }
}

function openPersonnelView(preferredTab?: PersonnelTab) {
  if (!availablePersonnelTabs.value.length) return;
  isMenuOpen.value = false;
  const currentTab = availablePersonnelTabs.value.includes(activePersonnelTab.value)
    ? activePersonnelTab.value
    : undefined;
  activePersonnelTab.value =
    preferredTab && availablePersonnelTabs.value.includes(preferredTab)
      ? preferredTab
      : currentTab ?? availablePersonnelTabs.value[0];
  view.value = 'personnel';
}

async function withLoading(action: () => Promise<void>) {
  loading.value = true;
  try {
    await action();
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : 'Не удалось выполнить действие');
  } finally {
    loading.value = false;
  }
}

async function login() {
  await withLoading(async () => {
    const response = await api.login(loginForm.tabNumber.trim(), loginForm.password);
    setAccessToken(response.accessToken);
    user.value = response.user;
    setDefaultView();
    await loadData();
    setMessage('Вход выполнен');
  });
}

function logout() {
  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = undefined;
  }
  clearAccessToken();
  user.value = null;
  users.value = [];
  employees.value = [];
  observations.value = [];
  templates.value = [];
  observationEmployeeFilter.value = '';
  observationStatusFilter.value = '';
  userSearchQuery.value = '';
  employeeSearchQuery.value = '';
  selectObservation(null);
  resetUserForm();
  resetEmployeeForm();
  resetTemplateForm();
  loginForm.tabNumber = '';
  loginForm.password = '';
  isMenuOpen.value = false;
}

async function restoreSession() {
  await withLoading(async () => {
    user.value = await api.me();
    setDefaultView();
    await loadData();
  });
}

async function loadData() {
  const selectedObservationId = selectedObservation.value?.id;
  const currentUserFormMode = userFormMode.value;
  const currentUserId = selectedUserId.value;
  const currentEmployeeFormMode = employeeFormMode.value;
  const currentEmployeeId = selectedEmployeeId.value;
  const currentTemplateFormMode = templateFormMode.value;
  const currentTemplateId = selectedTemplateId.value;

  const [employeeList, templateList, observationList, userList] = await Promise.all([
    api.employees(),
    api.templates(),
    api.observations({
      month: filterMonth.value,
    }),
    canManageUsers.value ? api.users() : Promise.resolve([] as User[]),
  ]);

  employees.value = employeeList;
  users.value = userList;
  templates.value = templateList.map((template) => ({
    ...template,
    criteria: [...template.criteria].sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  observations.value = observationList;

  if (templates.value.length) {
    const currentTemplateExists = templates.value.some(
      (template) => template.id === observationForm.templateId,
    );
    if (!currentTemplateExists) {
      selectTemplate(templates.value[0].id);
    }
  } else {
    observationForm.templateId = '';
    observationForm.results = {};
  }

  if (selectedObservationId) {
    selectedObservation.value =
      observationList.find((observation) => observation.id === selectedObservationId) ?? null;
  }

  if (currentUserFormMode === 'edit' && currentUserId && canManageUsers.value) {
    await loadUserDetail(currentUserId);
  } else if (!canManageUsers.value) {
    resetUserForm();
  }

  if (currentEmployeeFormMode === 'edit' && currentEmployeeId && canManageEmployees.value) {
    await loadEmployeeDetail(currentEmployeeId);
  }

  if (currentTemplateFormMode === 'edit' && currentTemplateId && canManageTemplates.value) {
    await loadTemplateDetail(currentTemplateId);
  } else if (!currentTemplateId) {
    resetTemplateForm();
  }
}

function selectTemplate(templateId: string) {
  observationForm.templateId = templateId;
  const template = templates.value.find((item) => item.id === templateId);
  observationForm.results = {};

  template?.criteria.forEach((criterion) => {
    observationForm.results[criterion.id] = {
      score: Number(criterion.maxScore),
      passed: true,
      comment: '',
    };
  });
}

function onTemplateChange(event: Event) {
  selectTemplate((event.target as HTMLSelectElement).value);
}

function formatMonthLabel(value: string) {
  if (!value) return '';
  const date = new Date(`${value}-01T00:00:00`);
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function setCriterionResult(criterion: ChecklistCriterion, passed: boolean) {
  observationForm.results[criterion.id].passed = passed;
  observationForm.results[criterion.id].score = passed ? Number(criterion.maxScore) : 0;
}

function buildUserPayload(): UserPayload {
  return {
    employeeNumber: userForm.employeeNumber.trim(),
    personnelNumber: userForm.personnelNumber.trim(),
    lastName: userForm.lastName.trim(),
    firstName: userForm.firstName.trim(),
    middleName: userForm.middleName.trim() || undefined,
    role: userForm.role,
    password: userForm.password.trim() || undefined,
    isActive: userForm.isActive,
  };
}

function buildEmployeePayload(): EmployeePayload {
  return {
    employeeNumber: employeeForm.employeeNumber.trim(),
    personnelNumber: employeeForm.personnelNumber.trim(),
    lastName: employeeForm.lastName.trim(),
    firstName: employeeForm.firstName.trim(),
    middleName: employeeForm.middleName.trim() || undefined,
    position: employeeForm.position.trim(),
    hireDate: employeeForm.hireDate || undefined,
    isActive: employeeForm.isActive,
  };
}

function buildTemplatePayload(): TemplatePayload {
  return {
    title: templateForm.title.trim(),
    position: templateForm.position.trim(),
    isActive: templateForm.isActive,
    criteria: templateForm.criteria.map((criterion) => ({
      sortOrder: Number(criterion.sortOrder),
      title: criterion.title.trim(),
      description: criterion.description.trim(),
      maxScore: Number(criterion.maxScore),
    })),
  };
}

async function saveUser() {
  await withLoading(async () => {
    if (!canManageUsers.value) {
      throw new Error('У текущего пользователя нет прав на управление учетными записями');
    }

    if (userFormMode.value === 'edit' && selectedUserIsSelf.value) {
      throw new Error('Собственную учетную запись редактировать нельзя');
    }

    const payload = buildUserPayload();
    if (userFormMode.value === 'create' && !payload.password) {
      throw new Error('Укажите пароль для новой учетной записи');
    }

    if (userFormMode.value === 'create') {
      await api.createUser(payload);
      resetUserForm();
      setMessage('Учетная запись создана');
    } else {
      await api.updateUser(selectedUserId.value, payload);
      setMessage('Учетная запись обновлена');
    }

    await loadData();
  });
}

async function saveEmployee() {
  await withLoading(async () => {
    if (!canManageEmployees.value) {
      throw new Error('Актуализация сотрудников доступна только директору, менеджеру и отделу кадров');
    }

    const payload = buildEmployeePayload();

    if (employeeFormMode.value === 'create') {
      await api.createEmployee(payload);
      resetEmployeeForm();
      setMessage('Карточка сотрудника создана');
    } else {
      await api.updateEmployee(selectedEmployeeId.value, payload);
      setMessage('Карточка сотрудника обновлена');
    }

    await loadData();
  });
}

async function saveTemplate() {
  await withLoading(async () => {
    if (!canManageTemplates.value) {
      throw new Error('Управление шаблонами доступно только директору и менеджеру');
    }

    const payload = buildTemplatePayload();

    if (!payload.criteria.length) {
      throw new Error('Шаблон должен содержать хотя бы один критерий');
    }

    if (payload.criteria.some((criterion) => !criterion.title || !criterion.description)) {
      throw new Error('Заполните название и описание каждого критерия');
    }

    if (templateFormMode.value === 'create') {
      await api.createTemplate(payload);
      setMessage('Шаблон создан');
    } else {
      await api.updateTemplate(selectedTemplateId.value, payload);
      setMessage('Шаблон обновлен');
    }

    closeTemplateForm();
    await loadData();
  });
}

async function createObservation() {
  await withLoading(async () => {
    if (!canCreateObservations.value) {
      throw new Error('У текущего пользователя нет прав на оформление КЛН');
    }

    if (!activeTemplate.value || !activeEmployee.value) {
      throw new Error('Выберите сотрудника и шаблон контрольного листа');
    }

    const payload: CreateObservationPayload = {
      employeeId: observationForm.employeeId,
      templateId: observationForm.templateId,
      observationDate: observationForm.observationDate,
      comment: observationForm.comment.trim() || undefined,
      results: activeTemplate.value.criteria.map((criterion) => ({
        criterionId: criterion.id,
        score: Number(observationForm.results[criterion.id].score),
        passed: observationForm.results[criterion.id].passed,
        comment: observationForm.results[criterion.id].comment.trim() || undefined,
      })),
    };

    const created = await api.createObservation(payload);
    clearObservationForm();
    await loadData();
    openView('observations');
    selectObservation(
      observations.value.find((observation) => observation.id === created.id) ?? created,
    );
    setMessage('КЛН сохранен');
  });
}

async function refreshObservations() {
  await withLoading(async () => {
    observations.value = await api.observations({
      month: filterMonth.value,
    });
    selectObservation(null);
  });
}

async function signObservation(role: SignatureRole) {
  const observation = selectedObservation.value;
  if (!observation) return;

  await withLoading(async () => {
    if (isSignatureCompleted(observation, role)) {
      throw new Error(
        role === 'observer'
          ? 'Подпись проверяющего уже сохранена'
          : 'Подпись сотрудника уже сохранена',
      );
    }

    const employeeTabNumber =
      role === 'employee' ? employeeSignatureForm.tabNumber.trim() : undefined;

    if (role === 'employee' && !employeeTabNumber) {
      throw new Error('Для подписи сотрудник должен ввести свой табельный номер');
    }

    const payload = createSignaturePayload(role, employeeTabNumber);
    await api.signObservation(observation.id, payload);
    const [freshObservation, observationList] = await Promise.all([
      api.observation(observation.id),
      api.observations({
        month: filterMonth.value,
      }),
    ]);
    observations.value = observationList.map((item) =>
      item.id === freshObservation.id ? freshObservation : item,
    );
    selectObservation(freshObservation);
    if (role === 'employee') {
      resetEmployeeSignature();
    }
    setMessage(
      role === 'observer'
        ? 'Подпись проверяющего сохранена'
        : 'Подпись сотрудника сохранена',
    );
  });
}

async function archiveObservation() {
  const observation = selectedObservation.value;
  if (!observation) return;

  await withLoading(async () => {
    if (!canArchiveObservations.value) {
      throw new Error('Архивирование доступно только директору, менеджеру и отделу кадров');
    }

    await api.archiveObservation(observation.id);
    const [freshObservation, observationList] = await Promise.all([
      api.observation(observation.id),
      api.observations({
        month: filterMonth.value,
      }),
    ]);
    observations.value = observationList.map((item) =>
      item.id === freshObservation.id ? freshObservation : item,
    );
    selectObservation(freshObservation);
    setMessage('КЛН перенесен в архив');
  });
}

async function loadReport() {
  if (!canSeeReports.value) return;

  await withLoading(async () => {
    bonusReport.value = await api.bonusReport(reportMonth.value);
  });
}

function hasSignature(observation: Observation, role: SignatureRole) {
  return observation.signatures?.some((item) => item.signerRole === role) ?? false;
}

function isSignatureCompleted(observation: Observation, role: SignatureRole) {
  if (observation.status === 'signed' || observation.status === 'archived') {
    return true;
  }

  return hasSignature(observation, role);
}

function signatureLabel(observation: Observation, role: SignatureRole) {
  const signature = observation.signatures?.find((item) => item.signerRole === role);
  if (!signature) return 'Не подписано';
  return `${signature.signedByName}, ПЭП`;
}

function signatureStatusText(observation: Observation, role: SignatureRole) {
  return hasSignature(observation, role) ? 'Подписано' : 'Ожидает';
}

function employeeOptionLabel(employee: Employee) {
  return `${employee.employeeNumber} · ${formatShortName(employee.fullName)} · ${employee.position}`;
}

function observationRowEmployeeLabel(observation: Observation) {
  return `${observation.employee.employeeNumber} · ${formatShortName(observation.employee.fullName)}`;
}

function resolvedSignatureLabel(observation: Observation, role: SignatureRole) {
  const signature = observation.signatures?.find((item) => item.signerRole === role);
  if (signature) {
    return `${signature.signedByName}, \u041F\u042D\u041F`;
  }

  if (isSignatureCompleted(observation, role)) {
    return role === 'observer'
      ? `${formatObserverChecklistLabel(observation.observer)}, \u041F\u042D\u041F`
      : `${formatEmployeeChecklistLabel(observation.employee)}, \u041F\u042D\u041F`;
  }

  return '\u041D\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043E';
}

function resolvedSignatureStatusText(observation: Observation, role: SignatureRole) {
  return isSignatureCompleted(observation, role)
    ? '\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043E'
    : '\u041E\u0436\u0438\u0434\u0430\u0435\u0442';
}

function signatureBadgeClass(observation: Observation, role: SignatureRole) {
  return isSignatureCompleted(observation, role) ? 'badge-ok' : 'badge-muted';
}

function canSignObservation(observation: Observation, role: SignatureRole) {
  if (loading.value || observation.status !== 'draft') {
    return false;
  }

  if (role === 'observer') {
    return !isSignatureCompleted(observation, role);
  }

  return (
    isSignatureCompleted(observation, 'observer') &&
    !isSignatureCompleted(observation, role)
  );
}

function employeeSignatureInputDisabled(observation: Observation) {
  return !canSignObservation(observation, 'employee');
}

function employeeSignaturePlaceholder(observation: Observation) {
  if (observation.status === 'archived') {
    return '\u0410\u0440\u0445\u0438\u0432\u043D\u044B\u0439 \u041A\u041B\u041D \u0437\u0430\u043A\u0440\u044B\u0442 \u0434\u043B\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u0438';
  }

  if (isSignatureCompleted(observation, 'employee')) {
    return '\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0430 \u0443\u0436\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430';
  }

  if (!isSignatureCompleted(observation, 'observer')) {
    return '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u043F\u0438\u0448\u0438\u0442\u0435 \u041A\u041B\u041D \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0449\u0438\u043C';
  }

  return '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0430\u0431\u0435\u043B\u044C\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440';
}

function signatureButtonClass(observation: Observation, role: SignatureRole) {
  return {
    'signature-button--done': isSignatureCompleted(observation, role),
  };
}

function observationResultText(result: Observation['results'][number]) {
  return result.comment?.trim() || result.criterionDescription;
}

onMounted(async () => {
  resetTemplateForm();
  if (localStorage.getItem('kln_token')) {
    await restoreSession();
  }
});
</script>

<template>
  <div v-if="!user" class="login-page">
    <section class="login-panel">
      <div class="brand-panel">
        <div class="brand-lockup">
          <img src="/vkusno-logo.svg" alt="Логотип Вкусно — и точка" class="brand-logo" />
          <div class="brand-copy">
            <p class="brand-mark">Вкусно — и точка</p>
            <span class="brand-caption">Рабочий кабинет</span>
          </div>
        </div>

        <form class="login-form" @submit.prevent="login">
          <div class="login-form__title">
            <span>Авторизация</span>
            <h1>Вход в систему</h1>
          </div>
          <label>
            Табельный номер
            <input v-model="loginForm.tabNumber" autocomplete="username" />
          </label>
          <label>
            Пароль
            <input v-model="loginForm.password" type="password" autocomplete="current-password" />
          </label>
          <button :disabled="loading">Войти</button>
          <p v-if="error" class="message error">{{ error }}</p>
        </form>
      </div>

      <div class="login-visual">
        <div class="login-visual-copy">
          <h2>
            Контрольные листы наблюдения
            <span>в фирменном рабочем кабинете</span>
          </h2>
        </div>
        <img
          src="/inspection-floor.svg"
          alt="Смена предприятия общественного питания"
          class="login-image"
        />
      </div>
    </section>
  </div>

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="sidebar-heading">
          <button
            class="menu-toggle"
            :class="{ open: isMenuOpen }"
            type="button"
            :aria-expanded="isMenuOpen"
            :aria-label="isMenuOpen ? 'Закрыть меню навигации' : 'Открыть меню навигации'"
            @click="isMenuOpen = !isMenuOpen"
          >
            <span></span>
            <span></span>
          </button>

          <div class="brand-lockup app-brand">
            <img src="/vkusno-logo.svg" alt="Логотип Вкусно — и точка" class="brand-logo" />
            <div class="brand-copy">
              <p class="sidebar-mark">Вкусно — и точка</p>
            </div>
          </div>
        </div>

        <div class="user-chip">
          <strong>{{ user.fullName }}</strong>
          <p class="sidebar-role">{{ roleText[user.role] }} · № {{ user.employeeNumber }}</p>
        </div>

        <button class="secondary logout-button" @click="logout">Выйти</button>
      </div>

      <nav v-if="isMenuOpen" class="sidebar-nav sidebar-nav--drawer">
        <button :class="{ active: view === 'dashboard' }" @click="openView('dashboard')">
          Сводка
        </button>
        <button
          v-if="canCreateObservations"
          :class="{ active: view === 'new' }"
          @click="openView('new')"
        >
          Новый КЛН
        </button>
        <button :class="{ active: view === 'observations' }" @click="openView('observations')">
          Журнал КЛН
        </button>
        <button
          v-if="canSeeReports"
          :class="{ active: view === 'reports' }"
          @click="openView('reports')"
        >
          Премирование
        </button>
        <button
          v-if="canSeePersonnel"
          :class="{ active: view === 'personnel' }"
          @click="openPersonnelView()"
        >
          {{ personnelMenuLabel }}
        </button>
        <button
          v-if="canSeeTemplates"
          :class="{ active: view === 'templates' }"
          @click="openView('templates')"
        >
          Шаблоны
        </button>
      </nav>
    </aside>

    <main class="main-content">
      <div v-if="view === 'dashboard' || view === 'observations'" class="topline">
        <label class="period-filter">
          Период
          <input v-model="filterMonth" type="month" @change="refreshObservations" />
        </label>
        <button class="secondary" :disabled="loading" @click="loadData">Обновить</button>
      </div>

      <p v-if="error" class="message error">{{ error }}</p>

      <section v-if="view === 'dashboard'" class="content-section">
        <div class="dashboard-hero">
          <div class="dashboard-hero__copy">
            <span class="hero-kicker">Рабочий кабинет КЛН</span>
            <h1>Контроль качества смены</h1>
            <p>
              Создавайте контрольные листы по шаблонам, подписывайте их с сотрудником
              и быстро переходите к журналу наблюдений и отчетности за выбранный период.
            </p>

            <div class="hero-actions">
              <button v-if="canCreateObservations" @click="openView('new')">Создать КЛН</button>
              <button class="secondary" @click="openView('observations')">Открыть журнал</button>
              <button v-if="canSeeReports" class="secondary" @click="openView('reports')">
                Премирование
              </button>
            </div>
          </div>

          <div class="dashboard-hero__side">
            <article>
              <span>Период</span>
              <strong>{{ filterMonth }}</strong>
              <small>Текущий рабочий срез для сводки и журнала наблюдений</small>
            </article>
            <article>
              <span>Подписанные КЛН</span>
              <strong>{{ stats.signed }}</strong>
              <small>Готовы к архиву и участвуют в отчетности</small>
            </article>
          </div>
        </div>

        <div class="stats-grid">
          <article>
            <span>{{ stats.employees }}</span>
            <p>Сотрудников</p>
          </article>
          <article>
            <span>{{ stats.observations }}</span>
            <p>КЛН за период</p>
          </article>
          <article>
            <span>{{ stats.signed }}</span>
            <p>Подписано</p>
          </article>
          <article>
            <span>{{ stats.violations }}</span>
            <p>Нарушений</p>
          </article>
        </div>

        <div class="dashboard-grid">
          <article class="surface-card">
            <h3>Последние КЛН</h3>
            <ul v-if="recentObservations.length" class="mini-list">
              <li v-for="item in recentObservations" :key="item.id">
                <div>
                  <strong>{{ observationRowEmployeeLabel(item) }}</strong>
                  <span>{{ item.template.title }}</span>
                </div>
                <span>{{ formatObservationScore(item) }}</span>
              </li>
            </ul>
            <p v-else class="empty-copy">За выбранный период КЛН пока нет.</p>
          </article>
        </div>
      </section>

      <section v-if="view === 'new'" class="content-section">
        <div class="page-header page-header--rich">
          <div class="section-intro compact">
            <p class="section-eyebrow">Оформление КЛН</p>
            <h1>Новый контрольный лист</h1>
            <p class="section-lead">
              Выберите сотрудника, шаблон и зафиксируйте результаты наблюдения в едином цифровом формате.
            </p>
          </div>
        </div>

        <form class="surface-card observation-form observation-form--sheet" @submit.prevent="createObservation">
          <div class="form-grid">
            <label>
              Сотрудник
              <select v-model="observationForm.employeeId">
                <option v-for="employee in availableEmployees" :key="employee.id" :value="employee.id">
                  {{ employeeOptionLabel(employee) }}
                </option>
              </select>
            </label>

            <label>
              Шаблон
              <select :value="observationForm.templateId" @change="onTemplateChange">
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ template.title }}
                </option>
              </select>
            </label>

            <label>
              Дата наблюдения
              <input v-model="observationForm.observationDate" type="date" />
            </label>
          </div>

          <div v-if="activeTemplate && activeEmployee" class="sheet-summary">
            <article>
              <span>Сотрудник</span>
              <strong>{{ formatEmployeeChecklistLabel(activeEmployee) }}</strong>
            </article>
            <article>
              <span>Проверяющий</span>
              <strong>{{ currentReviewerLabel }}</strong>
            </article>
            <article>
              <span>Рабочая зона</span>
              <strong>{{ activeTemplate.position }}</strong>
            </article>
            <article>
              <span>Критериев</span>
              <strong>{{ activeTemplate.criteria.length }}</strong>
            </article>
          </div>

          <div v-if="!availableEmployees.length" class="surface-card empty-state">
            Нет сотрудников, доступных для оформления КЛН.
          </div>

          <div v-if="activeTemplate" class="criteria-list">
            <article
              v-for="criterion in activeTemplate.criteria"
              :key="criterion.id"
              class="criterion-row"
            >
              <div class="criterion-copy">
                <div class="criterion-heading">
                  <h3>{{ criterion.sortOrder }}. {{ criterion.title }}</h3>
                </div>
                <p>{{ criterion.description }}</p>
              </div>

              <div class="criterion-controls">
                <button
                  type="button"
                  :class="{ active: observationForm.results[criterion.id]?.passed }"
                  @click="setCriterionResult(criterion, true)"
                >
                  Выполнен
                </button>
                <button
                  type="button"
                  :class="{ danger: !observationForm.results[criterion.id]?.passed }"
                  @click="setCriterionResult(criterion, false)"
                >
                  Не выполнен
                </button>
                <input
                  v-model="observationForm.results[criterion.id].comment"
                  placeholder="Комментарий"
                />
              </div>
            </article>
          </div>

          <label>
            Комментарий по наблюдению
            <textarea v-model="observationForm.comment" rows="3"></textarea>
          </label>

          <div class="page-actions">
            <button :disabled="loading || !activeTemplate || !activeEmployee">Сохранить КЛН</button>
          </div>
        </form>
      </section>

      <section v-if="view === 'observations'" class="content-section split-layout">
        <div class="surface-card records-panel">
          <div class="panel-header panel-header--stacked">
            <div class="section-intro compact">
              <p class="section-eyebrow">Журнал наблюдений</p>
              <h1>Контрольные листы</h1>
              <p class="section-lead">
                Открывайте оформленные КЛН, проверяйте подписи и переводите подписанные документы в архив.
              </p>
            </div>
            <div class="records-panel__filters">
              <label class="compact-filter">
                {{ journalFilterText.employee }}
              <select v-model="observationEmployeeFilter">
                  <option value="">{{ journalFilterText.allEmployees }}</option>
                <option v-for="employee in employees" :key="employee.id" :value="employee.id">
                  {{ employeeOptionLabel(employee) }}
                </option>
              </select>
              </label>
              <label class="compact-filter">
                {{ journalFilterText.status }}
                <select v-model="observationStatusFilter">
                  <option value="">{{ journalFilterText.allStatuses }}</option>
                  <option value="draft">{{ statusText.draft }}</option>
                  <option value="signed">{{ statusText.signed }}</option>
                  <option value="archived">{{ statusText.archived }}</option>
                </select>
              </label>
            </div>
          </div>

          <div v-if="visibleObservations.length" class="observation-list">
            <article
              v-for="item in visibleObservations"
              :key="item.id"
              class="observation-card"
              :class="{ selected: selectedObservation?.id === item.id }"
              @click="selectObservation(item)"
            >
              <div class="observation-card__top">
                <div>
                  <p class="observation-card__date">{{ item.observationDate }}</p>
                  <h3>{{ observationRowEmployeeLabel(item) }}</h3>
                </div>
                <span :class="['status-badge', `status-badge--${item.status}`]">
                  {{ statusText[item.status] }}
                </span>
              </div>

              <div class="observation-card__meta">
                <span class="person-pill">{{ item.template.title }}</span>
                <span class="person-pill person-pill-muted">{{ item.position }}</span>
                <span class="score-pill">{{ formatObservationScore(item) }}</span>
              </div>

              <div class="observation-card__footer">
                <span>{{ formatObserverChecklistLabel(item.observer) }}</span>
                <span>Нарушений: {{ item.violationsCount }}</span>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            За выбранный период контрольные листы пока не оформлены.
          </div>
        </div>

        <aside v-if="selectedObservation" class="details-panel">
          <div class="kln-sheet">
            <div class="kln-sheet__header">
              <div>
                <p class="kln-sheet__template">{{ selectedObservation.template.title }}</p>
                <h2>Контрольный лист наблюдения</h2>
              </div>
              <span :class="['status-badge', `status-badge--${selectedObservation.status}`]">
                {{ statusText[selectedObservation.status] }}
              </span>
            </div>

            <div class="kln-meta-grid">
              <article>
                <span>Сотрудник</span>
                <strong>{{ formatEmployeeChecklistLabel(selectedObservation.employee) }}</strong>
              </article>
              <article>
                <span>Проверяющий</span>
                <strong>{{ formatObserverChecklistLabel(selectedObservation.observer) }}</strong>
              </article>
              <article>
                <span>Дата</span>
                <strong>{{ selectedObservation.observationDate }}</strong>
              </article>
              <article>
                <span>Рабочая зона</span>
                <strong>{{ selectedObservation.position }}</strong>
              </article>
            </div>

            <div class="score-line">
              <div>
                <span class="score-caption">Набранные баллы</span>
                <strong>{{ formatObservationScore(selectedObservation) }}</strong>
              </div>
              <div class="score-side">
                <span>{{ selectedObservation.percentage }}%</span>
                <small>Нарушений: {{ selectedObservation.violationsCount }}</small>
              </div>
            </div>

            <div v-if="selectedObservationComment" class="sheet-note">
              <span>Комментарий</span>
              <p>{{ selectedObservationComment }}</p>
            </div>

            <ul class="result-list">
              <li v-for="result in selectedObservation.results" :key="result.id">
                <span :class="result.passed ? 'ok-dot' : 'bad-dot'"></span>
                <div>
                  <div class="result-title">
                    <strong>{{ result.criterionTitle }}</strong>
                    <div class="result-meta">
                      <span class="badge" :class="result.passed ? 'badge-ok' : 'badge-danger'">
                        {{ result.passed ? 'Выполнен' : 'Не выполнен' }}
                      </span>
                      <span class="score-pill">
                        {{ formatScoreValue(Number(result.score)) }}/{{ formatScoreValue(Number(result.maxScore)) }}
                      </span>
                    </div>
                  </div>
                  <p>{{ observationResultText(result) }}</p>
                </div>
              </li>
            </ul>

            <div class="signature-summary">
              <article>
                <span>Проверяющий</span>
                <strong>{{ resolvedSignatureLabel(selectedObservation, 'observer') }}</strong>
                <em>{{ resolvedSignatureStatusText(selectedObservation, 'observer') }}</em>
              </article>
              <article>
                <span>Сотрудник</span>
                <strong>{{ resolvedSignatureLabel(selectedObservation, 'employee') }}</strong>
                <em>{{ resolvedSignatureStatusText(selectedObservation, 'employee') }}</em>
              </article>
            </div>
          </div>

          <div
            v-if="
              (canManageObservationSignatures && selectedObservation.status === 'draft') ||
              canArchiveObservations
            "
            class="sheet-actions"
          >
            <article
              v-if="canManageObservationSignatures && selectedObservation.status === 'draft'"
              class="signature-step"
            >
              <div class="signature-step__head">
                <h3>Подпись проверяющего</h3>
                <span
                  class="badge"
                  :class="signatureBadgeClass(selectedObservation, 'observer')"
                >
                  {{ resolvedSignatureStatusText(selectedObservation, 'observer') }}
                </span>
              </div>
              <p class="signature-id">{{ currentReviewerLabel }}</p>
              <button
                class="signature-button"
                :class="signatureButtonClass(selectedObservation, 'observer')"
                :disabled="!canSignObservation(selectedObservation, 'observer')"
                @click="signObservation('observer')"
              >
                Подписать проверяющим
              </button>
            </article>

            <article
              v-if="canManageObservationSignatures && selectedObservation.status === 'draft'"
              class="signature-step"
            >
              <div class="signature-step__head">
                <h3>Подпись сотрудника</h3>
                <span
                  class="badge"
                  :class="signatureBadgeClass(selectedObservation, 'employee')"
                >
                  {{ resolvedSignatureStatusText(selectedObservation, 'employee') }}
                </span>
              </div>
              <label>
                Табельный номер сотрудника
                <input
                  v-model="employeeSignatureForm.tabNumber"
                  :disabled="employeeSignatureInputDisabled(selectedObservation)"
                  autocomplete="off"
                  placeholder="Введите табельный номер"
                />
              </label>
              <button
                class="signature-button"
                :class="signatureButtonClass(selectedObservation, 'employee')"
                :disabled="!canSignObservation(selectedObservation, 'employee')"
                @click="signObservation('employee')"
              >
                Подписать сотрудником
              </button>
            </article>

            <button
              v-if="canArchiveObservations"
              class="secondary"
              :disabled="loading || selectedObservation.status !== 'signed'"
              @click="archiveObservation"
            >
              Перенести в архив
            </button>
          </div>
        </aside>

        <aside v-else class="surface-card empty-state large">
          {{ observations.length ? 'Выберите КЛН из списка слева.' : 'За выбранный период журнал наблюдений пока пуст.' }}
        </aside>
      </section>

      <section v-if="view === 'reports'" class="content-section">
        <div class="page-header page-header-inline page-header--rich">
          <div class="section-intro compact">
            <p class="section-eyebrow">Отчетность</p>
            <h1>Премирование сотрудников</h1>
            <p class="section-lead">
              Сводный отчет по подписанным и архивным КЛН за выбранный месяц с автоматическим решением по премии.
            </p>
          </div>
          <div class="inline-controls">
            <input v-model="reportMonth" type="month" />
            <button :disabled="loading" @click="loadReport">Сформировать</button>
          </div>
        </div>

        <p v-if="bonusReport" class="surface-card report-rule">{{ bonusReport.rule }}</p>

        <div v-if="bonusReport" class="report-overview">
          <article class="surface-card">
            <span>Период</span>
            <strong>{{ formatMonthLabel(bonusReport.period) }}</strong>
            <small>{{ reportStats.observations }} КЛН включено в расчет</small>
          </article>
          <article class="surface-card">
            <span>Сотрудников</span>
            <strong>{{ reportStats.employees }}</strong>
            <small>{{ reportStats.approved }} получают премию</small>
          </article>
          <article class="surface-card">
            <span>Отказы</span>
            <strong>{{ reportStats.rejected }}</strong>
            <small>По правилам выбранного периода</small>
          </article>
          <article class="surface-card">
            <span>Средний показатель</span>
            <strong>{{ reportStats.averagePercentage === null ? '—' : `${reportStats.averagePercentage}%` }}</strong>
            <small>Среднее выполнение по участникам отчета</small>
          </article>
        </div>

        <div v-if="bonusReport" class="report-list">
          <article v-for="row in bonusReport.rows" :key="row.employeeId" class="surface-card report-card">
            <div class="report-card__head">
              <div>
                <h3>{{ row.fullName }}</h3>
                <p>№ {{ row.employeeNumber }} · {{ row.position }}</p>
              </div>
              <span :class="row.bonusAllowed ? 'badge badge-ok' : 'badge badge-danger'">
                {{ row.decision }}
              </span>
            </div>

            <div class="report-card__metrics">
              <article>
                <span>КЛН</span>
                <strong>{{ row.observationsCount }}</strong>
              </article>
              <article>
                <span>Нарушения</span>
                <strong>{{ row.violationEvents }}</strong>
              </article>
              <article>
                <span>Средний %</span>
                <strong>{{ row.averagePercentage === null ? '—' : `${row.averagePercentage}%` }}</strong>
              </article>
            </div>

            <p class="report-card__reason">{{ row.reason }}</p>
          </article>
        </div>
      </section>

      <section v-if="view === 'personnel'" class="content-section split-layout">
        <div class="surface-card records-panel">
          <div class="panel-header panel-header--stacked">
            <div class="section-intro compact">
              <p class="section-eyebrow">{{ personnelSectionEyebrow }}</p>
              <h1>{{ personnelSectionTitle }}</h1>
              <p class="section-lead">{{ personnelSectionLead }}</p>
            </div>
            <button
              v-if="activePersonnelTab === 'users' && canManageUsers"
              class="secondary"
              :disabled="loading"
              @click="startCreatingUser"
            >
              Новая учетная запись
            </button>
            <button
              v-else-if="activePersonnelTab === 'employees' && canManageEmployees"
              class="secondary"
              :disabled="loading"
              @click="startCreatingEmployee"
            >
              Новый сотрудник
            </button>
          </div>

          <div v-if="availablePersonnelTabs.length > 1" class="section-tabs">
            <button
              v-if="canManageUsers"
              type="button"
              :class="{ active: activePersonnelTab === 'users' }"
              @click="openPersonnelView('users')"
            >
              Учетные записи
            </button>
            <button
              v-if="canSeeCatalogs"
              type="button"
              :class="{ active: activePersonnelTab === 'employees' }"
              @click="openPersonnelView('employees')"
            >
              Сотрудники
            </button>
          </div>

          <label v-if="activePersonnelTab === 'users'" class="search-field">
            Поиск по учетным записям
            <input
              v-model="userSearchQuery"
              type="search"
              placeholder="ФИО, роль, номер сотрудника или табельный номер"
            />
          </label>

          <label v-else class="search-field">
            Поиск по сотрудникам
            <input
              v-model="employeeSearchQuery"
              type="search"
              placeholder="ФИО, должность или номер сотрудника"
            />
          </label>

          <div v-if="activePersonnelTab === 'users'" class="directory-list">
            <article
              v-for="account in filteredUsers"
              :key="account.id"
              class="person-card"
              :class="{
                selected: selectedUserId === account.id,
                'person-card--locked': account.id === user?.id,
              }"
              @click="account.id !== user?.id && editUser(account.id)"
            >
              <div class="person-card__main">
                <div class="person-card__heading">
                  <div>
                    <h3>{{ account.fullName }}</h3>
                    <p class="person-card__number">№ {{ account.employeeNumber }}</p>
                  </div>
                  <span
                    class="badge"
                    :class="account.isActive ? 'badge-ok' : 'badge-danger'"
                  >
                    {{ account.isActive ? 'Активен' : 'Отключен' }}
                  </span>
                </div>

                <div class="person-card__meta">
                  <span class="person-pill">{{ roleText[account.role] }}</span>
                  <span v-if="account.id === user?.id" class="person-pill person-pill-muted">
                    Текущая учетная запись
                  </span>
                </div>
              </div>

              <div class="person-card__actions">
                <button
                  class="secondary table-action"
                  :disabled="loading || account.id === user?.id"
                  @click.stop="editUser(account.id)"
                >
                  {{ account.id === user?.id ? 'Недоступно' : 'Изменить' }}
                </button>
              </div>
            </article>
            <div v-if="!filteredUsers.length" class="empty-state">
              По вашему запросу учетные записи не найдены.
            </div>
          </div>

          <div v-else class="directory-list">
            <article
              v-for="employee in filteredEmployees"
              :key="employee.id"
              class="person-card"
              :class="{
                selected: selectedEmployeeId === employee.id,
                'person-card--readonly': !canManageEmployees,
              }"
              @click="canManageEmployees && editEmployee(employee.id)"
            >
              <div class="person-card__main">
                <div class="person-card__heading">
                  <div>
                    <h3>{{ employee.fullName }}</h3>
                    <p class="person-card__number">№ {{ employee.employeeNumber }}</p>
                  </div>
                  <span
                    class="badge"
                    :class="employee.isActive ? 'badge-ok' : 'badge-danger'"
                  >
                    {{ employee.isActive ? 'Активен' : 'Неактивен' }}
                  </span>
                </div>

                <div class="person-card__meta">
                  <span class="person-pill">{{ employee.position }}</span>
                  <span v-if="employee.hireDate" class="person-pill person-pill-soft">
                    Принят: {{ employee.hireDate }}
                  </span>
                </div>
              </div>

              <div v-if="canManageEmployees" class="person-card__actions">
                <button
                  class="secondary table-action"
                  :disabled="loading"
                  @click.stop="editEmployee(employee.id)"
                >
                  Изменить
                </button>
              </div>
            </article>
            <div v-if="!filteredEmployees.length" class="empty-state">
              По вашему запросу сотрудники не найдены.
            </div>
          </div>
        </div>

        <aside v-if="activePersonnelTab === 'users'" class="details-panel">
          <form class="surface-card admin-form" @submit.prevent="saveUser">
            <div class="panel-header">
              <h1>{{ userFormMode === 'create' ? 'Новая учетная запись' : 'Редактирование пользователя' }}</h1>
            </div>

            <p class="helper-copy">
              Управление доступно только директору и отделу кадров. Собственная учетная запись
              редактированию не подлежит.
            </p>

            <div v-if="selectedUserIsSelf" class="message error">
              Редактирование собственной учетной записи отключено.
            </div>

            <div class="form-grid form-grid-2">
              <label>
                Номер сотрудника
                <input v-model="userForm.employeeNumber" />
              </label>

              <label>
                Табельный номер
                <input v-model="userForm.personnelNumber" />
              </label>

              <label>
                Фамилия
                <input v-model="userForm.lastName" />
              </label>

              <label>
                Имя
                <input v-model="userForm.firstName" />
              </label>

              <label>
                Отчество
                <input v-model="userForm.middleName" />
              </label>

              <label>
                Роль
                <select v-model="userForm.role">
                  <option value="admin">Директор</option>
                  <option value="manager">Менеджер</option>
                  <option value="observer">Инструктор</option>
                  <option value="hr">Отдел кадров</option>
                </select>
              </label>

              <label class="form-grid-span-2">
                {{ userFormMode === 'create' ? 'Пароль' : 'Новый пароль' }}
                <input
                  v-model="userForm.password"
                  type="password"
                  :placeholder="
                    userFormMode === 'create'
                      ? 'Укажите пароль'
                      : 'Оставьте пустым, если пароль менять не нужно'
                  "
                />
              </label>
            </div>

            <label class="checkbox-field">
              <input v-model="userForm.isActive" class="checkbox-input" type="checkbox" />
              Учетная запись активна
            </label>

            <div class="page-actions">
              <button :disabled="loading || selectedUserIsSelf">
                {{ userFormMode === 'create' ? 'Создать учетную запись' : 'Сохранить изменения' }}
              </button>
              <button class="secondary" type="button" :disabled="loading" @click="startCreatingUser">
                Очистить форму
              </button>
            </div>
          </form>
        </aside>

        <aside v-else-if="canManageEmployees" class="details-panel">
          <form class="surface-card admin-form" @submit.prevent="saveEmployee">
            <div class="panel-header">
              <h1>{{ employeeFormMode === 'create' ? 'Новый сотрудник' : 'Редактирование сотрудника' }}</h1>
            </div>

            <p class="helper-copy">
              Актуализация базы сотрудников доступна директору, менеджеру и отделу кадров.
            </p>

            <div class="form-grid form-grid-2">
              <label>
                Номер сотрудника
                <input v-model="employeeForm.employeeNumber" />
              </label>

              <label>
                Табельный номер
                <input v-model="employeeForm.personnelNumber" />
              </label>

              <label>
                Фамилия
                <input v-model="employeeForm.lastName" />
              </label>

              <label>
                Имя
                <input v-model="employeeForm.firstName" />
              </label>

              <label>
                Отчество
                <input v-model="employeeForm.middleName" />
              </label>

              <label>
                Должность
                <input v-model="employeeForm.position" />
              </label>

              <label>
                Дата приема
                <input v-model="employeeForm.hireDate" type="date" />
              </label>
            </div>

            <label class="checkbox-field">
              <input v-model="employeeForm.isActive" class="checkbox-input" type="checkbox" />
              Карточка сотрудника активна
            </label>

            <div class="page-actions">
              <button :disabled="loading">
                {{ employeeFormMode === 'create' ? 'Создать карточку' : 'Сохранить изменения' }}
              </button>
              <button
                class="secondary"
                type="button"
                :disabled="loading"
                @click="startCreatingEmployee"
              >
                Очистить форму
              </button>
            </div>
          </form>
        </aside>

        <aside v-else class="surface-card empty-state large">
          Актуализация карточек сотрудников доступна директору, менеджеру и отделу кадров.
        </aside>
      </section>

      <section v-if="view === 'templates' && canSeeTemplates" class="content-section">
        <div class="page-header page-header--rich">
          <div class="section-intro compact">
            <p class="section-eyebrow">Конструктор шаблонов</p>
            <h1>Шаблоны КЛН</h1>
            <p class="section-lead">
              Формируйте единые шаблоны наблюдений по рабочим зонам и поддерживайте критерии оценки в актуальном состоянии.
            </p>
          </div>
          <button
            v-if="canManageTemplates"
            class="secondary"
            :disabled="loading"
            @click="startCreatingTemplate"
          >
            Новый шаблон
          </button>
        </div>

        <form
          v-if="canManageTemplates && showTemplateForm"
          class="surface-card admin-form template-form-panel"
          @submit.prevent="saveTemplate"
        >
          <div class="panel-header">
            <div>
              <h1>{{ templateFormMode === 'create' ? 'Создание шаблона' : 'Редактирование шаблона' }}</h1>
              <p>
                {{ templateFormMode === 'create'
                  ? 'Заполните рабочую зону и критерии нового КЛН.'
                  : 'Измените параметры шаблона и актуальный набор критериев.' }}
              </p>
            </div>
            <button class="secondary table-action" type="button" :disabled="loading" @click="closeTemplateForm">
              Закрыть
            </button>
          </div>

          <div class="form-grid form-grid-2">
            <label>
              Наименование
              <input v-model="templateForm.title" />
            </label>

            <label>
              Рабочая зона
              <input v-model="templateForm.position" />
            </label>
          </div>

          <label class="checkbox-field">
            <input v-model="templateForm.isActive" class="checkbox-input" type="checkbox" />
            Шаблон активен
          </label>

          <div class="criteria-editor">
            <div class="panel-header">
              <h3>Критерии оценки</h3>
              <button class="secondary" type="button" :disabled="loading" @click="addTemplateCriterion">
                Добавить критерий
              </button>
            </div>

            <article
              v-for="(criterion, index) in templateForm.criteria"
              :key="`${templateFormMode}-${index}`"
              class="surface-card criterion-editor-card"
            >
              <div class="criteria-editor-head">
                <strong>Критерий {{ index + 1 }}</strong>
                <button
                  class="secondary"
                  type="button"
                  :disabled="loading"
                  @click="removeTemplateCriterion(index)"
                >
                  Удалить
                </button>
              </div>

              <div class="form-grid form-grid-2">
                <label>
                  Порядок
                  <input v-model.number="criterion.sortOrder" type="number" min="1" />
                </label>

                <label>
                  Максимальный балл
                  <input v-model.number="criterion.maxScore" type="number" min="0" step="0.01" />
                </label>

                <label class="form-grid-span-2">
                  Название
                  <input v-model="criterion.title" />
                </label>

                <label class="form-grid-span-2">
                  Описание
                  <textarea v-model="criterion.description" rows="3"></textarea>
                </label>
              </div>
            </article>
          </div>

          <div class="page-actions">
            <button :disabled="loading">
              {{ templateFormMode === 'create' ? 'Создать шаблон' : 'Сохранить шаблон' }}
            </button>
            <button class="secondary" type="button" :disabled="loading" @click="startCreatingTemplate">
              Очистить форму
            </button>
            <button class="secondary" type="button" :disabled="loading" @click="closeTemplateForm">
              Закрыть
            </button>
          </div>
        </form>

        <div class="template-list">
          <article v-for="template in templates" :key="template.id" class="surface-card">
            <div class="template-header">
              <div>
                <h3>{{ template.title }}</h3>
                <p>{{ template.position }}</p>
                <div class="template-meta">
                  <span class="person-pill">Критериев: {{ template.criteria.length }}</span>
                </div>
              </div>
              <div class="template-actions">
                <span class="badge" :class="template.isActive ? 'badge-ok' : 'badge-danger'">
                  {{ template.isActive ? 'Активен' : 'Неактивен' }}
                </span>
                <button
                  v-if="canManageTemplates"
                  class="secondary table-action"
                  :disabled="loading"
                  @click="editTemplate(template.id)"
                >
                  Изменить
                </button>
              </div>
            </div>
            <ol>
              <li v-for="criterion in template.criteria" :key="criterion.id">
                {{ criterion.title }}
              </li>
            </ol>
          </article>
        </div>
      </section>
    </main>

    <div v-if="notice" class="toast-stack" aria-live="polite" aria-atomic="true">
      <div class="toast toast-success">{{ notice }}</div>
    </div>
  </div>
</template>
