const test = require('node:test');
const assert = require('node:assert/strict');

const { BadRequestException } = require('@nestjs/common');

const { ObservationsService } = require('../dist/observations/observations.service');
const { SignatureRole } = require('../dist/observations/entities/observation-signature.entity');
const { ObservationStatus } = require('../dist/observations/entities/observation.entity');
const { UserRole } = require('../dist/users/entities/user.entity');

const workerPbo = '\u0420\u0430\u0431\u043e\u0442\u043d\u0438\u043a \u041f\u0411\u041e';

function createService(overrides = {}) {
  const observationsRepository = {
    create: (payload) => payload,
    save: async (payload) => payload,
    createQueryBuilder: () => ({
      delete() {
        return this;
      },
      from() {
        return this;
      },
      where() {
        return this;
      },
      leftJoinAndSelect() {
        return this;
      },
      orderBy() {
        return this;
      },
      addOrderBy() {
        return this;
      },
      andWhere() {
        return this;
      },
      async execute() {
        return undefined;
      },
      async getMany() {
        return [];
      },
      async getOne() {
        return null;
      },
    }),
    ...overrides.observationsRepository,
  };

  const service = new ObservationsService(
    observationsRepository,
    overrides.signaturesRepository ?? {},
    overrides.criteriaRepository ?? {},
    overrides.employeesService ?? {},
    overrides.templatesService ?? {},
    overrides.usersService ?? {},
    overrides.digestService ?? {},
  );

  if (overrides.getRequired) {
    service.getRequired = overrides.getRequired;
  }
  if (overrides.purgeExpiredObservations) {
    service.purgeExpiredObservations = overrides.purgeExpiredObservations;
  }

  return { service, observationsRepository };
}

test('ObservationsService.create calculates total score, percentage and violations count', async () => {
  const employee = {
    id: 'employee-1',
    position: workerPbo,
  };
  const template = {
    id: 'template-1',
    isActive: true,
    position: 'Cash desk zone',
  };
  const criteria = [
    {
      id: 'criterion-1',
      title: 'First criterion',
      description: 'First criterion description',
      maxScore: 1,
    },
    {
      id: 'criterion-2',
      title: 'Second criterion',
      description: 'Second criterion description',
      maxScore: 2,
    },
  ];
  const observer = {
    id: 'observer-1',
    role: UserRole.MANAGER,
  };

  const { service } = createService({
    employeesService: {
      async getRequired(id) {
        assert.equal(id, 'employee-1');
        return employee;
      },
    },
    templatesService: {
      async getRequired(id) {
        assert.equal(id, 'template-1');
        return template;
      },
    },
    criteriaRepository: {
      async find() {
        return criteria;
      },
    },
    purgeExpiredObservations: async () => undefined,
  });

  const result = await service.create(
    {
      employeeId: 'employee-1',
      templateId: 'template-1',
      observationDate: '2026-05-23',
      comment: 'Planned check',
      results: [
        { criterionId: 'criterion-1', score: 1, comment: 'No issues' },
        { criterionId: 'criterion-2', score: 0.5, passed: false, comment: 'Issue found' },
      ],
    },
    observer,
  );

  assert.equal(result.status, ObservationStatus.DRAFT);
  assert.equal(result.position, 'Cash desk zone');
  assert.equal(result.totalScore, 1.5);
  assert.equal(result.maxScore, 3);
  assert.equal(result.percentage, 50);
  assert.equal(result.violationsCount, 1);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[1].passed, false);
});

test('ObservationsService.create rejects inactive template', async () => {
  const { service } = createService({
    employeesService: {
      async getRequired() {
        return { id: 'employee-1', position: workerPbo };
      },
    },
    templatesService: {
      async getRequired() {
        return { id: 'template-1', isActive: false, position: 'Kitchen' };
      },
    },
    purgeExpiredObservations: async () => undefined,
  });

  await assert.rejects(
    () =>
      service.create(
        {
          employeeId: 'employee-1',
          templateId: 'template-1',
          observationDate: '2026-05-23',
          results: [],
        },
        { id: 'manager-1', role: UserRole.MANAGER },
      ),
    BadRequestException,
  );
});

test('ObservationsService.create rejects criteria from another template', async () => {
  const { service } = createService({
    employeesService: {
      async getRequired() {
        return { id: 'employee-1', position: workerPbo };
      },
    },
    templatesService: {
      async getRequired() {
        return { id: 'template-1', isActive: true, position: 'Kitchen' };
      },
    },
    criteriaRepository: {
      async find() {
        return [{ id: 'criterion-1', title: 'One', description: 'Description', maxScore: 1 }];
      },
    },
    purgeExpiredObservations: async () => undefined,
  });

  await assert.rejects(
    () =>
      service.create(
        {
          employeeId: 'employee-1',
          templateId: 'template-1',
          observationDate: '2026-05-23',
          results: [{ criterionId: 'criterion-missing', score: 1 }],
        },
        { id: 'manager-1', role: UserRole.MANAGER },
      ),
    BadRequestException,
  );
});

test('ObservationsService.create rejects score above criterion maximum', async () => {
  const { service } = createService({
    employeesService: {
      async getRequired() {
        return { id: 'employee-1', position: workerPbo };
      },
    },
    templatesService: {
      async getRequired() {
        return { id: 'template-1', isActive: true, position: 'Kitchen' };
      },
    },
    criteriaRepository: {
      async find() {
        return [{ id: 'criterion-1', title: 'One', description: 'Description', maxScore: 1 }];
      },
    },
    purgeExpiredObservations: async () => undefined,
  });

  await assert.rejects(
    () =>
      service.create(
        {
          employeeId: 'employee-1',
          templateId: 'template-1',
          observationDate: '2026-05-23',
          results: [{ criterionId: 'criterion-1', score: 2 }],
        },
        { id: 'manager-1', role: UserRole.MANAGER },
      ),
    BadRequestException,
  );
});

test('ObservationsService.create limits instructor to worker PBO employees', async () => {
  const { service } = createService({
    employeesService: {
      async getRequired() {
        return { id: 'employee-1', position: 'Instructor' };
      },
    },
    purgeExpiredObservations: async () => undefined,
  });

  await assert.rejects(
    () =>
      service.create(
        {
          employeeId: 'employee-1',
          templateId: 'template-1',
          observationDate: '2026-05-23',
          results: [],
        },
        { id: 'observer-1', role: UserRole.OBSERVER },
      ),
    BadRequestException,
  );
});

test('ObservationsService.findAll applies filters and sorts results', async () => {
  let purgeCalls = 0;
  const queryState = { andWhere: [] };

  const builder = {
    leftJoinAndSelect() {
      return this;
    },
    orderBy() {
      return this;
    },
    addOrderBy() {
      return this;
    },
    andWhere(sql, params) {
      queryState.andWhere.push({ sql, params });
      return this;
    },
    async getMany() {
      return [
        {
          id: 'observation-1',
          results: [
            { criterionTitle: 'B', criterion: { sortOrder: 2 } },
            { criterionTitle: 'A', criterion: { sortOrder: 1 } },
          ],
        },
      ];
    },
  };

  const { service } = createService({
    observationsRepository: {
      createQueryBuilder(alias) {
        assert.equal(alias, 'observation');
        return builder;
      },
    },
    purgeExpiredObservations: async () => {
      purgeCalls += 1;
    },
  });

  const result = await service.findAll({
    employeeId: 'employee-1',
    status: ObservationStatus.DRAFT,
    month: '2026-05',
  });

  assert.equal(purgeCalls, 1);
  assert.equal(result.length, 1);
  assert.deepEqual(
    result[0].results.map((item) => item.criterionTitle),
    ['A', 'B'],
  );
  assert.equal(queryState.andWhere.length, 3);
});

test('ObservationsService.sign rejects observer signature from another user', async () => {
  const observation = {
    id: 'observation-1',
    status: ObservationStatus.DRAFT,
    observer: { id: 'observer-1' },
  };

  const { service } = createService({
    getRequired: async () => observation,
    signaturesRepository: {
      async findOne() {
        return null;
      },
    },
  });

  await assert.rejects(
    () =>
      service.sign(
        'observation-1',
        { signerRole: SignatureRole.OBSERVER },
        { id: 'other-user', employeeNumber: '12', fullName: 'Other User' },
      ),
    BadRequestException,
  );
});

test('ObservationsService.sign rejects wrong employee tab number', async () => {
  const observation = {
    id: 'observation-1',
    status: ObservationStatus.DRAFT,
    employee: { id: 'employee-1', employeeNumber: '97', fullName: 'Employee One' },
    observer: { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
    template: { title: 'Template' },
    observationDate: '2026-05-23',
    position: 'Kitchen',
    totalScore: 1,
    maxScore: 1,
    percentage: 100,
    violationsCount: 0,
    results: [{ criterionTitle: 'One', score: 1, maxScore: 1, passed: true, comment: null }],
  };

  const { service } = createService({
    getRequired: async () => observation,
    employeesService: {
      async getRequiredWithPersonnelNumber() {
        return { id: 'employee-1', personnelNumber: '982128' };
      },
    },
    signaturesRepository: {
      async findOne() {
        return null;
      },
      async find() {
        return [];
      },
    },
    digestService: {
      createDigest() {
        return 'digest-1';
      },
    },
  });

  await assert.rejects(
    () =>
      service.sign(
        'observation-1',
        { signerRole: SignatureRole.EMPLOYEE, employeeTabNumber: '000000' },
        { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
      ),
    BadRequestException,
  );
});

test('ObservationsService.sign requires observer signature before employee signature', async () => {
  const observation = {
    id: 'observation-1',
    status: ObservationStatus.DRAFT,
    employee: { id: 'employee-1', employeeNumber: '97', fullName: 'Employee One' },
    observer: { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
    template: { title: 'Template' },
    observationDate: '2026-05-23',
    position: 'Kitchen',
    totalScore: 1,
    maxScore: 1,
    percentage: 100,
    violationsCount: 0,
    results: [{ criterionTitle: 'One', score: 1, maxScore: 1, passed: true, comment: null }],
  };

  const { service } = createService({
    getRequired: async () => observation,
    employeesService: {
      async getRequiredWithPersonnelNumber() {
        return { id: 'employee-1', personnelNumber: '982128' };
      },
    },
    signaturesRepository: {
      async findOne() {
        return null;
      },
      async find() {
        return [];
      },
      create: (payload) => payload,
      async save() {
        throw new Error('Employee signature must not be saved before observer signature');
      },
    },
    digestService: {
      createDigest() {
        return 'digest-1';
      },
    },
  });

  await assert.rejects(
    () =>
      service.sign(
        'observation-1',
        { signerRole: SignatureRole.EMPLOYEE, employeeTabNumber: '982128' },
        { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
      ),
    BadRequestException,
  );
});

test('ObservationsService.sign rejects duplicate observer signature', async () => {
  const observation = {
    id: 'observation-1',
    status: ObservationStatus.DRAFT,
    employee: { id: 'employee-1', employeeNumber: '97', fullName: 'Employee One' },
    observer: { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
    template: { title: 'Template' },
    observationDate: '2026-05-23',
    position: 'Kitchen',
    totalScore: 1,
    maxScore: 1,
    percentage: 100,
    violationsCount: 0,
    results: [{ criterionTitle: 'One', score: 1, maxScore: 1, passed: true, comment: null }],
  };

  const { service } = createService({
    getRequired: async () => observation,
    signaturesRepository: {
      async findOne() {
        return { id: 'signature-1', signerRole: SignatureRole.OBSERVER };
      },
    },
    usersService: {
      async getRequiredWithPersonnelNumber() {
        return { id: 'observer-1', personnelNumber: '980200' };
      },
    },
    digestService: {
      createDigest() {
        return 'digest-1';
      },
    },
  });

  await assert.rejects(
    () =>
      service.sign(
        'observation-1',
        { signerRole: SignatureRole.OBSERVER },
        { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
      ),
    BadRequestException,
  );
});

test('ObservationsService.sign stores signatures and marks observation signed after both parties', async () => {
  const observation = {
    id: 'observation-1',
    status: ObservationStatus.DRAFT,
    employee: { id: 'employee-1', employeeNumber: '97', fullName: 'Employee One' },
    observer: { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
    template: { title: 'Template' },
    observationDate: '2026-05-23',
    position: 'Kitchen',
    totalScore: 1,
    maxScore: 1,
    percentage: 100,
    violationsCount: 0,
    results: [{ criterionTitle: 'One', score: 1, maxScore: 1, passed: true, comment: null }],
  };
  const signatures = [];
  let observationSaveCalls = 0;

  const signaturesRepository = {
    async findOne({ where }) {
      return (
        signatures.find(
          (item) =>
            item.observation.id === where.observation.id && item.signerRole === where.signerRole,
        ) ?? null
      );
    },
    create: (payload) => payload,
    async save(payload) {
      const saved = { ...payload, id: `signature-${signatures.length + 1}` };
      signatures.push(saved);
      return saved;
    },
    async find({ where }) {
      return signatures.filter((item) => item.observation.id === where.observation.id);
    },
  };

  const { service } = createService({
    observationsRepository: {
      create: (payload) => payload,
      async save(payload) {
        observationSaveCalls += 1;
        Object.assign(observation, payload);
        return observation;
      },
      createQueryBuilder: () => ({
        delete() {
          return this;
        },
        from() {
          return this;
        },
        where() {
          return this;
        },
        async execute() {
          return undefined;
        },
      }),
    },
    signaturesRepository,
    employeesService: {
      async getRequiredWithPersonnelNumber() {
        return { id: 'employee-1', personnelNumber: '982128' };
      },
    },
    usersService: {
      async getRequiredWithPersonnelNumber() {
        return { id: 'observer-1', personnelNumber: '980200' };
      },
    },
    digestService: {
      createDigest() {
        return 'digest-1';
      },
    },
    getRequired: async () => observation,
  });

  const afterObserverSign = await service.sign(
    'observation-1',
    { signerRole: SignatureRole.OBSERVER },
    { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
  );

  assert.equal(afterObserverSign.status, ObservationStatus.DRAFT);
  assert.equal(signatures.length, 1);
  assert.equal(signatures[0].signerRole, SignatureRole.OBSERVER);
  assert.equal(observationSaveCalls, 0);

  const afterEmployeeSign = await service.sign(
    'observation-1',
    { signerRole: SignatureRole.EMPLOYEE, employeeTabNumber: ' 982128 ' },
    { id: 'observer-1', employeeNumber: '12', fullName: 'Observer One' },
  );

  assert.equal(signatures.length, 2);
  assert.equal(afterEmployeeSign.status, ObservationStatus.SIGNED);
  assert.equal(observation.status, ObservationStatus.SIGNED);
  assert.equal(observationSaveCalls, 1);
});

test('ObservationsService.archive rejects draft observations', async () => {
  const { service } = createService({
    getRequired: async () => ({
      id: 'observation-1',
      status: ObservationStatus.DRAFT,
    }),
  });

  await assert.rejects(() => service.archive('observation-1'), BadRequestException);
});

test('ObservationsService.archive changes signed observation status to archived', async () => {
  const signedObservation = {
    id: 'observation-2',
    status: ObservationStatus.SIGNED,
  };

  const { service } = createService({
    getRequired: async () => signedObservation,
  });

  const archived = await service.archive('observation-2');

  assert.equal(archived.status, ObservationStatus.ARCHIVED);
});

test('ObservationsService.purgeExpiredObservations deletes records older than three months', async () => {
  let deleteWhere = null;

  const { service } = createService({
    observationsRepository: {
      create: (payload) => payload,
      save: async (payload) => payload,
      createQueryBuilder: () => ({
        delete() {
          return this;
        },
        from() {
          return this;
        },
        where(sql, params) {
          deleteWhere = { sql, params };
          return this;
        },
        async execute() {
          return undefined;
        },
      }),
    },
  });

  await service.purgeExpiredObservations();

  const expectedCutoff = (() => {
    const cutoff = new Date();
    const originalDay = cutoff.getDate();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(1);
    cutoff.setMonth(cutoff.getMonth() - 3);
    const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
    cutoff.setDate(Math.min(originalDay, lastDay));
    return cutoff.toISOString().slice(0, 10);
  })();

  assert.match(deleteWhere.sql, /observation_date/);
  assert.equal(deleteWhere.params.cutoffDate, expectedCutoff);
});
