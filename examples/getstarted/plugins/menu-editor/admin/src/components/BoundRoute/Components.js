import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  height: 2.4rem;
  border-radius: 3px;
  background-color: #e9eaeb;
  line-height: 2.4rem;
`;

const Header = styled.div`
  margin-bottom: 3rem;
  padding-top: 1.1rem;
  color: #333740;
  font-size: 18px;
  font-weight: 600;

  > span:not(:first-child) {
    color: #787e8f;
    font-size: 16px;
    font-weight: 500;
  }

  > span:last-child {
    color: #1642e1;
    font-weight: 600;
  }
`;

const Path = styled.div`
  padding: 0 1rem;
  font-size: 13px;
  font-weight: 600;
  color: #333740;
`;

const Verb = styled.div`
  padding: 0 1rem;
  border-radius: 3px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
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

export { Header, Path, Verb, Wrapper };
