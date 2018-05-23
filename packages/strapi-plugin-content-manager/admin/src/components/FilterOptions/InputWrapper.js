import styled from 'styled-components';

const InputWrapper = styled.div`
  position: relative;
  &:before{
    content: '\f073';
    position: absolute;
    left: 1px; top: 10px;
    width: 32px;
    height: 32px;
    border-radius: 3px 0px 0px 3px;
    background: #FAFAFB;
    color: #B3B5B9;
    text-align: center;
    font-family: 'FontAwesome';
    font-size: 1.4rem;
    line-height: 32px;
    z-index: 999;
    -webkit-font-smoothing: none;
    }
    input {
      width: 100%;
      padding-left: 42px;
      box-shadow: 0px 1px 1px rgba(104, 118, 142, 0.05);
      &:focus{
        outline: none;
      }
  }
`;

export default InputWrapper;
