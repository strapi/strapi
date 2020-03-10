import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Border = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  border: 2px solid ${({ theme, color }) => theme.main.colors[color] || color};

  ${({ shown }) =>
    shown &&
    `
    display: block;
  `}
`;

Border.defaultProps = {
  color: 'mediumBlue',
  shown: false,
};

Border.propTypes = {
  color: PropTypes.string,
  shown: PropTypes.bool,
  ...themePropTypes,
};

export default Border;
