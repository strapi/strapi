import styled from 'styled-components';

const ResetComponent = styled.div`
  position: absolute;
  top: 0;
  right: 15px;
  display: flex;

  cursor: pointer;
  color: #4b515a;

  > span {
    margin-right: 10px;
    display: none;
  }

  &:hover {
    > div {
      background-color: #faa684;
    }
    color: #f64d0a;
    > span {
      display: initial;
    }
  }

  > div {
    width: 24px;
    height: 24px;
    background-color: #f3f4f4;
    text-align: center;
    border-radius: 2px;
    &:after {
      content: '\f2ed';
      font-size: 10px;
      font-family: FontAwesome;
    }
  }
`;

export default ResetComponent;
