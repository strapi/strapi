import styled, { css } from 'styled-components';

const Checked = styled.div`
  padding-top: 20px;
  line-height: 54px;
  position: relative;
  > div {
    height: 14px;
    width: 14px;
    margin-right: 10px;
    background-color: #2dd210;
    border: 1px solid rgba(16, 22, 34, 0.1);
    border-radius: 3px;
    &:after {
      content: '\f00c';
      position: absolute;
      top: 0;
      left: 2px;
      font-size: 10px;
      font-family: 'FontAwesome';
      font-weight: 100;
      color: #fff;
      transition: all 0.2s;
    }
  }
`;

const StyledLi = styled.li`
  height: 54px;
  background-color: #fff;
  padding-top: 5px;
  cursor: pointer;

  ${({ withCopyStyle }) => {
    if (withCopyStyle) {
      return css`
        background-color: #fafafb;

        > div {
          display: flex;
          width: 100%;
          justify-content: center;
          padding-top: 1px;
          text-align: center;
          color: #868fa1;
          font-size: 12px;
          font-weight: 500;
          line-height: 54px;
          text-transform: uppercase;
          letter-spacing: 0.05rem;
        }
      `;
    }

    return '';
  }}
`;

const Truncate = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  padding-left: 12px;
  padding-right: 12px;
  margin-left: 20px;
  margin-right: 20px;
  line-height: 48px;
  border-bottom: 1px solid rgba(14, 22, 34, 0.04);
  justify-content: space-between;

  > div:first-child {
    display: flex;
    width: 133px;
    > div:first-child {
      width: 51px;
    }
    > div:last-child {
      width: 82px;
    }
  }

  > div:nth-child(2) {
    width: calc(100% - 696px);
    padding-right: 20px;
  }
  > div:nth-child(3) {
    width: calc(100% - 596px);
  }
  > div:nth-child(4) {
    width: 184px;
    flex-shrink: 0;
    > span {
      &:after {
        content: '\f0d8';
        margin-left: 10px;
        font-family: 'FontAwesome';
      }
    }
  }
  > div:nth-child(5) {
    flex-shrink: 0;
    width: 100px;
  }
  > div:nth-child(6) {
    width: 147px;
    flex-shrink: 0;
  }
  > div:nth-child(7) {
    width: 116px;
    flex-shrink: 0;
  }
`;

export { Checked, StyledLi, Truncate, Wrapper };
