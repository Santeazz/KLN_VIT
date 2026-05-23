const test = require('node:test');
const assert = require('node:assert/strict');

const { RolesGuard } = require('../dist/common/guards/roles.guard');
const { UserRole } = require('../dist/users/entities/user.entity');

function makeContext(user) {
  return {
    getHandler() {
      return 'handler';
    },
    getClass() {
      return 'class';
    },
    switchToHttp() {
      return {
        getRequest() {
          return { user };
        },
      };
    },
  };
}

test('RolesGuard allows access when route has no role metadata', () => {
  const guard = new RolesGuard({
    getAllAndOverride() {
      return undefined;
    },
  });

  assert.equal(guard.canActivate(makeContext({ role: UserRole.ADMIN })), true);
});

test('RolesGuard allows access when user role matches required roles', () => {
  const guard = new RolesGuard({
    getAllAndOverride() {
      return [UserRole.ADMIN, UserRole.HR];
    },
  });

  assert.equal(guard.canActivate(makeContext({ role: UserRole.HR })), true);
});

test('RolesGuard blocks access when user role does not match', () => {
  const guard = new RolesGuard({
    getAllAndOverride() {
      return [UserRole.ADMIN];
    },
  });

  assert.equal(guard.canActivate(makeContext({ role: UserRole.MANAGER })), false);
  assert.equal(guard.canActivate(makeContext(undefined)), false);
});
