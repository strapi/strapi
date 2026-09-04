import { yup, validateYupSchema } from '@strapi/utils';
import {
  MFA_ENFORCEMENT_MODES,
  MAX_GRACE_DAYS,
  MIN_GRACE_DAYS,
} from '../services/security-settings';

/**
 * PUT /admin/security-settings. The whole `mfa` object is required (no merge). `password`/`code`
 * are optional here; the service demands them when the change is a downgrade. `code` bounds mirror
 * `validation/authentication/mfa.ts` (no `.trim()` under strict yup).
 */
const updateSecuritySettingsSchema = yup
  .object()
  .shape({
    mfa: yup
      .object()
      .shape({
        mode: yup
          .string()
          .oneOf([...MFA_ENFORCEMENT_MODES])
          .required(),
        graceDays: yup.number().integer().min(MIN_GRACE_DAYS).max(MAX_GRACE_DAYS).required(),
        requiredRoles: yup.array().of(yup.strapiID().required()).required(),
      })
      .required()
      .noUnknown(),
    password: yup.string().optional(),
    code: yup.string().min(6).max(32).optional(),
  })
  .required()
  .noUnknown();

export const validateUpdateSecuritySettings = validateYupSchema(updateSecuritySettingsSchema);
