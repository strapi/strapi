import * as React from 'react';

import { useIntl } from 'react-intl';

import { useGetPasswordPolicyQuery } from '../services/admin';
import {
  MINIMUM_PASSWORD_POLICY,
  createPasswordSchema,
  formatPasswordPolicyHint,
} from '../utils/passwordPolicy';

/**
 * The password policy configured in the admin settings, with the matching yup rules and the hint
 * to show under password inputs. Falls back to the minimum every policy requires while loading or
 * when the request fails, so the form never blocks a password the server would accept: the server
 * validates against the real policy anyway.
 */
const usePasswordPolicy = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, refetch } = useGetPasswordPolicyQuery();

  const policy = data?.policy ?? MINIMUM_PASSWORD_POLICY;

  const schema = React.useMemo(() => createPasswordSchema(policy), [policy]);
  const hint = React.useMemo(
    () => formatPasswordPolicyHint(policy, formatMessage),
    [policy, formatMessage]
  );

  // No hint until the policy is known: the fallback's would flash and understate the rules
  return { policy, schema, hint: isLoading ? undefined : hint, isLoading, refetch };
};

export { usePasswordPolicy };
