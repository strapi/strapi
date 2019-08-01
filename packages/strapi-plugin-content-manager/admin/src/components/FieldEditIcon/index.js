import styled, { css } from 'styled-components';

import BlueIcon from '../../assets/images/icon-edit-blue.svg';

const FieldEditIcon = styled.span`
  width: 30px;
  float: right;
  background: #aed4fb;
  text-align: center;
  cursor: pointer;

  &:after {
    display: inline-block;
    content: '';
    width: 10px;
    height: 10px;
    margin: auto;
    background-image: url(${BlueIcon});
  }

  ${({ withLongerHeight }) => {
    if (withLongerHeight) {
      return css`
        height: 82px;
        line-height: 82px;
      `;
    }

    return css`
      height: 28px;
      &:after {
        margin-top: -3px;
      }
    `;
  }}
`;

export default FieldEditIcon;
