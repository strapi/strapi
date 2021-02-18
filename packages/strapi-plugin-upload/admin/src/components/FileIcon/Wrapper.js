import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  font-size: 54px;
  color: ${({ theme, colored }) =>
    colored ? theme.main.colors.lightOrange : theme.main.colors.grey};
`;

Wrapper.defaultProps = {
  colored: false,
};

Wrapper.propTypes = {
  colored: PropTypes.bool,
  ...themePropTypes,
};

export default Wrapper;
