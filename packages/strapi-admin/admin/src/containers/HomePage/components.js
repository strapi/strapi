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
  margin-top: 16px;
  padding-right: 20px;

  border-radius: 3px;

  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 34px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;

  &:before {
    content: '\f105';
    font-size: 18px;
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

  ${({ type }) => {
    if (type === 'documentation') {
      return css`
        padding-left: 20px;
        color: #ffffff;
        background-color: #005fea;
        &:hover {
          color: #ffffff;
        }
      `;
    } else if (type === 'blog') {
      return css`
        padding-left: 20px;
        background-color: #333740;
        color: #ffffff;
        &:hover {
          color: #ffffff;
        }
      `;
    } else {
      return css`
        color: #005fea;
        &:hover {
          color: #005fea;
        }
      `;
    }
  }}
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
    position: absolute;
    left: 30px;
    top: 38px;


    font-family: 'FontAwesome';
    font-size: 38px;
  }

  > p {
    margin: 0;
    font-size: 16px;
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
  height: 54px;
  font-size: 14px;
  font-weight: 500;
  position: relative;
  a {
    width: 100%;
    color: #333740 !important;
    text-decoration: none;
    line-height: 18px;

    div {
      display: inline-block;
      height: 25px;
      width: 25px;
      text-align: center;
      vertical-align: top;
    }

    img {
      max-height: 25px;
      max-width: 25px;
    }
    span {
      margin-left: 11px;
      width: calc(100% - 40px);
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
