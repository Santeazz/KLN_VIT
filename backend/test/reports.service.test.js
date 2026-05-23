const test = require('node:test');
const assert = require('node:assert/strict');

const { ReportsService } = require('../dist/reports/reports.service');
const { ObservationStatus } = require('../dist/observations/entities/observation.entity');

test('ReportsService.getBonusReport builds monthly bonus decisions from signed and archived observations', async () => {
  const employees = [
    {
      id: 'employee-1',
      employeeNumber: '97',
      fullName: 'Иванова Дарья Сергеевна',
      position: 'Работник ПБО',
      isActive: true,
    },
    {
      id: 'employee-2',
      employeeNumber: '98',
      fullName: 'Петров Иван Олегович',
      position: 'Инструктор',
      isActive: true,
    },
    {
      id: 'employee-3',
      employeeNumber: '99',
      fullName: 'Смирнова Ольга Николаевна',
      position: 'Работник ПБО',
      isActive: true,
    },
  ];

  const observations = [
    {
      employee: { id: 'employee-1' },
      percentage: 100,
      violationsCount: 1,
      status: ObservationStatus.SIGNED,
    },
    {
      employee: { id: 'employee-1' },
      percentage: 90,
      violationsCount: 2,
      status: ObservationStatus.ARCHIVED,
    },
    {
      employee: { id: 'employee-2' },
      percentage: 100,
      violationsCount: 0,
      status: ObservationStatus.SIGNED,
    },
  ];

  const queryState = {
    whereArgs: null,
    andWhereArgs: [],
  };

  const builder = {
    leftJoinAndSelect() {
      return this;
    },
    where(sql, params) {
      queryState.whereArgs = { sql, params };
      return this;
    },
    andWhere(sql, params) {
      queryState.andWhereArgs.push({ sql, params });
      return this;
    },
    async getMany() {
      return observations;
    },
  };

  let purgeCalls = 0;

  const observationsRepository = {
    createQueryBuilder(alias) {
      assert.equal(alias, 'observation');
      return builder;
    },
  };
  const employeesRepository = {
    async find(options) {
      assert.deepEqual(options, {
        where: { isActive: true },
        order: { lastName: 'ASC', firstName: 'ASC', middleName: 'ASC' },
      });
      return employees;
    },
  };
  const observationsService = {
    async purgeExpiredObservations() {
      purgeCalls += 1;
    },
  };

  const service = new ReportsService(
    observationsRepository,
    employeesRepository,
    observationsService,
  );

  const report = await service.getBonusReport('2026-05');

  assert.equal(purgeCalls, 1);
  assert.equal(report.period, '2026-05');
  assert.equal(report.rows.length, 3);

  const firstEmployeeRow = report.rows.find((row) => row.employeeId === 'employee-1');
  assert.ok(firstEmployeeRow);
  assert.equal(firstEmployeeRow.observationsCount, 2);
  assert.equal(firstEmployeeRow.violationEvents, 2);
  assert.equal(firstEmployeeRow.averagePercentage, 95);
  assert.equal(firstEmployeeRow.bonusAllowed, false);

  const secondEmployeeRow = report.rows.find((row) => row.employeeId === 'employee-2');
  assert.ok(secondEmployeeRow);
  assert.equal(secondEmployeeRow.observationsCount, 1);
  assert.equal(secondEmployeeRow.violationEvents, 0);
  assert.equal(secondEmployeeRow.bonusAllowed, true);

  const thirdEmployeeRow = report.rows.find((row) => row.employeeId === 'employee-3');
  assert.ok(thirdEmployeeRow);
  assert.equal(thirdEmployeeRow.observationsCount, 0);
  assert.equal(thirdEmployeeRow.averagePercentage, null);
  assert.equal(thirdEmployeeRow.bonusAllowed, true);

  assert.match(queryState.whereArgs.sql, /observationDate/);
  assert.deepEqual(queryState.andWhereArgs[0].params.statuses, [
    ObservationStatus.SIGNED,
    ObservationStatus.ARCHIVED,
  ]);
});
