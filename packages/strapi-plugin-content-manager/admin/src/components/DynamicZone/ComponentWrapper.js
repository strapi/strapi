import styled from 'styled-components';

const ComponentWrapper = styled.div`
  position: relative;
  > div {
    position: relative;
    box-shadow: 0 2px 4px #e3e9f3;
    &:not(:first-of-type) {
      margin-top: 32px;
      &:before {
        content: '&';
        position: absolute;
        top: -30px;
        left: 22px;
        height: 100%;
        width: 2px;
        background-color: #e6f0fb;
        color: transparent;
      }
    }
    > div:not(:first-of-type) {
      padding-top: 6px;
      padding-bottom: 5px;
    }
    > div:last-of-type {
      margin-bottom: 22px;
    }
  }
`;

export default ComponentWrapper;
