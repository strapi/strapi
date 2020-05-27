import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { LayoutIcon } from 'strapi-helper-plugin';
import { Button as Base } from '@buffetjs/core';
import { useIntl } from 'react-intl';

const StyledButton = styled(Base)`
  padding-left: 15px;
  padding-right: 15px;
`;

const Button = ({ onClick, isTemporary }) => {
  const { formatMessage } = useIntl();
  const icon = <LayoutIcon className="colored" fill={isTemporary ? '#B4B6BA' : '#007eff'} />;
  const label = formatMessage({ id: 'content-type-builder.form.button.configure-view' });

  return (
    <StyledButton
      icon={icon}
      label={label}
      color="secondary"
      onClick={onClick}
      style={{ marginTop: '2px' }}
      disabled={isTemporary}
    />
  );
};

Button.defaultProps = {
  isTemporary: false,
  onClick: () => {},
};

Button.propTypes = {
  isTemporary: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Button;
