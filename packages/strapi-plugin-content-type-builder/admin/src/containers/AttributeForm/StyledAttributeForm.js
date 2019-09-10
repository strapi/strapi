/**
 *
 * StyledAttributeForm
 *
 */

import styled from 'styled-components';

const StyledAttributeForm = styled.div`
  width: 100%;
  .form-check {
    label {
      input[type='checkbox'] + p {
        margin-bottom: 0;
      }
    }
  }
`;

export default StyledAttributeForm;
