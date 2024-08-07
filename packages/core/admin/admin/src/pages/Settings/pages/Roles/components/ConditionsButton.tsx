import * as React from 'react';

import { Box, BoxComponent, Button, ButtonProps } from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

interface ConditionsButtonProps extends Pick<ButtonProps, 'className' | 'onClick' | 'variant'> {
  hasConditions?: boolean;
}

const ConditionsButtonImpl = React.forwardRef<HTMLButtonElement, ConditionsButtonProps>(
  ({ onClick, className, hasConditions = false, variant = 'tertiary' }, ref) => {
    const { formatMessage } = useIntl();

    return (
      <ButtonContainer $hasConditions={hasConditions} className={className}>
        <Button variant={variant} startIcon={<Cog />} onClick={onClick} ref={ref}>
          {formatMessage({
            id: 'global.settings',
            defaultMessage: 'Settings',
          })}
        </Button>
      </ButtonContainer>
    );
  }
);

const ButtonContainer = styled<BoxComponent>(Box)<{ $hasConditions?: boolean }>`
  ${({ $hasConditions, theme }) =>
    $hasConditions &&
    `
    &:before {
      content: '';
      position: absolute;
      top: -3px;
      left: -10px;
      width: 6px;
      height: 6px;
      border-radius: 2rem;
      background: ${theme.colors.primary600};
    }
  `}
`;

/**
 * We reference the component directly in other styled-components
 * and as such we need it to have a className already assigned.
 * Therefore we wrapped the implementation in a styled function.
 */
const ConditionsButton = styled(ConditionsButtonImpl)``;

export { ConditionsButton };
export type { ConditionsButtonProps };
