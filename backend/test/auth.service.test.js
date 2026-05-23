const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { UnauthorizedException } = require('@nestjs/common');

const { AuthService } = require('../dist/auth/auth.service');
const { UserRole } = require('../dist/users/entities/user.entity');

test('AuthService.login returns token and sanitized user for valid credentials', async () => {
  const passwordHash = await bcrypt.hash('secret123', 4);
  const storedUser = {
    id: 'user-1',
    employeeNumber: '97',
    personnelNumber: '100245',
    role: UserRole.ADMIN,
    lastName: 'Иванова',
    firstName: 'Дарья',
    middleName: 'Сергеевна',
    fullName: 'Иванова Дарья Сергеевна',
    passwordHash,
    isActive: true,
  };

  const usersService = {
    async findByPersonnelNumberWithPassword(tabNumber) {
      assert.equal(tabNumber, '100245');
      return storedUser;
    },
  };
  const jwtService = {
    async signAsync(payload) {
      assert.deepEqual(payload, {
        sub: 'user-1',
        role: UserRole.ADMIN,
        employeeNumber: '97',
      });
      return 'jwt-token';
    },
  };

  const service = new AuthService(usersService, jwtService);
  const result = await service.login({ tabNumber: '100245', password: 'secret123' });

  assert.equal(result.accessToken, 'jwt-token');
  assert.equal(result.user.id, 'user-1');
  assert.equal(result.user.personnelNumber, undefined);
  assert.equal(result.user.passwordHash, undefined);
  assert.equal(result.user.fullName, 'Иванова Дарья Сергеевна');
});

test('AuthService.login rejects inactive user', async () => {
  const usersService = {
    async findByPersonnelNumberWithPassword() {
      return {
        id: 'user-2',
        employeeNumber: '98',
        personnelNumber: '100246',
        role: UserRole.HR,
        passwordHash: 'unused',
        isActive: false,
      };
    },
  };
  const jwtService = {
    async signAsync() {
      throw new Error('JWT should not be generated for inactive users');
    },
  };

  const service = new AuthService(usersService, jwtService);

  await assert.rejects(
    () => service.login({ tabNumber: '100246', password: 'secret123' }),
    UnauthorizedException,
  );
});

test('AuthService.login rejects invalid password', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const usersService = {
    async findByPersonnelNumberWithPassword() {
      return {
        id: 'user-3',
        employeeNumber: '99',
        personnelNumber: '100247',
        role: UserRole.MANAGER,
        passwordHash,
        isActive: true,
      };
    },
  };
  const jwtService = {
    async signAsync() {
      throw new Error('JWT should not be generated for invalid passwords');
    },
  };

  const service = new AuthService(usersService, jwtService);

  await assert.rejects(
    () => service.login({ tabNumber: '100247', password: 'wrong-password' }),
    UnauthorizedException,
  );
});
