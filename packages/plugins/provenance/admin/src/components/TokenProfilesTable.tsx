import * as React from 'react';

import {
  isFetchError,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Loader,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { PERMISSIONS, PLUGIN_ID } from '../constants';
import { getTranslation } from '../utils/translations';

import type { TokenProfile, TokenWithProfile } from '../constants';

const UNSPECIFIED = 'unspecified';

const PROFILE_OPTIONS: Array<{ value: TokenProfile | typeof UNSPECIFIED; label: string }> = [
  { value: UNSPECIFIED, label: 'Unspecified' },
  { value: 'agent', label: 'AI agent' },
  { value: 'integration', label: 'Classic integration' },
  { value: 'mixed', label: 'Mixed' },
];

/**
 * Content API tokens with the profile that decides how their writes are recorded. Saved on change,
 * since each row is independent.
 */
export const TokenProfilesTable = () => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canRead, canUpdate },
  } = useRBAC({ read: PERMISSIONS.readTokens, update: PERMISSIONS.updateTokens });

  const [tokens, setTokens] = React.useState<TokenWithProfile[] | null>(null);

  React.useEffect(() => {
    if (!canRead) {
      return;
    }

    get<{ data: TokenWithProfile[] }>(`/${PLUGIN_ID}/tokens`)
      .then(({ data }) => setTokens(data.data))
      .catch(() => setTokens([]));
  }, [get, canRead]);

  const updateProfile = async (token: TokenWithProfile, value: string) => {
    const profile = value === UNSPECIFIED ? null : (value as TokenProfile);

    try {
      await put(`/${PLUGIN_ID}/tokens/${token.id}`, { profile });
      setTokens((current) =>
        (current ?? []).map((item) => (item.id === token.id ? { ...item, profile } : item))
      );
      toggleNotification({
        type: 'success',
        message: formatMessage({ id: getTranslation('tokens.saved'), defaultMessage: 'Saved' }),
      });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: isFetchError(err) ? formatAPIError(err) : String(err),
      });
    }
  };

  if (isLoadingPermissions) {
    return <Loader small />;
  }

  if (!canRead) {
    return (
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: getTranslation('tokens.forbidden'),
          defaultMessage: 'You need the permission to read API tokens to qualify them.',
        })}
      </Typography>
    );
  }

  if (tokens === null) {
    return <Loader small />;
  }

  if (tokens.length === 0) {
    return (
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({ id: getTranslation('tokens.empty'), defaultMessage: 'No API tokens yet' })}
      </Typography>
    );
  }

  return (
    <Table colCount={2} rowCount={tokens.length + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {formatMessage({ id: getTranslation('tokens.name'), defaultMessage: 'Name' })}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma">
              {formatMessage({ id: getTranslation('tokens.profile'), defaultMessage: 'Writes as' })}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {tokens.map((token) => (
          <Tr key={token.id}>
            <Td>
              <Typography textColor="neutral800" fontWeight="semiBold">
                {token.name}
              </Typography>
              {token.description ? (
                <Typography variant="pi" textColor="neutral600" tag="p">
                  {token.description}
                </Typography>
              ) : null}
            </Td>
            <Td>
              <SingleSelect
                aria-label={formatMessage(
                  {
                    id: getTranslation('tokens.profile.aria'),
                    defaultMessage: 'Profile of {name}',
                  },
                  { name: token.name }
                )}
                value={token.profile ?? UNSPECIFIED}
                disabled={!canUpdate}
                onChange={(value) => updateProfile(token, String(value))}
              >
                {PROFILE_OPTIONS.map((option) => (
                  <SingleSelectOption key={option.value} value={option.value}>
                    {formatMessage({
                      id: getTranslation(`tokens.profile.${option.value}`),
                      defaultMessage: option.label,
                    })}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
