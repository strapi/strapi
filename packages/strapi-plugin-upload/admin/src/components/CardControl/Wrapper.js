import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  margin-right: 5px;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid #e3e9f3;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  cursor: pointer;
  font-size: 11px;
  color: ${({ color }) => color};
`;

Wrapper.defaultProps = {
  color: '#b3b5b9',
};

Wrapper.propTypes = {
  color: PropTypes.string,
  ...themePropTypes,
};

export default Wrapper;
