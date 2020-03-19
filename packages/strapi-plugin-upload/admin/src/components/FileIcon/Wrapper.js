import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  font-size: 54px;
  color: ${({ theme, icon }) => theme.main.colors.file[icon]};
`;

Wrapper.defaultProps = {
  icon: 'default',
};

Wrapper.propTypes = {
  icon: PropTypes.string,
  ...themePropTypes,
};

export default Wrapper;
