/* eslint-disable indent */
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${({ small }) => (small ? '25px' : '30px')};
  height: ${({ small }) => (small ? '25px' : '30px')};
  margin-left: 5px;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  cursor: pointer;
  font-size: ${({ small }) => (small ? '11px' : '13px')};
  color: ${({ color }) => color};

  ${({ type }) =>
    type === 'link' &&
    `
    transform: rotate(90deg)
  `};

  &:hover {
    ${({ type, theme, color }) => {
      if (type === 'plus') {
        return `
          background-color: ${theme.main.colors.darkBlue};
          border: 1px solid  ${theme.main.colors.darkBlue};
            > svg {
              > g, path {
                stroke: ${theme.main.colors.mediumBlue};
            }
          }
          color: ${theme.main.colors.mediumBlue};
        `;
      }

      if (type === 'check' || type === 'times') {
        return `
          background-color: ${color};
          border: 1px solid  ${color};
          > svg {
            > g, path {
              fill: ${theme.main.colors.white};
            }
          }
          color: ${theme.main.colors.white};
        `;
      }

      if (type === 'trash-alt') {
        return `
          background-color: #FFA784;
          border: 1px solid #FFA784;
          color: #F64D0A;
        `;
      }

      return `
          background-color: ${theme.main.colors.darkBlue};
          border: 1px solid  ${theme.main.colors.darkBlue};
          > svg {
            > g, path {
              fill: ${theme.main.colors.mediumBlue};
            }
          }
          color: ${theme.main.colors.mediumBlue};
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
