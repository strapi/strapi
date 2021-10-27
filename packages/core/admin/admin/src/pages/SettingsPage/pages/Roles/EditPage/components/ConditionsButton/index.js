import React from 'react';
import PropTypes from 'prop-types';
import Cog from '@strapi/icons/Cog';
import { Button } from '@strapi/design-system/Button';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;

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

const ConditionsButton = ({ onClick, className, hasConditions, variant }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper hasConditions={hasConditions} className={className}>
      <Button variant={variant} startIcon={<Cog />} onClick={onClick}>
        {formatMessage({
          id: 'app.components.LeftMenuLinkContainer.settings',
          defaultMessage: 'Settings',
        })}
      </Button>
    </Wrapper>
  );
};

ConditionsButton.defaultProps = {
  className: null,
  hasConditions: false,
  variant: 'tertiary',
};
ConditionsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  hasConditions: PropTypes.bool,
  variant: PropTypes.string,
};

// This is a styled component advanced usage :
// Used to make a ref to a non styled component.
// https://styled-components.com/docs/advanced#caveat
export default styled(ConditionsButton)``;
