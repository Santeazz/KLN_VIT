import type { SignaturePayload } from './api';
import type { SignatureRole } from './types';

export function createSignaturePayload(
  signerRole: SignatureRole,
  employeeTabNumber?: string,
): SignaturePayload {
  return {
    signerRole,
    employeeTabNumber: employeeTabNumber?.trim() || undefined,
  };
}
