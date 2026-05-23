import { describe, expect, it } from 'vitest';
import { createSignaturePayload } from './signature';

describe('createSignaturePayload', () => {
  it('creates observer signature payload without employee number', () => {
    expect(createSignaturePayload('observer')).toEqual({
      signerRole: 'observer',
      employeeTabNumber: undefined,
    });
  });

  it('trims employee tab number and keeps signer role', () => {
    expect(createSignaturePayload('employee', ' 982128 ')).toEqual({
      signerRole: 'employee',
      employeeTabNumber: '982128',
    });
  });
});
