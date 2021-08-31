import styled from 'styled-components';

const Span = styled.span`
  color: #1c5de7;
  text-decoration: underline;
  cursor: pointer;
`;

const Wrapper = styled.div`
  display: flex;
  height: 30px;
  width: 100%;
  padding: 0 15px;
  justify-content: space-between;
  background-color: #fafafb;
  line-height: 30px;
  font-size: 13px;
  font-family: Lato;
  border-top: 1px dashed #e3e4e4;

  > div:first-child {
    > span:last-child {
      font-size: 12px;
    }
  }

  .fullScreenWrapper {
    cursor: pointer;
    &:after {
      content: '\f065';
      margin-left: 8px;
      font-family: FontAwesome;
      font-size: 12px;
    }
  }

  .dropLabel {
    > input {
      display: none;
    }
  }
`;

export { Span, Wrapper };
