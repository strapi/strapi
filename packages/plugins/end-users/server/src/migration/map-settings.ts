import type { EndUsersSettingsPatch } from '../../../shared/contracts/settings';

/** Users & Permissions' stored `advanced` settings */
export interface UpAdvanced {
  unique_email?: boolean;
  allow_register?: boolean;
  email_confirmation?: boolean;
  email_reset_password?: string | null;
  email_confirmation_redirection?: string | null;
  /** A role type, resolved by the caller into `defaultRoleDocumentId` */
  default_role?: string;
}

export interface AdvancedContext {
  /** Whether an email provider is configured, so that a verification email can be sent */
  emailEnabled: boolean;
  defaultRoleDocumentId: string | null;
  isAllowedRedirect: (url: string) => boolean;
}

const BUILT_IN_DEFAULT_ROLE = 'authenticated';

/**
 * What Users & Permissions' `advanced` settings become in end-users' settings. Whatever has no
 * counterpart, or cannot be carried over safely, is listed in `skipped` with the reason.
 */
export const mapUpAdvanced = (
  advanced: UpAdvanced,
  ctx: AdvancedContext
): { patch: EndUsersSettingsPatch; skipped: Array<{ key: string; reason: string }> } => {
  const signUp: NonNullable<EndUsersSettingsPatch['signUp']> = {};
  const redirects: NonNullable<EndUsersSettingsPatch['redirects']> = {};
  const skipped: Array<{ key: string; reason: string }> = [];

  if (typeof advanced.allow_register === 'boolean') {
    signUp.enabled = advanced.allow_register;
  }

  if (advanced.email_confirmation === true && !ctx.emailEnabled) {
    skipped.push({
      key: 'email_confirmation',
      reason: 'No email provider is configured, so a verification email could not be sent',
    });
  } else if (typeof advanced.email_confirmation === 'boolean') {
    signUp.requireEmailVerification = advanced.email_confirmation;
  }

  const redirectKeys = [
    ['email_confirmation_redirection', 'emailVerified'],
    ['email_reset_password', 'passwordReset'],
  ] as const;

  for (const [key, target] of redirectKeys) {
    const url = advanced[key]?.trim();

    if (!url) {
      continue;
    }

    if (ctx.isAllowedRedirect(url)) {
      redirects[target] = url;
    } else {
      skipped.push({
        key,
        reason: 'Its origin is not a trusted origin; add it to trustedOrigins and set it again',
      });
    }
  }

  if (ctx.defaultRoleDocumentId) {
    signUp.defaultRoles = [ctx.defaultRoleDocumentId];
  } else if (advanced.default_role && advanced.default_role !== BUILT_IN_DEFAULT_ROLE) {
    skipped.push({ key: 'default_role', reason: 'The role was not found' });
  }

  if (advanced.unique_email === false) {
    skipped.push({
      key: 'unique_email',
      reason: 'End-users always keeps one account per email address',
    });
  }

  return {
    patch: {
      ...(Object.keys(signUp).length > 0 ? { signUp } : {}),
      ...(Object.keys(redirects).length > 0 ? { redirects } : {}),
    },
    skipped,
  };
};
