import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const FaIcon = styled(({ small, ...props }) => <FontAwesomeIcon {...props} />)`
  position: absolute;
  top: calc(50% - 0.9rem + 0.3rem);
  left: 1.6rem;
  margin-right: 1.2rem;
  margin-top: ${({ small }) => (small ? '.3rem' : null)};
  font-size: ${({ small }) => (small ? '.9rem' : '1.4rem')};
  width: 1.4rem;
  padding-bottom: 0.2rem;
  text-align: center;
`;

const LeftMenuIcon = ({ icon }) => <FaIcon small={icon === 'circle'} icon={icon} />;

LeftMenuIcon.propTypes = {
  icon: PropTypes.string,
};
LeftMenuIcon.defaultProps = {
  icon: 'circle',
};

export default LeftMenuIcon;
