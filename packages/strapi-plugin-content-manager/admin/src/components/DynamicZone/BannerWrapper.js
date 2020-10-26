import styled from 'styled-components';

/* eslint-disable */

const BannerWrapper = styled.button`
  display: flex;
  height: 36px;
  width: 100%;
  padding: 0 15px;
  border-bottom: 0;
  border: 1px solid rgba(227, 233, 243, 0.75);
  background-color: ${({ theme }) => theme.main.colors.white};
  font-size: ${({ theme }) => theme.main.sizes.fonts.md};
  font-weight: ${({ theme }) => theme.main.fontWeights.semiBold};
  cursor: pointer;

  &:focus {
    outline: 0;
  }

  .img-wrapper {
    width: 19px;
    height: 19px;
    margin-right: 19px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.main.colors.mediumGrey};
    text-align: center;
  }
  .label {
    text-transform: capitalize;
  }

  svg {
    path {
      fill: ${({ theme }) => theme.main.colors.leftMenu['link-color']} !important;
    }
  }

  -webkit-font-smoothing: antialiased;

  > div {
    align-self: center;
    margin-top: -2px;
  }

  ${({ isFirst, theme }) => {
    if (isFirst) {
      return `
        border-top-right-radius: ${theme.main.sizes.borderRadius};
        border-top-left-radius: ${theme.main.sizes.borderRadius};
      `;
    }
  }}

  ${({ isOpen, theme }) => {
    if (isOpen) {
      return `
        border: 1px solid ${theme.main.colors.darkBlue};
        background-color: ${theme.main.colors.lightBlue};
        color: ${theme.main.colors.mediumBlue};
        font-weight: ${theme.main.fontWeights.bold};

        .img-wrapper {
          background-color: ${theme.main.colors.darkBlue};
          transform: rotate(180deg);
        }

        svg {
        path {
            fill: ${theme.main.colors.mediumBlue} !important;
          }
        }
      `;
    }
  }}
`;

export default BannerWrapper;
