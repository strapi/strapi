import { yup, validateYupSchema } from '@strapi/utils';
import {
  MFA_ENFORCEMENT_MODES,
  MAX_GRACE_DAYS,
  MIN_GRACE_DAYS,
  MAX_TRUST_DAYS,
  MIN_TRUST_DAYS,
} from '../services/security-settings';

/**
 * PUT /admin/security-settings, per object: `mfa` and `trustedDevices` are each optional, but
 * whichever is present is validated whole (no merge inside an object), and at least one must be
 * present. `password`/`code` are optional here; the service demands them when the change is a
 * downgrade. `code` bounds mirror `validation/authentication/mfa.ts` (no `.trim()` under strict
 * yup).
 */
const mfaSchema = yup
  .object()
  .shape({
    mode: yup
      .string()
      .oneOf([...MFA_ENFORCEMENT_MODES])
      .required(),
    graceDays: yup.number().integer().min(MIN_GRACE_DAYS).max(MAX_GRACE_DAYS).required(),
    requiredRoles: yup.array().of(yup.strapiID().required()).required(),
  })
  .noUnknown();

const trustedDevicesSchema = yup
  .object()
  .shape({
    enabled: yup.boolean().required(),
    days: yup.number().integer().min(MIN_TRUST_DAYS).max(MAX_TRUST_DAYS).required(),
  })
  .noUnknown();

const updateSecuritySettingsSchema = yup
  .object()
  .shape({
    mfa: mfaSchema.optional(),
    trustedDevices: trustedDevicesSchema.optional(),
    password: yup.string().optional(),
    code: yup.string().min(6).max(32).optional(),
  })
  .required()
  .noUnknown()
  .test(
    'one-object',
    'Provide mfa or trustedDevices',
    (value: { mfa?: unknown; trustedDevices?: unknown } | undefined) =>
      Boolean(value?.mfa || value?.trustedDevices)
  );

export const validateUpdateSecuritySettings = validateYupSchema(updateSecuritySettingsSchema);
