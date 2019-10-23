import styled, { css } from 'styled-components';

const Block = styled.div`
  width: 100%;
  position: relative;
  margin-bottom: 34px;
  background: #ffffff;
  padding: 19px 30px 30px 30px;
  box-shadow: 0 2px 4px 0 #e3e9f3;
  border-radius: 3px;
  line-heigth: 18px;

  a {
    position: relative;
    text-decoration: none;

    &:hover::after {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      border-radius: 0.3rem;
      content: '';
      opacity: 0.1;
      background: #ffffff;
    }
  }
  h2,
  p {
    line-height: 18px;
  }
  h2 {
    display: inline-block;
  }
  #mainHeader {
    &:after {
      content: '';
      width: 100%;
      height: 3px;
      margin-top: 4px;
      display: block;
      background: #f0b41e;
    }
  }

  .social-wrapper {
    span {
      display: inline-block;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    > div:nth-child(2n) {
      padding-right: 0;
    }
  }
`;

const Container = styled.div`
  padding: 47px 13px 0 13px;
  > div {
    margin: 0;
  }
`;

const P = styled.p`
  max-width: 550px;
  padding-top: 10px;
  padding-right: 30px;
  color: #5c5f66;
  font-size: 14px;
  b {
    font-weight: 600;
  }
`;

const Wave = styled.div`
  &:before {
    content: '👋';
    position: absolute;
    top: 24px;
    right: 30px;
    font-size: 50px;
  }
`;

const ALink = styled.a`
  display: inline-block;
  position: relative;
  height: 34px;
  padding-right: 20px;
  border-radius: 3px;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 34px;
  font-size: 13px;

  &:before {
    content: '\f105';

    font-weight: 600;
    margin-right: 10px;
    font-family: 'FontAwesome';
  }

  &:hover,
  focus,
  active {
    text-decoration: none;
    outline: 0;
  }

  &:hover::after {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border-radius: 0.3rem;
    content: '';
    opacity: 0.1;
    background: #ffffff;
  }

  ${({ type }) =>
    type === 'blog' || type === 'documentation'
      ? css`
          padding-left: 20px;
          margin-top: 16px;
          color: #ffffff;
          text-transform: uppercase;
          font-size: 13px;
          font-weight: 500;
          &:before {
            font-size: 16px;
          }
          &:hover {
            color: #ffffff;
          }
        `
      : css`
          margin-top: 9px;
          font-size: 14px;
          color: #005fea;
          &:before {
            font-size: 12px;
          }
          &:hover {
            color: #005fea;
          }
        `}

  ${({ type }) =>
    type === 'blog' &&
    css`
      background-color: #333740;
    `}

  ${({ type }) =>
    type === 'documentation' &&
    css`
      background-color: #005fea;
    `}
`;

const Separator = styled.div`
  height: 2px;
  background-color: #f7f8f8;
`;

const LinkWrapper = styled.a`
  width: calc(50% - 6px);
  position: relative;
  padding: 21px 30px;
  padding-left: 95px;
  height: auto;
  line-height: 18px;
  background-color: #f7f8f8;

  &:hover,
  focus,
  active {
    text-decoration: none;
    outline: 0;
  }

  &:before {
    position: absolute;
    left: 30px;
    top: 38px;
    font-family: 'FontAwesome';
    font-size: 38px;

    ${({ type }) => {
      if (type === 'doc') {
        return css`
          content: '\f02d';
          color: #42b88e;
        `;
      }

      return css`
        content: '\f121';
        color: #f0811e;
      `;
    }}
  }

  > p {
    margin: 0;
    font-size: 13px;
    &:first-child {
      font-size: 16px;
    }
    color: #919BAE;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .bold {
    color: #333740
    font-weight: 600;
  }
`;

const SocialLinkWrapper = styled.div`
  position: relative;
  height: 24px;
  margin-bottom: 30px;
  font-size: 14px;
  font-weight: 500;
  a {
    display: block;
    width: 100%;
    height: 100%;
    color: #333740 !important;
    text-decoration: none;
    line-height: 18px;
    img,
    span {
      display: inline-block;
      vertical-align: middle;
    }
    img {
      height: 24px;
      width: 24px;
      object-fit: contain;
    }
    span {
      width: calc(100% - 24px);
      padding-left: 11px;
      font-weight: 600;
    }
    &:hover {
      text-decoration: none;
    }
  }
`;

export {
  ALink,
  Block,
  Container,
  LinkWrapper,
  P,
  Separator,
  SocialLinkWrapper,
  Wave,
};
