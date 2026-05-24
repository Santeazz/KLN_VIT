const test = require('node:test');
const assert = require('node:assert/strict');

const { SeedService } = require('../dist/seed/seed.service');
const { UserRole } = require('../dist/users/entities/user.entity');

test('SeedService.onApplicationBootstrap seeds users, employees and templates', async () => {
  const userCalls = [];
  const employeeCalls = [];
  const templateCalls = [];

  const service = new SeedService(
    {
      async ensureSeedUser(payload) {
        userCalls.push(payload);
        return payload;
      },
    },
    {
      async ensureSeedEmployee(payload) {
        employeeCalls.push(payload);
        return payload;
      },
    },
    {
      async ensureSeedTemplate(payload) {
        templateCalls.push(payload);
        return payload;
      },
    },
  );

  await service.onApplicationBootstrap();

  assert.equal(userCalls.length, 4);
  assert.deepEqual(
    userCalls.map((item) => item.role),
    [UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER, UserRole.HR],
  );

  assert.equal(employeeCalls.length, 4);
  assert.ok(templateCalls.length > 5);
  assert.equal(templateCalls[0].position, 'Кухня');
  assert.equal(templateCalls[0].criteria[0].sortOrder, 1);
  assert.equal(templateCalls[0].criteria[0].maxScore, 1);
});
