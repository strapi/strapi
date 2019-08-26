import styled, { css } from 'styled-components';

const InfoLabel = styled.div`
  position: absolute;
  top: 0;
  right: 40px;
  max-width: 80px;

  text-overflow: ellipsis;
  overflow: hidden;
  font-weight: 400;
  color: #007eff;
`;

const Link = styled.div`
position: absolute;
bottom: 0
font-weight: 400;
color: #007eff;
cursor: pointer;
&:before {
  content: '\f013';
  margin-right: 7px;
  font-family: 'FontAwesome';
  font-size: 12px;
}
`;

const Carret = styled.div`
  position: absolute;
  ${({ right }) => {
    if (right) {
      return css`
        right: -5px;
      `;
    }

    return css`
      left: -1px;
    `;
  }}
  height: 30px;
  width: 2px;
  margin-right: 3px;
  border-radius: 2px;
  background: #007eff;
`;

const NameWrapper = styled.div`
  position: relative;
  height: 30px;
  width: 100%;

  display: flex;
  padding-left: 10px;
  justify-content: space-between;
  > div {
    width: calc(100% - 30px);
  }
  .name {
    display: inline-block;
    width: calc(100% - 18px);
    vertical-align: top;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  img {
    user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-drag: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }

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
          vertical-align: tom;
          max-width: 8px;
          margin-right: 10px;
          margin-top: 11px;
        }
      `;
    }
  }}
  ${({ isEditing, isSelected }) => {
    if (isEditing || isSelected) {
      return css`
        color: #007eff;
        background: #e6f0fb;
        border: 1px solid #aed4fb;
      `;
    }
  }};
`;

const Wrapper = styled.div`
  display: flex;
  position: relative;
  .sub_wrapper {
    width: 100%;
    padding: 0 5px;
  }
`;

export { Carret, InfoLabel, Link, NameWrapper, Wrapper };
