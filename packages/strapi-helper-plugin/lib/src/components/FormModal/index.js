/**
 *
 * FormModal
 *
 */

import styled from 'styled-components';

const FormModal = styled.div`
  width: 100%;
  .form-check {
    label {
      input[type='checkbox'] + p {
        margin-bottom: 0;
      }
    }
  }
`;

export default FormModal;
