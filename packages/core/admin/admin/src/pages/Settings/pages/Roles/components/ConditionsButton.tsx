import { Box, Button, ButtonProps } from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

interface ConditionsButtonProps extends Pick<ButtonProps, 'className' | 'onClick' | 'variant'> {
  hasConditions?: boolean;
}

const ConditionsButtonImpl = ({
  onClick,
  className,
  hasConditions = false,
  variant = 'tertiary',
}: ConditionsButtonProps) => {
  const { formatMessage } = useIntl();

  return (
    <ButtonContainer hasConditions={hasConditions} className={className}>
      <Button variant={variant} startIcon={<Cog />} onClick={onClick}>
        {formatMessage({
          id: 'global.settings',
          defaultMessage: 'Settings',
        })}
      </Button>
    </ButtonContainer>
  );
};

interface ButtonContainerProps extends Pick<ConditionsButtonProps, 'hasConditions'> {
  disabled?: boolean;
}

const ButtonContainer = styled(Box)<ButtonContainerProps>`
  ${({ hasConditions, disabled, theme }) =>
    hasConditions &&
    `
    &:before {
      content: '';
      position: absolute;
      top: -3px;
      left: -10px;
      width: 6px;
      height: 6px;
      border-radius: ${20 / 16}rem;;
      background: ${disabled ? theme.colors.neutral100 : theme.colors.primary600};
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
