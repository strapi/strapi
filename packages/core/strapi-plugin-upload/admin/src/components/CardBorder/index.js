import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const CardBorder = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  ${({ shown }) => shown && 'display: block;'}
  border: 2px solid ${({ theme, color }) => theme.main.colors[color] || color};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
`;

CardBorder.defaultProps = {
  color: 'mediumBlue',
  shown: false,
};

CardBorder.propTypes = {
  color: PropTypes.string,
  shown: PropTypes.bool,
  ...themePropTypes,
};

export default CardBorder;
