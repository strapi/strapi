import * as React from 'react';

import { useIntl } from 'react-intl';

import { useGetPasswordPolicyQuery } from '../services/admin';
import {
  DEFAULT_PASSWORD_POLICY,
  createPasswordSchema,
  formatPasswordPolicyHint,
} from '../utils/passwordPolicy';

/**
 * The password policy configured in the admin settings, with the matching yup rules and the hint
 * to show under password inputs. Falls back to the default policy while loading or when the
 * request fails: the server validates the password against the real policy anyway.
 */
const usePasswordPolicy = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useGetPasswordPolicyQuery();

  const policy = data ?? DEFAULT_PASSWORD_POLICY;

  const schema = React.useMemo(() => createPasswordSchema(policy), [policy]);
  const hint = React.useMemo(
    () => formatPasswordPolicyHint(policy, formatMessage),
    [policy, formatMessage]
  );

  return { policy, schema, hint, isLoading };
};

export { usePasswordPolicy };
