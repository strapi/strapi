import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { PlusCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useField } from '../../../../../components/Form';
import { getTranslation } from '../../../../../utils/translations';

interface InitializerProps {
  disabled?: boolean;
  name: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
}

const Initializer = ({ disabled, name, onClick }: InitializerProps) => {
  const { formatMessage } = useIntl();

  const field = useField(name);

  return (
    <>
      <Box
        as="button"
        background="neutral100"
        borderColor={field.error ? 'danger600' : 'neutral200'}
        hasRadius
        disabled={disabled}
        onClick={onClick}
        paddingTop={9}
        paddingBottom={9}
        type="button"
      >
        <Flex direction="column" gap={2}>
          <Flex justifyContent="center">
            <CircleIcon />
          </Flex>
          <Flex justifyContent="center">
            <Typography textColor="primary600" variant="pi" fontWeight="bold">
              {formatMessage({
                id: getTranslation('components.empty-repeatable'),
                defaultMessage: 'No entry yet. Click on the button below to add one.',
              })}
            </Typography>
          </Flex>
        </Flex>
      </Box>
      {field.error && (
        <Typography textColor="danger600" variant="pi">
          {field.error}
        </Typography>
      )}
    </>
  );
};

const CircleIcon = styled(PlusCircle)`
  width: ${pxToRem(24)};
  height: ${pxToRem(24)};
  > circle {
    fill: ${({ theme }) => theme.colors.primary200};
  }
  > path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

export { Initializer };
export type { InitializerProps };
