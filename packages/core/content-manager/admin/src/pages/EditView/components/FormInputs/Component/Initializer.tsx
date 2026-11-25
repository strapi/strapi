import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';
import { Box, Flex, Menu, Typography } from '@strapi/design-system';
import { PlusCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslation } from '../../../../../utils/translations';

import { AddComponentMenuContent } from './AddComponentMenu';

interface InitializerProps {
  disabled?: boolean;
  name: string;
  onClick?: () => void;
  /**
   * When set, clicking the placeholder offers to start with an empty component or to copy
   * existing content, instead of adding an empty component right away.
   */
  onCopyClick?: () => void;
}

const Initializer = ({ disabled, name, onClick, onCopyClick }: InitializerProps) => {
  const { formatMessage } = useIntl();

  const field = useField(name);

  const content = (
    <Flex tag="span" direction="column" gap={2} alignItems="center">
      <Flex tag="span" justifyContent="center" color={disabled ? 'neutral500' : 'primary600'}>
        <PlusCircle width="3.2rem" height="3.2rem" />
      </Flex>
      <Typography
        tag="span"
        textColor={disabled ? 'neutral600' : 'primary600'}
        variant="pi"
        fontWeight="bold"
      >
        {formatMessage({
          id: getTranslation('components.empty-repeatable'),
          defaultMessage: 'No entry yet. Click to add one.',
        })}
      </Typography>
    </Flex>
  );

  if (onCopyClick) {
    return (
      <Menu.Root>
        <InitializerMenuTrigger disabled={disabled} endIcon={null} $hasError={!!field.error}>
          {content}
        </InitializerMenuTrigger>
        <AddComponentMenuContent kind="entry" onAddEmpty={() => onClick?.()} onCopy={onCopyClick} />
      </Menu.Root>
    );
  }

  return (
    <Box
      tag="button"
      background={disabled ? 'neutral150' : 'neutral100'}
      borderColor={field.error ? 'danger600' : 'neutral200'}
      hasRadius
      disabled={disabled}
      onClick={onClick}
      paddingTop={9}
      paddingBottom={9}
      type="button"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {content}
    </Box>
  );
};

/**
 * The menu trigger is a button of the design system, restyled as the placeholder box.
 */
const InitializerMenuTrigger = styled(Menu.Trigger)<{ $hasError?: boolean }>`
  && {
    width: 100%;
    height: auto;
    padding: ${({ theme }) => theme.spaces[9]} 0;
    border: 1px solid
      ${({ theme, $hasError }) => ($hasError ? theme.colors.danger600 : theme.colors.neutral200)};
    border-radius: ${({ theme }) => theme.borderRadius};
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &&:not([disabled]):hover,
  &&[data-state='open'] {
    border-color: ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};
  }

  &&[disabled] {
    background: ${({ theme }) => theme.colors.neutral150};
    cursor: not-allowed;
  }
`;

export { Initializer };
export type { InitializerProps };
