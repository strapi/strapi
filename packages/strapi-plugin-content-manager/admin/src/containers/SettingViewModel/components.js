import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  > div:first-child {
    height: 30px;
    width: 20px;
    margin-right: 10px;
    text-align: right;
    line-height: 30px;
  }
  > div:last-child {
    flex-grow: 2;
  }
`;

const Field = styled.div`
  position: relative;
  height: 30px;
  width: 100%;

  ${({ isDragging }) => {
    if (!isDragging) {
      return css`
        padding-left: 10px;
        background: #fafafb;
        line-height: 28px;
        color: #333740;
        font-size: 13px;
        border: 1px solid #e3e9f3;
        border-radius: 2px;
        &:hover {
          cursor: move;
        }
        > img {
          max-width: 8px;
          margin-right: 10px;
          margin-top: -1px;
        }

        ${({ isSelected }) => {
          if (isSelected) {
            return css`
              background: #e6f0fb !important;
              border: 1px solid #aed4fb !important;
              color: #007eff;
              font-weight: 500;
            `;
          }
        }}
      `;
    }
  }}
`;

const InfoLabel = styled.div`
  position: absolute;
  top: 0;
  right: 40px;
  max-width: 90px;
  text-overflow: ellipsis;
  overflow: hidden;

  font-weight: 400;
  color: #007eff;
`;

export { Wrapper, Field, InfoLabel };
