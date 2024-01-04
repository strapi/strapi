import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { TranslationMessage, pxToRem } from '@strapi/helper-plugin';
import { PlusCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTranslation } from '../utils/translations';

interface ComponentInitializerProps {
  error?: TranslationMessage;
  isReadOnly?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
}

const ComponentInitializer = ({ error, isReadOnly, onClick }: ComponentInitializerProps) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Box
        as="button"
        background="neutral100"
        borderColor={error ? 'danger600' : 'neutral200'}
        disabled={isReadOnly}
        hasRadius
        onClick={onClick}
        paddingTop={9}
        paddingBottom={9}
        type="button"
      >
        <Flex direction="column" gap={2}>
          <Flex justifyContent="center" style={{ cursor: isReadOnly ? 'not-allowed' : 'inherit' }}>
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
      {error?.id && (
        <Typography textColor="danger600" variant="pi">
          {formatMessage(error, { ...error.values })}
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

export { ComponentInitializer };
export type { ComponentInitializerProps };
