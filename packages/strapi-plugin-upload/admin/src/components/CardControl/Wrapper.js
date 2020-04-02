/* eslint-disable indent */
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${({ small }) => (small ? '24px' : '30px')};
  height: ${({ small }) => (small ? '24px' : '30px')};
  margin-left: 5px;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  cursor: pointer;
  font-size: 11px;
  color: ${({ color }) => color};

  ${({ type }) =>
    type === 'link' &&
    `
    transform: rotate(90deg)
  `};

  &:hover {
    ${({ type }) => {
      if (type === 'trash-alt' || type === 'clear') {
        return `
          background-color: #FFA784;
          border: 1px solid #FFA784;
          color: #F64D0A;
        `;
      }

      if (type === 'plus') {
        return `
          background-color: #AED4FB;
          border: 1px solid  #AED4FB;
          > svg {
            > g, path {
              stroke: #007EFF;
            }
          }
          color: #007EFF;
        `;
      }

      return `
          background-color: #AED4FB;
          border: 1px solid  #AED4FB;
          > svg {
            > g, path {
              fill: #007EFF;
            }
          }
          color: #007EFF;

        `;
    }};
  }
`;

Wrapper.defaultProps = {
  color: '#b3b5b9',
  type: null,
  small: false,
};

Wrapper.propTypes = {
  color: PropTypes.string,
  small: PropTypes.bool,
  type: PropTypes.string,
  ...themePropTypes,
};

export default Wrapper;
