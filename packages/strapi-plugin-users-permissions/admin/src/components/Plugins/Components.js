import styled from 'styled-components';

const Wrapper = styled.div`
  margin: 0 -15px;
  padding: 0;
  .plugins-wrapper {
    padding-top: 1.8rem;
    width: 100%;
  }
`;

const Header = styled.div`
  padding: 0 28px;
  > div:first-child {
    margin-bottom: 2px;
    color: #333740;
    font-family: Lato;
    font-size: 1.8rem;
    font-weight: 600;
    line-height: 2.1rem;
  }
  > div:last-child {
    margin-top: 0rem;
    color: #787e8f;
    font-size: 1.2rem;
    line-height: 1.5rem;
  }
`;

const PluginsContainer = styled.div`
  padding-top: 2rem;
  > div {
    border-bottom: 1px solid white;
    &:last-child {
      border-bottom: none;
    }
  }
  > div:not(:first-child) {
    background: linear-gradient(
      315deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(227, 233, 243, 0.54) 100%
    );
    > div {
      line-height: 5.2rem;
    }
    > div:nth-child(2) {
      > div:first-child {
        min-height: 1.8rem;
        background: #ffffff;
      }
    }
  }
  &.pluginsGradient {
    > div:first-child {
      background: linear-gradient(
        315deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(227, 233, 243, 0.54) 100%
      ) !important;
    }
  }
`;

export { Header, PluginsContainer, Wrapper };
