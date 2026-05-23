const test = require('node:test');
const assert = require('node:assert/strict');
const { NotFoundException } = require('@nestjs/common');

const { TemplatesService } = require('../dist/templates/templates.service');

function createTemplatesService(initialTemplates = [], overrides = {}) {
  const templates = initialTemplates.map((template) => ({
    ...template,
    criteria: template.criteria ? template.criteria.map((criterion) => ({ ...criterion })) : [],
  }));
  const criteriaDeleteCalls = [];

  const templatesRepository = {
    find: async () => templates,
    findOne: async ({ where } = {}) => {
      if (where?.id) {
        return templates.find((item) => item.id === where.id) ?? null;
      }
      if (where?.title && where?.version !== undefined) {
        return (
          templates.find(
            (item) => item.title === where.title && Number(item.version) === Number(where.version),
          ) ?? null
        );
      }
      return null;
    },
    create: (payload) => payload,
    save: async (payload) => {
      if (payload.id) {
        const index = templates.findIndex((item) => item.id === payload.id);
        const saved = {
          ...(index >= 0 ? templates[index] : {}),
          ...payload,
          criteria: (payload.criteria ?? []).map((criterion) => ({ ...criterion })),
        };
        if (index >= 0) {
          templates[index] = saved;
        } else {
          templates.push(saved);
        }
        return saved;
      }

      const saved = {
        ...payload,
        id: `template-id-${templates.length + 1}`,
        criteria: (payload.criteria ?? []).map((criterion) => ({ ...criterion })),
      };
      templates.push(saved);
      return saved;
    },
    ...overrides.templatesRepository,
  };
  const criteriaRepository = {
    create: (payload) => payload,
    createQueryBuilder: () => ({
      delete() {
        return this;
      },
      from() {
        return this;
      },
      where(sql, params) {
        criteriaDeleteCalls.push({ sql, params });
        return this;
      },
      async execute() {
        return undefined;
      },
    }),
    ...overrides.criteriaRepository,
  };

  return {
    service: new TemplatesService(templatesRepository, criteriaRepository),
    templates,
    criteriaDeleteCalls,
  };
}

test('TemplatesService.getRequired sorts criteria by sortOrder', async () => {
  const { service } = createTemplatesService([
    {
      id: 'template-1',
      title: 'Cash desk template',
      position: 'Cash desk',
      criteria: [
        { id: 'criterion-2', sortOrder: 3 },
        { id: 'criterion-1', sortOrder: 1 },
        { id: 'criterion-3', sortOrder: 2 },
      ],
    },
  ]);

  const result = await service.getRequired('template-1');

  assert.deepEqual(
    result.criteria.map((item) => item.id),
    ['criterion-1', 'criterion-3', 'criterion-2'],
  );
});

test('TemplatesService.create applies default version and active flag', async () => {
  const { service } = createTemplatesService();

  const template = await service.create({
    title: 'Kitchen template',
    position: 'Kitchen',
    criteria: [
      {
        sortOrder: 1,
        title: 'First criterion',
        description: 'Description',
        maxScore: 1,
      },
    ],
  });

  assert.equal(template.version, 1);
  assert.equal(template.isActive, true);
  assert.equal(template.criteria.length, 1);
});

test('TemplatesService.update replaces criteria when dto.criteria is provided', async () => {
  const { service, criteriaDeleteCalls } = createTemplatesService([
    {
      id: 'template-2',
      title: 'Old template',
      position: 'Kitchen',
      version: 1,
      isActive: true,
      criteria: [{ id: 'criterion-old', sortOrder: 1 }],
    },
  ]);

  const updated = await service.update('template-2', {
    title: 'New template',
    criteria: [
      {
        sortOrder: 1,
        title: 'First criterion',
        description: 'Description',
        maxScore: 1,
      },
      {
        sortOrder: 2,
        title: 'Second criterion',
        description: 'Description 2',
        maxScore: 2,
      },
    ],
  });

  assert.equal(criteriaDeleteCalls.length, 1);
  assert.match(criteriaDeleteCalls[0].sql, /template_id/);
  assert.equal(criteriaDeleteCalls[0].params.templateId, 'template-2');
  assert.equal(updated.title, 'New template');
  assert.equal(updated.criteria.length, 2);
  assert.equal(updated.criteria[1].title, 'Second criterion');
});

test('TemplatesService.update keeps old criteria when dto.criteria is omitted', async () => {
  const { service } = createTemplatesService([
    {
      id: 'template-3',
      title: 'Template',
      position: 'Cash desk',
      version: 1,
      isActive: true,
      criteria: [{ id: 'criterion-1', sortOrder: 1, title: 'Existing criterion' }],
    },
  ]);

  const updated = await service.update('template-3', {
    isActive: false,
    version: 2,
  });

  assert.equal(updated.version, 2);
  assert.equal(updated.isActive, false);
  assert.equal(updated.criteria.length, 1);
  assert.equal(updated.criteria[0].title, 'Existing criterion');
});

test('TemplatesService.getRequired throws NotFoundException for missing template', async () => {
  const { service } = createTemplatesService();

  await assert.rejects(() => service.getRequired('missing-template'), NotFoundException);
});
