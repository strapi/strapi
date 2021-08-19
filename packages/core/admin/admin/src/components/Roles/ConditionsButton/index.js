import { Settings } from '@strapi/icons';
import { Button } from '@strapi/parts';
import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  margin-left: auto;
  padding-right: ${({ theme }) => theme.spaces[6]};

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
      border-radius: 20px;
      background: ${disabled ? theme.colors.neutral100 : theme.colors.primary600};
    }
  `}
`;

const ConditionsButton = ({ onClick, className, hasConditions }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper hasConditions={hasConditions} className={className}>
      <Button variant="secondary" startIcon={<Settings />} onClick={onClick}>
        {formatMessage({ id: 'app.components.LeftMenuLinkContainer.settings' })}
      </Button>
    </Wrapper>
  );
};

ConditionsButton.defaultProps = {
  className: null,
  hasConditions: false,
};
ConditionsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  hasConditions: PropTypes.bool,
};

// This is a styled component advanced usage :
// Used to make a ref to a non styled component.
// https://styled-components.com/docs/advanced#caveat
export default styled(ConditionsButton)``;
