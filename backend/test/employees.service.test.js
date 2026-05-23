const test = require('node:test');
const assert = require('node:assert/strict');
const { ConflictException, NotFoundException } = require('@nestjs/common');

const { EmployeesService } = require('../dist/employees/employees.service');

function createEmployeesService(initialEmployees = [], overrides = {}) {
  const employees = initialEmployees.map((employee) => ({ ...employee }));

  const repository = {
    find: async () => employees,
    findOne: async ({ where } = {}) => {
      if (where?.employeeNumber) {
        return employees.find((item) => item.employeeNumber === where.employeeNumber) ?? null;
      }
      if (where?.id) {
        return employees.find((item) => item.id === where.id) ?? null;
      }
      return null;
    },
    createQueryBuilder: () => ({
      addSelect() {
        return this;
      },
      where(_sql, params) {
        this.params = params;
        return this;
      },
      async getOne() {
        if (this.params?.personnelNumber) {
          return employees.find((item) => item.personnelNumber === this.params.personnelNumber) ?? null;
        }
        if (this.params?.id) {
          return employees.find((item) => item.id === this.params.id) ?? null;
        }
        return null;
      },
    }),
    create: (payload) => payload,
    save: async (payload) => {
      if (payload.id) {
        const index = employees.findIndex((item) => item.id === payload.id);
        const saved = { ...(index >= 0 ? employees[index] : {}), ...payload };
        if (index >= 0) {
          employees[index] = saved;
        } else {
          employees.push(saved);
        }
        return saved;
      }

      const saved = { ...payload, id: `generated-employee-id-${employees.length + 1}` };
      employees.push(saved);
      return saved;
    },
    ...overrides,
  };

  return { service: new EmployeesService(repository), repository, employees };
}

test('EmployeesService.create applies default isActive and returns employee with personnel number', async () => {
  const { service } = createEmployeesService();

  const result = await service.create({
    employeeNumber: '97',
    personnelNumber: '100245',
    lastName: 'Ivanova',
    firstName: 'Darya',
    middleName: 'Sergeevna',
    position: 'Worker',
    department: 'Hall',
  });

  assert.equal(result.id, 'generated-employee-id-1');
  assert.equal(result.isActive, true);
  assert.equal(result.personnelNumber, '100245');
});

test('EmployeesService.create rejects duplicate personnel number', async () => {
  const { service } = createEmployeesService([
    {
      id: 'employee-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Ivanova',
      firstName: 'Darya',
      position: 'Worker',
      isActive: true,
    },
  ]);

  await assert.rejects(
    () =>
      service.create({
        employeeNumber: '98',
        personnelNumber: '100245',
        lastName: 'Petrov',
        firstName: 'Ivan',
        position: 'Worker',
      }),
    ConflictException,
  );
});

test('EmployeesService.update rejects duplicate employee number', async () => {
  const { service } = createEmployeesService([
    {
      id: 'employee-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Ivanova',
      firstName: 'Darya',
      position: 'Worker',
      isActive: true,
    },
    {
      id: 'employee-2',
      employeeNumber: '98',
      personnelNumber: '100246',
      lastName: 'Petrov',
      firstName: 'Ivan',
      position: 'Instructor',
      isActive: true,
    },
  ]);

  await assert.rejects(
    () => service.update('employee-1', { employeeNumber: '98' }),
    ConflictException,
  );
});

test('EmployeesService.update persists changed employee fields', async () => {
  const { service } = createEmployeesService([
    {
      id: 'employee-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Ivanova',
      firstName: 'Darya',
      position: 'Worker',
      department: 'Hall',
      isActive: true,
    },
  ]);

  const updated = await service.update('employee-1', {
    department: 'Kitchen',
    position: 'Senior worker',
    isActive: false,
  });

  assert.equal(updated.department, 'Kitchen');
  assert.equal(updated.position, 'Senior worker');
  assert.equal(updated.isActive, false);
});

test('EmployeesService.ensureSeedEmployee refreshes existing employee card', async () => {
  const { service, employees } = createEmployeesService([
    {
      id: 'employee-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Old',
      firstName: 'Name',
      position: 'Old position',
      isActive: false,
    },
  ]);

  const result = await service.ensureSeedEmployee({
    employeeNumber: '97',
    personnelNumber: '100245',
    lastName: 'Volkova',
    firstName: 'Irina',
    middleName: 'Sergeevna',
    position: 'Worker',
    department: 'Hall',
    hireDate: '2026-01-15',
  });

  assert.equal(result.id, 'employee-1');
  assert.equal(employees[0].lastName, 'Volkova');
  assert.equal(employees[0].department, 'Hall');
  assert.equal(employees[0].isActive, true);
});

test('EmployeesService.getRequired throws NotFoundException for missing employee', async () => {
  const { service } = createEmployeesService();

  await assert.rejects(() => service.getRequired('missing-employee'), NotFoundException);
});
