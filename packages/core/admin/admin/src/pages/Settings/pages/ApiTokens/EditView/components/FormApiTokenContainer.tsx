import * as React from 'react';

import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { FormikErrors } from 'formik';
import { useIntl } from 'react-intl';

import { LifeSpanInput } from '../../../../components/Tokens/LifeSpanInput';
import { TokenDescription } from '../../../../components/Tokens/TokenDescription';
import { TokenName } from '../../../../components/Tokens/TokenName';
import { TokenTypeSelect } from '../../../../components/Tokens/TokenTypeSelect';

import type { ApiToken } from '../../../../../../../../shared/contracts/api-token';

interface FormApiTokenContainerProps {
  errors?: FormikErrors<Pick<ApiToken, 'name' | 'description' | 'lifespan' | 'type'>>;
  onChange: ({ target: { name, value } }: { target: { name: string; value: string } }) => void;
  canEditInputs: boolean;
  values?: Partial<Pick<ApiToken, 'name' | 'description' | 'lifespan' | 'type'>>;
  isCreating: boolean;
  apiToken?: null | Partial<ApiToken>;
  onDispatch: React.Dispatch<any>;
  setHasChangedPermissions: (hasChanged: boolean) => void;
}

export const FormApiTokenContainer = ({
  errors = {},
  onChange,
  canEditInputs,
  isCreating,
  values = {},
  apiToken = {},
  onDispatch,
  setHasChangedPermissions,
}: FormApiTokenContainerProps) => {
  const { formatMessage } = useIntl();

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
          <Grid.Item key="name" col={6} xs={12} direction="column" alignItems="stretch">
            <TokenName
              error={errors['name']}
              value={values['name']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </Grid.Item>
          <Grid.Item key="description" col={6} xs={12} direction="column" alignItems="stretch">
            <TokenDescription
              error={errors['description']}
              value={values['description']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </Grid.Item>
          <Grid.Item key="lifespan" col={6} xs={12} direction="column" alignItems="stretch">
            <LifeSpanInput
              isCreating={isCreating}
              error={errors['lifespan']}
              value={values['lifespan']}
              onChange={onChange}
              token={apiToken}
            />
          </Grid.Item>

          <Grid.Item key="type" col={6} xs={12} direction="column" alignItems="stretch">
            <TokenTypeSelect
              value={values['type']}
              error={errors['type']}
              label={{
                id: 'Settings.tokens.form.type',
                defaultMessage: 'Token type',
              }}
              onChange={(value) => {
                // @ts-expect-error – DS Select supports numbers & strings, will be removed in V2
                handleChangeSelectApiTokenType({ target: { value } });

                // @ts-expect-error – DS Select supports numbers & strings, will be removed in V2
                onChange({ target: { name: 'type', value } });
              }}
              options={typeOptions}
              canEditInputs={canEditInputs}
            />
          </Grid.Item>
        </Grid.Root>
      </Flex>
    </Box>
  );
};
