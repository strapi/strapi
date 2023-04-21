import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Bullet = styled.div`
  margin-right: ${({ theme }) => theme.spaces[3]};
  width: ${6 / 16}rem;
  height: ${6 / 16}rem;
  border-radius: 50%;
  background: ${({ theme, backgroundColor }) => theme.colors[backgroundColor]};
`;

const Status = ({ variant }) => {
  const backgroundColor = `${variant}600`;

  return <Bullet backgroundColor={backgroundColor} />;
};

Status.defaultProps = {
  variant: 'primary',
};

Status.propTypes = {
  variant: PropTypes.oneOf([
    'alternative',
    'danger',
    'neutral',
    'primary',
    'secondary',
    'success',
    'warning',
  ]),
};

export default Status;
