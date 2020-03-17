import styled from 'styled-components';

const ListWrapper = styled.div`
  max-height: 116px;

  > ul {
    margin: 0 -20px 0;
    padding: 0 20px !important;
    list-style: none !important;
    overflow: auto;
    max-height: 110px;
  }
`;

const ListShadow = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;
  height: 0px;

  &:after {
    position: absolute;
    top: -15px;
    left: -5px;
    content: '';
    display: inline-block;
    width: calc(100% + 10px);
    height: 1px;
    margin-bottom: -25px;
    box-shadow: 0px -2px 4px 0px rgba(227, 233, 243, 0.5);
  }
`;

const Li = styled.li`
  display: flex;
  flex-wrap: nowrap;
  align-content: center;
  justify-content: space-between;
  height: 18px;
  margin-top: 9px;
  &:last-of-type {
    margin-bottom: 0px;
  }
  &:active {
    .dragHandle {
      > span {
        background: #aed4fb;
      }
    }
  }

  .dragHandle {
    outline: none;
    text-decoration: none;
    margin-top: -1px;

    > span {
      vertical-align: middle;
      position: relative;
      display: inline-block;
      width: 6px;
      height: 1px;
      padding: 0px !important;
      background: #b3b5b9;
      overflow: visible !important;
      transition: background 0.25s ease-out;

      &:before,
      &:after {
        content: '';
        display: inline-block;
        width: 6px;
        height: 1px;
        background: inherit;
      }

      &:before {
        position: absolute;
        top: -2px;
        left: 0;
      }

      &:after {
        position: absolute;
        bottom: -2px;
        left: 0;
      }
    }
  }

  > div {
    width: 90%;
    > a {
      color: rgb(35, 56, 77);
    }
    > a:hover {
      text-decoration: none;
    }
    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &:first-of-type {
      display: flex;
      align-items: center;
      transition: color 0.25s ease-out;

      &:hover {
        .dragHandle {
          > span {
            background: #007eff;
          }
        }
        > a {
          color: #007eff;
        }
        color: #007eff;
      }

      span {
        &:last-of-type {
          padding-left: 10px;
        }
      }
    }

    &:last-of-type {
      display: inline-block;
      height: 100%;
      padding-right: 0px;
      line-height: 18px;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      img {
        display: inline-block;
        height: 14px;
      }
    }
  }
`;

export { ListShadow, ListWrapper, Li };
