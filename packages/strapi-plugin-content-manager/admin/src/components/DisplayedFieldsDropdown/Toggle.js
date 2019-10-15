import { DropdownToggle } from 'reactstrap';
import styled from 'styled-components';

const Toggle = styled(DropdownToggle)`
  height: 30px;

  padding: 0 10px;

  &:focus {
    outline: 0;
  }

  &:active {
    border-color: #aed4fb !important;
  }

  &:hover {
    cursor: pointer;
  }

  ${({ isopen }) => {
    // Fix react warning
    if (isopen === 'true') {
      return `
        background: #e6f0fb;
        border: 1px solid #aed4fb !important;
        border-radius: 2px;
        border-bottom-right-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        border-top-right-radius: 2px !important;

        &:before {
          content: '\f013';
          font-family: FontAwesome;
          color: #007eff;
        }

        &:after {
          content: '\f0d7';
          display: inline-block;
          margin-top: -1px;
          margin-left: 10px;
          font-family: FontAwesome;
          color: #007eff;
          transform: rotateX(180deg);
          transition: transform 0.3s ease-out;
        }

        &:hover,
        :active,
        :focus {
          background: #e6f0fb;
          border: 1px solid #aed4fb;
        }
      `;
    }

    return `
      background: #ffffff !important;
      border: 1px solid #e3e9f3;
      border-radius: 2px !important;
      font-size: 1.4rem;

      &:before {
        content: '\f013';
        font-family: FontAwesome;
        color: #323740;
      }
      &:after {
        content: '\f0d7';
        display: inline-block;
        margin-top: -1px;
        margin-left: 10px;
        font-family: FontAwesome;
        color: #323740;
        transition: transform 0.3s ease-out;
      }
      &:hover,
      :focus,
      :active {
        background: #ffffff !important;
        border: 1px solid #e3e9f3;
      }
    `;
  }}
`;

export default Toggle;
