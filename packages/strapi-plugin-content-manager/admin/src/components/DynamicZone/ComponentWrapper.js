import styled from 'styled-components';

const ComponentWrapper = styled.div`
  position: relative;
  > div {
    position: relative;
    box-shadow: 0 2px 4px #e3e9f3;
    &:not(:first-of-type) {
      margin-top: 37px;

      &:before {
        content: '&';
        position: absolute;
        top: -37px;
        left: 22px;
        height: 100%;
        width: 2px;
        background-color: #e6f0fb;
        color: transparent;
      }
    }
  }
`;

export default ComponentWrapper;
