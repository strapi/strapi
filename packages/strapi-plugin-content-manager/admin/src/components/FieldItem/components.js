import styled, { css } from 'styled-components';

const Carret = styled.div`
  position: absolute;
  ${({ right }) => {
    if (right) {
      return css`
        right: -4px;
      `;
    }

    return css`
      left: -1px;
    `;
  }}
  height: 30px;
  margin-right: 3px;
  width: 2px;
  border-radius: 2px;
  background: #007eff;
`;

const FullWidthCarret = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 30px;
  width: 100%;
  padding: 0 10px;
  margin-bottom: 6px;
  border-radius: 2px;
  > div {
    background: #007eff;
    height: 2px;
    width: 100%;
  }
`;

const NameWrapper = styled.div`
  position: relative;
  height: 30px;
  width: 100%;

  display: flex;
  padding-left: 10px;
  justify-content: space-between;

  ${({ isHidden }) => {
    if (!isHidden) {
      return css`
        background: #fafafb;
        line-height: 28px;
        color: #333740;
        border: 1px solid #e3e9f3;
        border-radius: 2px;
        &:hover {
          cursor: move;
        }
        > img {
          align-self: flex-start;
          vertical-align: top;
          max-width: 8px;
          margin-right: 10px;
          margin-top: 11px;
        }
      `;
    }
  }}

  ${({ isEditing }) => {
    if (isEditing) {
      return css`
        background: #e6f0fb;
        border: 1px solid #aed4fb;
      `;
    }
  }}
`;

const Wrapper = styled.div`
  display: flex;
  position: relative;
  .sub_wrapper {
    width: 100%;
    padding: 0 10px;
  }
`;

export { Carret, FullWidthCarret, NameWrapper, Wrapper };
