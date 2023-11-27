import * as React from 'react';

import { Box, Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import { FormikErrors } from 'formik';
import { useIntl } from 'react-intl';

// @ts-expect-error not converted yet
import LifeSpanInput from '../../../../components/Tokens/LifeSpanInput';
// @ts-expect-error not converted yet
import TokenDescription from '../../../../components/Tokens/TokenDescription';
// @ts-expect-error not converted yet
import TokenName from '../../../../components/Tokens/TokenName';
// @ts-expect-error not converted yet
import TokenTypeSelect from '../../../../components/Tokens/TokenTypeSelect';

type TokenType = 'full-access' | 'read-only' | 'custom';

import type { ApiToken } from '../../../../../../../../shared/contracts/api-token';

interface FormApiTokenContainerProps {
  errors?: FormikErrors<Pick<ApiToken, 'name' | 'description' | 'lifespan' | 'type'>>;
  onChange: ({ target: { name, value } }: { target: { name: string; value: TokenType } }) => void;
  canEditInputs: boolean;
  values: undefined | Partial<Pick<ApiToken, 'name' | 'description' | 'lifespan' | 'type'>>;
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
  values,
  apiToken = {},
  onDispatch,
  setHasChangedPermissions,
}: FormApiTokenContainerProps) => {
  const { formatMessage } = useIntl();

  const handleChangeSelectApiTokenType = ({
    target: { value },
  }: {
    target: { value: TokenType };
  }) => {
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
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.details',
            defaultMessage: 'Details',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem key="name" col={6} xs={12}>
            <TokenName
              errors={errors}
              values={values}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="description" col={6} xs={12}>
            <TokenDescription
              errors={errors}
              values={values}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="lifespan" col={6} xs={12}>
            <LifeSpanInput
              isCreating={isCreating}
              errors={errors}
              values={values}
              onChange={onChange}
              token={apiToken}
            />
          </GridItem>

          <GridItem key="type" col={6} xs={12}>
            <TokenTypeSelect
              values={values}
              errors={errors}
              label={{
                id: 'Settings.tokens.form.type',
                defaultMessage: 'Token type',
              }}
              onChange={(value: TokenType) => {
                handleChangeSelectApiTokenType({ target: { value } });
                onChange({ target: { name: 'type', value } });
              }}
              options={typeOptions}
              canEditInputs={canEditInputs}
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};
