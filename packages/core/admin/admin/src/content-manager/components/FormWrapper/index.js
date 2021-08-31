import styled from 'styled-components';

const FormWrapper = styled.div`
  padding: 22px 10px 0 10px;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  margin-bottom: 17px;
  > div {
    margin-right: 0;
    margin-left: 0;
  }
  .row {
    &:last-of-type {
      margin-bottom: 0;
    }
  }
`;

export default FormWrapper;
