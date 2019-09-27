import styled, { css } from 'styled-components';
import { Button } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  height: 54px;
  display: flex;
  line-height: 53px;
  margin: 0 28px 0 36px;
  justify-content: space-between;
  border-bottom: 1px solid rgba(14, 22, 34, 0.04);
  font-size: 13px;
  color: #333740;
  > div:first-child {
    flex: 0 0 70px;
    font-weight: 500;
  }
  > div:nth-child(2) {
    flex: 0 0 160px;
    text-align: left;
    font-weight: 500 !important;
  }
  > div:last-child {
    flex: 0 0 400px;
    align-self: center;
    text-align: right;
  }
  -webkit-font-smoothing: antialiased;
`;

const StyledButton = styled(Button)`
  height: 26px;
  margin: 0;
  padding: 0 15px;
  line-height: initial;
  font-size: 13px;
  font-weight: 500;
  ${({ type }) => {
    if (type === 'openDocumentation') {
      return css`
        margin-right: 10px;
        border: 1px solid #dfe0e1;
        &:before {
          margin-right: 10px;
          content: '\f08e';
          font-family: 'FontAwesome';
          font-size: 10px;
        }
      `;
    } else if (type === 'generateDocumentation') {
      return css`
        background: #e6f0fb;
        border: 1px solid #aed4fb;
        color: #007eff;
        &:before {
          margin-right: 10px;
          content: '\f021';
          font-family: 'FontAwesome';
          font-size: 10px;
        }
      `;
    } else if (type === 'trash') {
      return css`
        margin-left: 25px;
        font-weight: 400;
        &:before {
          margin-right: 10px;
          content: '\f1f8';
          font-family: 'FontAwesome';
          font-size: 12 px;
        }
      `;
    } else {
      return css`
        margin-left: 45px;
        font-weight: 400;
      `;
    }
  }}
`;

export { Wrapper, StyledButton };
