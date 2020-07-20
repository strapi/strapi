import styled from 'styled-components';

/* eslint-disable indent */

const FormWrapper = styled.div`
  padding-top: 24px;
  padding-left: 20px;
  padding-right: 20px;
  padding-bottom: 10px;
  border-top: 1px solid
    ${({ hasErrors, isOpen, isReadOnly }) => {
      if (hasErrors) {
        return '#ffa784';
      }
      if (isOpen && !isReadOnly) {
        return '#AED4FB';
      }

      return 'rgba(227, 233, 243, 0.75)';
    }};
`;

FormWrapper.defaultProps = {
  isReadOnly: false,
};

export default FormWrapper;
