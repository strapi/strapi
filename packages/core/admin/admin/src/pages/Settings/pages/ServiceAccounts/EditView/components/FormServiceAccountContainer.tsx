import * as React from 'react';

import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { LifeSpanInput } from '../../../../components/Tokens/LifeSpanInput';
import { TokenDescription } from '../../../../components/Tokens/TokenDescription';
import { TokenName } from '../../../../components/Tokens/TokenName';

import type { ServiceAccountToken } from '../../../../../../../../shared/contracts/service-account';

interface FormServiceAccountContainerProps {
  errors?: Record<string, string | undefined>;
  onChange: ({ target: { name, value } }: { target: { name: string; value: string } }) => void;
  canEditInputs: boolean;
  values?: Partial<Pick<ServiceAccountToken, 'name' | 'description' | 'lifespan'>>;
  isCreating: boolean;
  serviceAccount?: null | Partial<ServiceAccountToken>;
}

export const FormServiceAccountContainer = ({
  errors = {},
  onChange,
  canEditInputs,
  isCreating,
  values = {},
  serviceAccount = {},
}: FormServiceAccountContainerProps) => {
  const { formatMessage } = useIntl();

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
              token={serviceAccount}
            />
          </Grid.Item>
        </Grid.Root>
      </Flex>
    </Box>
  );
};

