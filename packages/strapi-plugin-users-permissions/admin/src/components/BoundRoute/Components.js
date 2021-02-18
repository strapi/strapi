import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  display: flex;
  min-height: 2.4rem;
  border-radius: 3px;
  background-color: #e9eaeb;
  line-height: 2.4rem;
`;

const Header = styled.div`
  margin-bottom: 3rem;
  padding-top: 1.2rem;
  color: #333740;
  font-size: 18px;
  font-weight: ${({ theme }) => theme.main.fontWeights.bold};

  > span:not(:first-child) {
    color: #787e8f;
    font-size: 16px;
    font-weight: ${({ theme }) => theme.main.fontWeights.semiBold};
  }

  > span:last-child {
    color: #1642e1;
    font-weight: ${({ theme }) => theme.main.fontWeights.bold};
  }
`;

Header.propTypes = {
  ...themePropTypes,
};

const Path = styled.div`
  padding: 0 1rem;
  font-size: 13px;
  font-weight: ${({ theme }) => theme.main.fontWeights.bold};
  color: #333740;
`;

Path.propTypes = {
  ...themePropTypes,
};

const Verb = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 1rem;
  border-radius: 3px;
  color: #ffffff;
  font-size: 12px;
  font-weight: ${({ theme }) => theme.main.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  &.get {
    background-color: #008dfe;
  }

  &.post {
    background-color: #69ba05;
  }

  &.put {
    background-color: #f68e0e;
  }

  &.delete {
    background-color: #f64d0a;
  }
`;

Verb.propTypes = {
  ...themePropTypes,
};

export { Header, Path, Verb, Wrapper };
