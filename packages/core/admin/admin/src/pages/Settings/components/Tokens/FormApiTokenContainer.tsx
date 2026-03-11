import * as React from 'react';

import { Box, Field, Flex, Grid, TextInput, Typography } from '@strapi/design-system';
import { FormikErrors } from 'formik';
import { useIntl } from 'react-intl';

import { useAuth } from '../../../../features/Auth';

import { LifeSpanInput } from './LifeSpanInput';
import { TokenDescription } from './TokenDescription';
import { TokenName } from './TokenName';
import { TokenTypeSelect } from './TokenTypeSelect';

import type { AdminApiToken } from '../../../../../../shared/contracts/admin-token';
import type { ApiToken, ContentApiApiToken } from '../../../../../../shared/contracts/api-token';
import type { AdminUser } from '../../../../../../shared/contracts/shared';
import type { AuthContextValue } from '../../../../features/Auth';

interface FormApiTokenContainerProps {
  errors?: FormikErrors<Pick<ContentApiApiToken, 'name' | 'description' | 'lifespan' | 'type'>>;
  onChange: ({ target: { name, value } }: { target: { name: string; value: string } }) => void;
  canEditInputs: boolean;
  values?: Partial<Pick<ContentApiApiToken, 'name' | 'description' | 'lifespan' | 'type'>>;
  isCreating: boolean;
  apiToken?: null | Partial<ApiToken>;
  kind: 'admin' | 'content-api';
  onDispatch: React.Dispatch<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: any;
    value?: unknown;
  }>;
  setHasChangedPermissions: (hasChanged: boolean) => void;
}

const formatAdminUserName = (owner: AdminUser): string => {
  const full = [owner.firstname, owner.lastname].filter(Boolean).join(' ');
  return full || owner.username || owner.email || '';
};

export const FormApiTokenContainer = ({
  errors = {},
  onChange,
  canEditInputs,
  isCreating,
  values = {},
  apiToken = {},
  kind,
  onDispatch,
  setHasChangedPermissions,
}: FormApiTokenContainerProps) => {
  const { formatMessage } = useIntl();
  const currentUser = useAuth('FormApiTokenContainer', (state: AuthContextValue) => state.user);

  const ownerToDisplay = (() => {
    const owner =
      kind === 'admin'
        ? (apiToken as Partial<AdminApiToken> | null | undefined)?.adminUserOwner
        : undefined;
    if (owner === undefined || owner === null) return null;
    if (typeof owner !== 'object') return null;
    if (currentUser?.id !== undefined && owner.id === currentUser.id) return null;
    return owner;
  })();

  const handleChangeSelectApiTokenType = ({ target: { value } }: { target: { value: string } }) => {
    setHasChangedPermissions(false);

    if (value === 'full-access') {
      onDispatch({
        type: 'SELECT_ALL_ACTIONS',
      });
    }
    if (value === 'read-only') {
      onDispatch({
        type: 'ON_CHANGE_READ_ONLY',
      });
    }
  };

  const typeOptions = [
    {
      value: 'read-only',
      label: {
        id: 'Settings.tokens.types.read-only',
        defaultMessage: 'Read-only',
      },
    },
    {
      value: 'full-access',
      label: {
        id: 'Settings.tokens.types.full-access',
        defaultMessage: 'Full access',
      },
    },
    {
      value: 'custom',
      label: {
        id: 'Settings.tokens.types.custom',
        defaultMessage: 'Custom',
      },
    },
  ];

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: 'global.details',
            defaultMessage: 'Details',
          })}
        </Typography>
        <Grid.Root gap={5}>
          <Grid.Item key="name" m={6} xs={12} direction="column" alignItems="stretch">
            <TokenName
              error={errors['name']}
              value={values['name']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </Grid.Item>
          <Grid.Item key="description" m={6} xs={12} direction="column" alignItems="stretch">
            <TokenDescription
              error={errors['description']}
              value={values['description']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </Grid.Item>
          <Grid.Item key="lifespan" m={6} xs={12} direction="column" alignItems="stretch">
            <LifeSpanInput
              isCreating={isCreating}
              error={errors['lifespan']}
              value={values['lifespan']}
              onChange={onChange}
              token={apiToken}
            />
          </Grid.Item>

          {kind === 'content-api' && (
            <Grid.Item key="type" m={6} xs={12} direction="column" alignItems="stretch">
              <TokenTypeSelect
                value={values['type']}
                error={errors['type']}
                label={{
                  id: 'Settings.tokens.form.type',
                  defaultMessage: 'Token type',
                }}
                onChange={(value) => {
                  handleChangeSelectApiTokenType({ target: { value: String(value) } });

                  onChange({ target: { name: 'type', value: String(value) } });
                }}
                options={typeOptions}
                canEditInputs={canEditInputs}
              />
            </Grid.Item>
          )}
          {ownerToDisplay !== null && (
            <Grid.Item key="owner" m={6} xs={12} direction="column" alignItems="stretch">
              <Field.Root name="adminUserOwner">
                <Field.Label>
                  {formatMessage({
                    id: 'Settings.tokens.form.owner',
                    defaultMessage: 'Owner',
                  })}
                </Field.Label>
                <TextInput
                  type="text"
                  value={formatAdminUserName(ownerToDisplay)}
                  disabled
                  onChange={() => {}}
                />
              </Field.Root>
            </Grid.Item>
          )}
        </Grid.Root>
      </Flex>
    </Box>
  );
};
