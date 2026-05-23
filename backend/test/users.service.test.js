const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');

const { UsersService } = require('../dist/users/users.service');
const { UserRole } = require('../dist/users/entities/user.entity');

function createUsersService(initialUsers = [], overrides = {}) {
  const storedUsers = initialUsers.map((user) => ({ ...user }));

  const repository = {
    find: async () => storedUsers,
    findOne: async ({ where } = {}) => {
      if (where?.employeeNumber) {
        return storedUsers.find((item) => item.employeeNumber === where.employeeNumber) ?? null;
      }
      if (where?.id) {
        return storedUsers.find((item) => item.id === where.id) ?? null;
      }
      return null;
    },
    createQueryBuilder: () => ({
      selected: [],
      addSelect() {
        this.selected.push(...arguments);
        return this;
      },
      where(_sql, params) {
        this.params = params;
        return this;
      },
      async getOne() {
        const source =
          this.params?.personnelNumber
            ? storedUsers.find((item) => item.personnelNumber === this.params.personnelNumber) ?? null
            : this.params?.id
              ? storedUsers.find((item) => item.id === this.params.id) ?? null
              : null;

        if (!source) {
          return null;
        }

        const result = { ...source };
        if (!this.selected.includes('user.passwordHash')) {
          delete result.passwordHash;
        }

        if (this.params?.personnelNumber) {
          return result;
        }
        if (this.params?.id) {
          return result;
        }
        return result;
      },
    }),
    create: (payload) => payload,
    save: async (payload) => {
      if (payload.id) {
        const index = storedUsers.findIndex((item) => item.id === payload.id);
        const saved = { ...(index >= 0 ? storedUsers[index] : {}), ...payload };
        if (index >= 0) {
          storedUsers[index] = saved;
        } else {
          storedUsers.push(saved);
        }
        return saved;
      }

      const saved = { ...payload, id: `generated-user-id-${storedUsers.length + 1}` };
      storedUsers.push(saved);
      return saved;
    },
    ...overrides,
  };

  return { service: new UsersService(repository), repository, storedUsers };
}

test('UsersService.create hashes password and returns created user with personnel number', async () => {
  const { service, storedUsers } = createUsersService();

  const result = await service.create({
    employeeNumber: '97',
    personnelNumber: '100245',
    lastName: 'Ivanova',
    firstName: 'Darya',
    middleName: 'Sergeevna',
    role: UserRole.HR,
    password: 'secret123',
    isActive: true,
  });

  assert.equal(result.id, 'generated-user-id-1');
  assert.equal(result.personnelNumber, '100245');
  assert.equal(result.passwordHash, undefined);
  assert.equal(storedUsers[0].role, UserRole.HR);
  assert.equal(await bcrypt.compare('secret123', storedUsers[0].passwordHash), true);
});

test('UsersService.create rejects duplicate employee number', async () => {
  const { service } = createUsersService([
    {
      id: 'user-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Ivanova',
      firstName: 'Darya',
      role: UserRole.ADMIN,
      isActive: true,
    },
  ]);

  await assert.rejects(
    () =>
      service.create({
        employeeNumber: '97',
        personnelNumber: '100999',
        lastName: 'Petrov',
        firstName: 'Ivan',
        role: UserRole.HR,
        password: 'secret123',
      }),
    ConflictException,
  );
});

test('UsersService.update forbids editing own account', async () => {
  const { service } = createUsersService();

  await assert.rejects(() => service.update('same-user-id', { firstName: 'New' }, 'same-user-id'), BadRequestException);
});

test('UsersService.update rejects duplicate personnel number', async () => {
  const { service } = createUsersService([
    {
      id: 'user-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Ivanova',
      firstName: 'Darya',
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      id: 'user-2',
      employeeNumber: '98',
      personnelNumber: '100246',
      lastName: 'Petrov',
      firstName: 'Ivan',
      role: UserRole.HR,
      isActive: true,
    },
  ]);

  await assert.rejects(
    () => service.update('user-1', { personnelNumber: '100246' }, 'editor-1'),
    ConflictException,
  );
});

test('UsersService.update persists changed fields and rehashes password', async () => {
  const { service, storedUsers } = createUsersService([
    {
      id: 'user-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Ivanova',
      firstName: 'Darya',
      middleName: 'Sergeevna',
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: await bcrypt.hash('old-password', 4),
    },
  ]);

  const updated = await service.update(
    'user-1',
    {
      firstName: 'Irina',
      role: UserRole.HR,
      isActive: false,
      password: 'new-secret',
    },
    'editor-1',
  );

  assert.equal(updated.firstName, 'Irina');
  assert.equal(updated.role, UserRole.HR);
  assert.equal(updated.isActive, false);
  assert.equal(await bcrypt.compare('new-secret', storedUsers[0].passwordHash), true);
});

test('UsersService.ensureSeedUser updates existing account and reactivates it', async () => {
  const { service, storedUsers } = createUsersService([
    {
      id: 'user-1',
      employeeNumber: '97',
      personnelNumber: '100245',
      lastName: 'Old',
      firstName: 'Name',
      role: UserRole.OBSERVER,
      isActive: false,
      passwordHash: 'old-hash',
    },
  ]);

  const result = await service.ensureSeedUser({
    employeeNumber: '97',
    personnelNumber: '100245',
    lastName: 'Volkova',
    firstName: 'Irina',
    middleName: 'Sergeevna',
    role: UserRole.ADMIN,
    password: 'seed-password',
  });

  assert.equal(result.id, 'user-1');
  assert.equal(storedUsers[0].lastName, 'Volkova');
  assert.equal(storedUsers[0].role, UserRole.ADMIN);
  assert.equal(storedUsers[0].isActive, true);
});

test('UsersService.getRequired throws NotFoundException for missing user', async () => {
  const { service } = createUsersService();

  await assert.rejects(() => service.getRequired('missing-user'), NotFoundException);
});
