import styled, { css } from 'styled-components';

const NonRepeatableWrapper = styled.div`
  margin: 0 !important;
  padding: 0 20px !important;

  ${({ isEmpty }) => {
    if (isEmpty) {
      return css`
        position: relative;
        height: 108px;
        margin-bottom: 21px !important;
        background-color: #fafafb;
        text-align: center;
        cursor: pointer;
        border-radius: 2px;

        > div {
          position: absolute;
          top: 30px;
          left: calc(50% - 18px);
          height: 36px;
          width: 36px;
          line-height: 38px;
          border-radius: 50%;
          background-color: #f3f4f4;
          cursor: pointer;
          &:before {
            content: '\f067';
            font-family: FontAwesome;
            font-size: 15px;
            color: #b4b6ba;
          }
        }
        border: 1px solid transparent;

        &:hover {
          border: 1px solid #aed4fb;
          background-color: #e6f0fb;

          > p {
            color: #007eff;
          }

          > div {
            background-color: #aed4fb;
            &:before {
              content: '\f067';
              font-family: FontAwesome;
              font-size: 15px;
              color: #007eff;
            }
          }
        }
      `;
    }

    return css`
      padding-top: 21px !important;
      background-color: #f7f8f8;
      margin-bottom: 18px !important;
    `;
  }}
`;

export default NonRepeatableWrapper;
