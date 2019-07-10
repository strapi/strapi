import styled, { css } from 'styled-components';
import { Button } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  padding-top: 18px;
`;

const AddFilterCta = styled(Button)`
  display: flex;
  height: 30px;
  margin-right: 10px;
  padding: 0 10px;
  text-align: center;
  background-color: #FFFFFF;
  border: 1px solid #E3E9F3;
  border-radius: 2px;
  line-height: 28px;
  font-size: 13px;
  font-weight: 500;
  font-family: Lato;
  -webkit-font-smoothing-antialiased;
  cursor: pointer;
  &:hover {
    background: #F7F8F8;
  }
  &:focus, &:active {
    outline:0;
  }
  > span {
    margin-left: 10px;
  }
`;

const Img = styled.img`
  height: 7px;
  margin: auto;
  margin-right: 0px;
  font-size: 12px;
`;

const DropDownWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  font-family: Lato;
  margin-top: -2px;
  -webkit-font-smoothing: antialiased;

  > div {
    height: 30px;

    > button {
      padding: 0 10px;

      &:hover {
        cursor: pointer;
      }

      ${({ isOpen }) => {
        if (isOpen) {
          return css`
            background: #e6f0fb;
            border: 1px solid #aed4fb !important;
            border-radius: 2px;
            border-bottom-right-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
            border-top-right-radius: 2px !important;

            &:before {
              content: '\f0db';
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

        return css`
          background: #ffffff !important;
          border: 1px solid #e3e9f3;
          border-radius: 2px !important;

          &:before {
            content: '\f0db';
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
    }

    button {
      &:focus {
        outline: 0;
      }
    }

    > div {
      min-width: 230px;
      top: 28px !important;
      left: 53px !important;
      padding-top: 8px;
      padding-bottom: 5px !important;
      border-top-right-radius: 0;
      border: 1px solid #e3e9f3;
      box-shadow: 0px 2px 4px rgba(227, 233, 243, 0.5);

      ${({ isOpen }) => {
        if (isOpen) {
          return css`
            border-top-color: #aed4fb !important;
            border-top-right-radius: 0;
          `;
        }
      }}

      > button {
        &:active,
        :focus {
          background-color: #f7f7f9 !important;
          color: #333740;
          font-weight: 500;
        }

        &:hover {
          cursor: pointer;
        }

        &:not(:first-child) {
          padding: 0;
        }

        &:first-of-type {
          margin-top: 2px;
        }

        &:first-child {
          margin-bottom: 2px;
          font-weight: 600;
          font-size: 1.3rem;

          &:hover {
            background-color: #ffffff !important;
          }
          > div {
            > span:last-child {
              color: #007eff;
              font-weight: 400;
              cursor: pointer;
            }
          }
        }

        label {
          width: 100%;
          outline: none;
        }
      }
    }
  }
`;

const FooterWrapper = styled.div`
  margin-top: 2.5rem;
  // > div {
  //   padding: 0;
  // }
`;

const Label = styled.label`
  display: inline-block;
  height: 32px;
  margin-left: 10px;
  line-height: 32px;
  color: #787e8f;
  font-size: 13px;
  font-style: italic;
`;

const SelectWrapper = styled.div`
  display: flex;

  // > select {
  //   width: 75px !important;
  //   height: 3.2rem !important;
  //   padding-top: 0rem;
  //   padding-left: 1rem;
  //   padding-right: 3rem;
  //   background-position: right -1px center;
  //   background-repeat: no-repeat;
  //   background-image: url('../../assets/images/background_input.svg');
  //   border: 1px solid #e3e9f3;
  //   border-radius: 0.25rem;
  //   line-height: 29px;
  //   font-size: 1.3rem;
  //   font-family: 'Lato' !important;
  //   -moz-appearance: none;
  //   -webkit-appearance: none;
  // }
`;

export {
  AddFilterCta,
  DropDownWrapper,
  FooterWrapper,
  Img,
  Label,
  SelectWrapper,
  Wrapper,
};
